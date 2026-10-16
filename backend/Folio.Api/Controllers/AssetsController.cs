using Folio.Api.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace Folio.Api.Controllers;

[ApiController]
[Route("api/assets")]
public sealed class AssetsController(FolioRepository repository) : ControllerBase
{
    [HttpPut("{id}")]
    public async Task<IActionResult> Put(string id, CancellationToken cancellationToken)
    {
        id = RouteIds.Decode(Request);
        const long maximumBytes = 100L * 1024 * 1024;
        if (Request.ContentLength > maximumBytes)
            return Problem(statusCode: StatusCodes.Status413PayloadTooLarge, title: "Asset exceeds the 100 MiB request limit");
        var contentType = Request.ContentType ?? "application/octet-stream";
        if (!MediaTypeHeaderValue.TryParse(contentType, out _))
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Invalid asset content type");

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
                return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Incomplete asset body");
            }
        }
        else
        {
            using var buffer = new MemoryStream();
            await Request.Body.CopyToAsync(buffer, cancellationToken);
            content = buffer.ToArray();
        }
        var createOnly = Request.Headers.IfNoneMatch.ToString().Trim() == "*";
        return repository.PutAsset(id, contentType, content, createOnly)
            ? NoContent()
            : Problem(statusCode: StatusCodes.Status412PreconditionFailed, title: "Asset already exists");
    }

    [HttpGet("{id}")]
    public IActionResult Get(string id)
    {
        id = RouteIds.Decode(Request);
        var asset = repository.GetAsset(id);
        if (asset is null) return NotFound();
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        // Never render user-controlled HTML/SVG as a document on the API origin.
        return File(asset.Content, asset.ContentType, "asset");
    }
}
