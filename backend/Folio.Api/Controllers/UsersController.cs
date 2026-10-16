using Folio.Api.Users;
using Microsoft.AspNetCore.Mvc;

namespace Folio.Api.Controllers;

[ApiController]
[Route("api/users")]
public sealed class UsersController(ICurrentUserProvider currentUserProvider) : ControllerBase
{
    [HttpGet("me")]
    public async Task<ActionResult<CurrentUser>> Me(CancellationToken cancellationToken) =>
        Ok(await currentUserProvider.GetCurrentUserAsync(cancellationToken));
}
