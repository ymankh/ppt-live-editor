using System.Globalization;
using System.Text.Json;

namespace Folio.Api.Persistence;

public sealed record ProjectDocument(string Id, string Json, string SummaryJson, long UpdatedTicks, HashSet<string> AssetIds)
{
    public static bool TryRead(JsonElement document, string routeId, out ProjectDocument? result, out string error)
    {
        result = null;
        error = "A version 1 presentation with a matching ID, title, timestamps, slide size, theme and nonempty slides is required.";
        if (document.ValueKind != JsonValueKind.Object ||
            !HasString(document, "id", out var id) || id != routeId ||
            !document.TryGetProperty("title", out var titleValue) || titleValue.ValueKind != JsonValueKind.String ||
            !document.TryGetProperty("version", out var version) || version.ValueKind != JsonValueKind.Number || !version.TryGetInt32(out var versionNumber) || versionNumber != 1 ||
            !HasString(document, "createdAt", out var createdAt) || !TryTimestamp(createdAt, out _) ||
            !HasString(document, "updatedAt", out var updatedAt) || !TryTimestamp(updatedAt, out var updated) ||
            !HasObject(document, "slideSize", out var size) || !PositiveNumber(size, "width") || !PositiveNumber(size, "height") ||
            !HasObject(document, "theme", out var theme) ||
            !document.TryGetProperty("slides", out var slides) || slides.ValueKind != JsonValueKind.Array || slides.GetArrayLength() == 0)
            return false;

        foreach (var slide in slides.EnumerateArray())
        {
            if (!HasString(slide, "id", out _) || !HasObject(slide, "background", out var background) ||
                !ValidImageReference(background) || !slide.TryGetProperty("elements", out var elements) || elements.ValueKind != JsonValueKind.Array)
            {
                error = "Each slide must have an ID, a background and an elements array.";
                return false;
            }
            foreach (var element in elements.EnumerateArray())
            {
                if (!HasString(element, "id", out _) || !HasString(element, "type", out _) || !ValidImageReference(element))
                {
                    error = "Each element must be an object with an ID and type; images must have an asset ID.";
                    return false;
                }
            }
        }

        var assets = new HashSet<string>(StringComparer.Ordinal);
        if (!CollectAssets(document, assets))
        {
            error = "Asset references must be nonempty strings.";
            return false;
        }
        var title = titleValue.GetString()!;
        var summary = JsonSerializer.Serialize(new
        {
            id, title, updatedAt, createdAt,
            slideCount = slides.GetArrayLength(),
            preview = slides[0], theme, slideSize = size
        });
        result = new ProjectDocument(id, document.GetRawText(), summary, updated.UtcDateTime.Ticks, assets);
        return true;
    }

    private static bool HasString(JsonElement value, string key, out string text)
    {
        text = "";
        if (value.ValueKind != JsonValueKind.Object || !value.TryGetProperty(key, out var property) || property.ValueKind != JsonValueKind.String)
            return false;
        text = property.GetString()!;
        return !string.IsNullOrWhiteSpace(text);
    }

    private static bool HasObject(JsonElement value, string key, out JsonElement property)
    {
        property = default;
        return value.ValueKind == JsonValueKind.Object && value.TryGetProperty(key, out property) && property.ValueKind == JsonValueKind.Object;
    }

    private static bool PositiveNumber(JsonElement value, string key) =>
        value.TryGetProperty(key, out var property) && property.ValueKind == JsonValueKind.Number &&
        property.TryGetDouble(out var number) && double.IsFinite(number) && number > 0;

    private static bool TryTimestamp(string value, out DateTimeOffset timestamp) =>
        DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out timestamp);

    private static bool ValidImageReference(JsonElement value) =>
        !value.TryGetProperty("type", out var type) || type.ValueKind != JsonValueKind.String || type.GetString() != "image" ||
        HasString(value, "assetId", out _);

    // Scan all nested assetId fields, including table fills and future element kinds,
    // so preserving unknown JSON fields cannot discard their asset ownership.
    private static bool CollectAssets(JsonElement value, HashSet<string> assets)
    {
        if (value.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in value.EnumerateObject())
            {
                if (property.NameEquals("assetId"))
                {
                    if (property.Value.ValueKind != JsonValueKind.String)
                        return false;
                    var assetId = property.Value.GetString()!;
                    if (string.IsNullOrWhiteSpace(assetId)) return false;
                    if (!assetId.StartsWith("data:", StringComparison.OrdinalIgnoreCase) &&
                        !assetId.StartsWith("blob:", StringComparison.OrdinalIgnoreCase) &&
                        !assetId.StartsWith("http:", StringComparison.OrdinalIgnoreCase) &&
                        !assetId.StartsWith("https:", StringComparison.OrdinalIgnoreCase) &&
                        !assetId.StartsWith("//", StringComparison.Ordinal))
                        assets.Add(assetId);
                }
                else if (!CollectAssets(property.Value, assets)) return false;
            }
        }
        else if (value.ValueKind == JsonValueKind.Array)
            foreach (var child in value.EnumerateArray())
                if (!CollectAssets(child, assets)) return false;
        return true;
    }
}
