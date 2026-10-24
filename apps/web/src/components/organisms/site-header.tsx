import type { FC } from 'hono/jsx';
import type { SessionUser } from '@shelf/auth';
import { Wordmark } from '../atoms/wordmark.tsx';
import { SignOutForm } from '../molecules/sign-out-form.tsx';

export const SiteHeader: FC<{ user: SessionUser | null }> = ({ user }) => (
  <header class="site-header">
    <Wordmark />
    <nav class="site-header__nav" aria-label="Account">
      {user ? (
        <SignOutForm user={user} />
      ) : (
        <a class="site-header__link" href="/login">
          Sign in
        </a>
      )}
    </nav>
  </header>
);
