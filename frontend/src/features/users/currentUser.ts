import { request } from '@/lib/api';
import { strings } from '@/strings';

export interface CurrentUser {
  id: string;
  displayName: string;
  initials: string;
}

let currentUser: Promise<CurrentUser> | undefined;

// Share one result across avatar mounts and route changes, including StrictMode effect replay.
// A failed request remains an explicit unavailable state until the page is reloaded.
export function getCurrentUser(): Promise<CurrentUser> {
  return currentUser ??= request(strings.users.currentUserApi)
    .then((response) => response.json() as Promise<CurrentUser>);
}
