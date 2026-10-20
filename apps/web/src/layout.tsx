// apps/web/src/layout.tsx
import type { FC, PropsWithChildren } from "hono/jsx";
import { raw } from "hono/html";

type LayoutProps = PropsWithChildren<{ title: string }>;

export const Layout: FC<LayoutProps> = ({ title, children }) => (
  <>
    {raw("<!doctype html>")}
    <html lang="en-GB">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <link rel="stylesheet" href="https://unpkg.com/open-props" />
        <link rel="stylesheet" href="https://unpkg.com/open-props/normalize.min.css" />
      </head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  </>
);
