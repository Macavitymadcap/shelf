import type { FC } from 'hono/jsx';
import type { SessionUser } from '@shelf/auth';
import { Button } from '../atoms/button.tsx';

export const SignOutForm: FC<{ user: SessionUser }> = ({ user }) => (
  <form class="sign-out-form" method="post" action="/logout">
    <a class="sign-out-form__name" href="/manage">
      {user.displayName}
    </a>
    <Button variant="quiet">Sign out</Button>
  </form>
);
