import { useContext, type FC, type PropsWithChildren } from 'hono/jsx';
import { raw } from 'hono/html';
import type { SessionUser } from '@shelf/auth';
import { NonceContext, useHx } from '../../nonce.ts';
import { SiteHeader } from '../organisms/site-header.tsx';

type PageProps = PropsWithChildren<{ title: string; user: SessionUser | null }>;

const FONTS = ['libre-caslon-text-latin-400-normal', 'courier-prime-latin-400-normal'];

// Only hx-csp may register, and htmx's own indicator styles are not needed.
const HTMX_CONFIG = 'extensions:hx-csp, includeIndicatorCSS:false';

const Scripts: FC = () => {
  const nonce = useContext(NonceContext);
  return (
    <>
      <meta name="htmx-config" content={HTMX_CONFIG} />
      <script nonce={nonce} src="vendor/htmx/htmx.min.js" defer />
      <script nonce={nonce} src="/vendor/htmx/hx-csp.min.js" defer />
    </>
  );
};

const Head: FC<{ title: string }> = ({ title }) => (
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="theme-color" content="#d8dde1" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#121417" media="(prefers-color-scheme: dark)" />
    <title>{title}</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    {FONTS.map((font) => (
      <link
        rel="preload"
        href={`/vendor/fonts/${font}.woff2`}
        as="font"
        type="font/woff2"
        crossorigin=""
      />
    ))}
    <link rel="stylesheet" href="/styles/app.css" />
    <Scripts />
  </head>
);

export const Page: FC<PageProps> = ({ title, user, children }) => (
  <>
    {raw('<!doctype html>')}
    <html lang="en-GB">
      <Head title={title} />
      <body class="page">
        <SiteHeader user={user} />
        <main class="page__main" hx-boost:inherited="true" {...useHx()}>
          {children}
        </main>
      </body>
    </html>
  </>
);
