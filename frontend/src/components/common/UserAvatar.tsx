import { useEffect, useState } from 'react';
import { getCurrentUser, type CurrentUser } from '@/features/users/currentUser';
import { strings } from '@/strings';
import './UserAvatar.css';

type UserState =
  | { status: 'loading' }
  | { status: 'ready'; user: CurrentUser }
  | { status: 'error'; message: string };

export function UserAvatar() {
  const [state, setState] = useState<UserState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    void getCurrentUser().then(
      (user) => { if (active) setState({ status: 'ready', user }); },
      (error: unknown) => {
        if (active) setState({
          status: 'error',
          message: error instanceof Error ? error.message : strings.users.unavailable,
        });
      },
    );
    return () => { active = false; };
  }, []);

  const label = state.status === 'ready'
    ? state.user.displayName
    : state.status === 'error' ? strings.users.unavailable : strings.users.loading;
  const title = state.status === 'error' ? `${label}: ${state.message}` : label;

  return (
    <span
      className={strings.common.avatar}
      role={strings.users.avatarRole}
      aria-label={label}
      aria-busy={state.status === 'loading'}
      title={title}
    >
      {state.status === 'ready'
        ? state.user.initials
        : state.status === 'error' ? strings.users.unknownInitials : strings.users.loadingInitials}
    </span>
  );
}
