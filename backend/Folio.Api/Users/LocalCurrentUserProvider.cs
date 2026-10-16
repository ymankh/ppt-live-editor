namespace Folio.Api.Users;

// Single-user local identity, not authentication. Replace the DI registration to integrate external identity.
// Jordan Doe supplies the existing JD initials; this identity is not persisted in a user database.
public sealed class LocalCurrentUserProvider : ICurrentUserProvider
{
    private static readonly CurrentUser User = new("local-jordan-doe", "Jordan Doe", "JD");

    public ValueTask<CurrentUser> GetCurrentUserAsync(CancellationToken cancellationToken = default) =>
        ValueTask.FromResult(User);
}
