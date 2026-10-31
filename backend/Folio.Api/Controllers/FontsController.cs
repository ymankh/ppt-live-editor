using System.Buffers;
using System.Buffers.Binary;
using Folio.Api.Persistence;
using Microsoft.AspNetCore.Mvc;

namespace Folio.Api.Controllers;

[ApiController]
[Route("api/fonts")]
public sealed class FontsController(FolioRepository repository) : ControllerBase
{
    private const int MaximumBytes = 20 * 1024 * 1024;

    [HttpGet]
    public IActionResult List() => Ok(repository.ListFonts());

    [HttpPost]
    [HttpPut]
    [RequestSizeLimit(MaximumBytes)]
    public async Task<IActionResult> Upload([FromQuery] string? family, CancellationToken cancellationToken)
    {
        family = family?.Trim();
        if (string.IsNullOrEmpty(family) || family.Length > 200 || family.Any(character => char.IsControl(character) || ",;\"'\\{}".Contains(character)))
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Enter a font family name of up to 200 characters without quotes, commas, or CSS punctuation.");
        if (Request.ContentLength > MaximumBytes)
            return Problem(statusCode: StatusCodes.Status413PayloadTooLarge, title: "Font exceeds the 20 MiB limit.");

        byte[] content;
        if (Request.ContentLength is long length)
        {
            content = new byte[(int)length];
            try
            {
                await Request.Body.ReadExactlyAsync(content, cancellationToken);
            }
            catch (EndOfStreamException)
            {
                return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Incomplete font body.");
            }
        }
        else
        {
            // Bound chunked uploads too; fonts are independent of project asset collection.
            using var buffer = new MemoryStream();
            var chunk = ArrayPool<byte>.Shared.Rent(81920);
            try
            {
                int count;
                while ((count = await Request.Body.ReadAsync(chunk.AsMemory(), cancellationToken)) != 0)
                {
                    if (buffer.Length + count > MaximumBytes)
                        return Problem(statusCode: StatusCodes.Status413PayloadTooLarge, title: "Font exceeds the 20 MiB limit.");
                    buffer.Write(chunk, 0, count);
                }
            }
            finally
            {
                ArrayPool<byte>.Shared.Return(chunk);
            }
            content = buffer.ToArray();
        }
        var contentType = FontContentType(content);
        if (contentType is null)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Choose a TTF, OTF, WOFF, or WOFF2 font file.");
        var id = Guid.NewGuid().ToString("N");
        if (!repository.AddFont(id, family, contentType, content))
            return Problem(statusCode: StatusCodes.Status409Conflict, title: "A font with this family name is already uploaded.");
        return Created($"/api/fonts/{id}/content", new FontRecord(id, family));
    }

    [HttpGet("{id}/content")]
    public IActionResult GetContent(string id)
    {
        var font = repository.GetFont(id);
        if (font is null) return NotFound();
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(font.Content, font.ContentType);
    }

    private static string? FontContentType(byte[] content)
    {
        if (content.Length < 12) return null;
        var bytes = content.AsSpan();
        var signature = BinaryPrimitives.ReadUInt32BigEndian(bytes);
        if (signature is 0x00010000 or 0x74727565 or 0x4F54544F)
        {
            var tableCount = BinaryPrimitives.ReadUInt16BigEndian(bytes[4..]);
            var directoryEnd = 12 + tableCount * 16;
            if (tableCount == 0 || directoryEnd > bytes.Length) return null;
            for (var index = 0; index < tableCount; index++)
            {
                var entry = bytes.Slice(12 + index * 16, 16);
                var offset = BinaryPrimitives.ReadUInt32BigEndian(entry[8..]);
                var length = BinaryPrimitives.ReadUInt32BigEndian(entry[12..]);
                if (offset < directoryEnd || (ulong)offset + length > (ulong)bytes.Length) return null;
            }
            return signature == 0x4F54544F ? "font/otf" : "font/ttf";
        }
        if (signature is not (0x774F4646 or 0x774F4632)) return null;
        var headerSize = signature == 0x774F4646 ? 44 : 48;
        if (bytes.Length < headerSize ||
            BinaryPrimitives.ReadUInt32BigEndian(bytes[8..]) != bytes.Length ||
            BinaryPrimitives.ReadUInt16BigEndian(bytes[14..]) != 0) return null;
        var count = BinaryPrimitives.ReadUInt16BigEndian(bytes[12..]);
        if (count == 0 || BinaryPrimitives.ReadUInt32BigEndian(bytes[16..]) < 12 + count * 16) return null;
        if (signature == 0x774F4632)
        {
            var compressedSize = BinaryPrimitives.ReadUInt32BigEndian(bytes[20..]);
            return compressedSize > 0 && (ulong)headerSize + compressedSize <= (ulong)bytes.Length ? "font/woff2" : null;
        }
        var end = headerSize + count * 20;
        if (end > bytes.Length) return null;
        for (var index = 0; index < count; index++)
        {
            var entry = bytes.Slice(headerSize + index * 20, 20);
            var offset = BinaryPrimitives.ReadUInt32BigEndian(entry[4..]);
            var compressedLength = BinaryPrimitives.ReadUInt32BigEndian(entry[8..]);
            var originalLength = BinaryPrimitives.ReadUInt32BigEndian(entry[12..]);
            if (offset < end || compressedLength > originalLength ||
                (ulong)offset + compressedLength > (ulong)bytes.Length) return null;
        }
        return "font/woff";
    }
}
