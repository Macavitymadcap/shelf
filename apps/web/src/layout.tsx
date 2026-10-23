import type { FC, PropsWithChildren } from 'hono/jsx';
import { raw } from 'hono/html';
import type { SessionUser } from '@shelf/auth';

type LayoutProps = PropsWithChildren<{ title: string; user: SessionUser | null }>;

const Nav: FC<{ user: SessionUser | null }> = ({ user }) =>
  user ? (
    <form method="post" action="/logout">
      <a href="/manage">{user.displayName}</a> <button type="submit">Sign out</button>
    </form>
  ) : (
    <a href="/login">Sign in</a>
  );

export const Layout: FC<LayoutProps> = ({ title, user, children }) => (
  <>
    {raw('<!doctype html>')}
    <html lang="en-GB">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <link rel="stylesheet" href="vendor/open-props.min.css" />
        <link rel="stylesheet" href="vendor/normalize.min.css" />
      </head>
      <body>
        <header>
          <a href="/">Shelf</a>
          <Nav user={user} />
        </header>
        <main>{children}</main>
      </body>
    </html>
  </>
);
