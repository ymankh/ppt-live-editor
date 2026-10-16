namespace Folio.Api.Users;

public sealed record CurrentUser(string Id, string DisplayName, string Initials);

public interface ICurrentUserProvider
{
    ValueTask<CurrentUser> GetCurrentUserAsync(CancellationToken cancellationToken = default);
}
