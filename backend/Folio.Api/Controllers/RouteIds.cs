using Microsoft.AspNetCore.Http.Features;

namespace Folio.Api.Controllers;

internal static class RouteIds
{
    public static string Decode(HttpRequest request)
    {
        // ASP.NET leaves encoded slashes in route values. Decode the original
        // segment exactly once, preserving literal percent escapes in IDs.
        var target = request.HttpContext.Features.Get<IHttpRequestFeature>()!.RawTarget!;
        var query = target.IndexOf('?');
        var path = target.AsSpan(0, query < 0 ? target.Length : query);
        var segment = path[(path.LastIndexOf('/') + 1)..];
        return Uri.UnescapeDataString(segment.ToString());
    }
}
