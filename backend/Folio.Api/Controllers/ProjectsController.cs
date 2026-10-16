using System.Text.Json;
using Folio.Api.Persistence;
using Microsoft.AspNetCore.Mvc;

namespace Folio.Api.Controllers;

[ApiController]
[Route("api/projects")]
public sealed class ProjectsController(FolioRepository repository) : ControllerBase
{
    [HttpGet]
    public IActionResult List() => Content(repository.ListProjects(), "application/json");

    [HttpGet("latest/document")]
    public IActionResult Latest()
    {
        var document = repository.GetLatestProject();
        return document is null ? NotFound() : Content(document, "application/json");
    }

    [HttpGet("{id}")]
    public IActionResult Get(string id)
    {
        id = RouteIds.Decode(Request);
        var document = repository.GetProject(id);
        return document is null ? NotFound() : Content(document, "application/json");
    }

    [HttpPut("{id}")]
    public IActionResult Put(string id, [FromBody] JsonElement document)
    {
        id = RouteIds.Decode(Request);
        if (!ProjectDocument.TryRead(document, id, out var validated, out var error))
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Invalid presentation", detail: error);
        var createOnly = Request.Headers.IfNoneMatch.ToString().Trim() == "*";
        return repository.SaveProject(validated!, createOnly)
            ? NoContent()
            : Problem(statusCode: StatusCodes.Status412PreconditionFailed, title: "Project already exists");
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(string id)
    {
        id = RouteIds.Decode(Request);
        repository.DeleteProject(id);
        return NoContent();
    }
}
