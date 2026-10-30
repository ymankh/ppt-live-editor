export interface CurrentUser {
  readonly id: string;
  readonly displayName: string;
  readonly initials: string;
}

export interface CurrentUserProvider {
  getCurrentUser(): Promise<CurrentUser>;
}

// Single-user local identity, not authentication. Swap the provider passed to createApp to integrate external identity.
// Jordan Doe supplies the existing JD initials; this identity is not persisted in a user database.
const localUser: CurrentUser = { id: 'local-jordan-doe', displayName: 'Jordan Doe', initials: 'JD' };

export const localCurrentUserProvider: CurrentUserProvider = {
  getCurrentUser: () => Promise.resolve(localUser),
};
