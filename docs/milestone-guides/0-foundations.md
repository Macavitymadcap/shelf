# Milestone 0: Foundations

Here's the Foundations milestone as a sequence you can work through. Its gate is a push to `main` that CI deploys to `workers.dev`. Everything up to step 7 runs locally.

## 0. Before you start

- **Accounts:** you need a free Cloudflare account, a free Pulumi Cloud account and a new GitHub repo.
- **Name:** pick the app's name now. It ends up in the package scope, the resource names and the `workers.dev` URL. I've used `shelf` below.
- **Tokens:** apply for the BGG application token today, since approval can take a week or more. The Google Books key and Discogs token are instant, so they can wait.
- **R2:** enable R2 once in the Cloudflare dashboard (Storage & databases → R2). It may ask for a payment method even on the free allowance, and Pulumi can't create a bucket until R2 is enabled.

## 1. Install Vite+ and scaffold the monorepo

```bash
curl -fsSL https://vite.plus | bash      # new terminal afterwards
vp create vite:monorepo --package-manager pnpm --hooks
cd shelf && vp install && vp check
```

`--hooks` sets up a pre-commit hook that runs `vp check` on staged files. Look at what the template generated before changing anything; it decides where `apps/` and `packages/` live. Then add `infra` to `pnpm-workspace.yaml`.

## 2. Create the packages Foundations needs

Only `catalogue` and `db` are needed now. The others arrive with their milestones.

```bash
vp create vite:library --directory packages/catalogue
vp create vite:library --directory packages/db
```

Give `catalogue` its first export, the list of kinds, so `db` has something real to import:

```ts
// packages/catalogue/src/kinds.ts
export const KINDS = ['book', 'record', 'board_game'] as const;
export type Kind = (typeof KINDS)[number];
```

## 3. The web Worker

Scaffold `apps/web`, then delete the single-page app files the template creates (`index.html`, `src/main.ts`):

```bash
vp create vite:application --directory apps/web
cd apps/web
vp add hono
vp add -D @cloudflare/vite-plugin wrangler
```

The Vite config just adds the Cloudflare plugin:

```ts
// apps/web/vite.config.ts
import { defineConfig } from 'vite-plus';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({ plugins: [cloudflare()] });
```

The Wrangler config declares the Worker and its two bindings. The database id is a placeholder until step 7 fills it in:

```jsonc
// apps/web/wrangler.jsonc
{
  "name": "shelf",
  "main": "./src/index.tsx",
  "compatibility_date": "2026-10-20",
  "compatibility_flags": ["nodejs_compat"],
  "workers_dev": true,
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "shelf",
      "database_id": "local",
      "migrations_dir": "../../packages/db/migrations",
    },
  ],
  "r2_buckets": [{ "binding": "COVERS", "bucket_name": "shelf-covers" }],
}
```

Next, set up the types and JSX:

- Add `"cf-typegen": "wrangler types"` to the scripts in `apps/web/package.json` and run it with `vp run cf-typegen`. This generates the `Env` type from your bindings.
- In `tsconfig.json`, set `"jsx": "react-jsx"` and `"jsxImportSource": "hono/jsx"`.

Then a minimal app:

```tsx
// apps/web/src/index.tsx
import { Hono } from 'hono';
import { Layout } from './layout';

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) =>
  c.html(
    <Layout title="Shelf">
      <h1>Shelf</h1>
    </Layout>,
  ),
);

export default app;
```

`Layout` in `layout.tsx` is just the HTML shell with the Open Props stylesheet; htmx arrives in the Catalogue milestone. Run `vp dev` and the page should be served by the Worker runtime locally.

## 4. First test

Hono's `app.request()` runs the app without a server, so this works under `vp test`:

```ts
// apps/web/src/index.test.tsx
import { describe, expect, it } from 'vite-plus/test';
import app from './index';

describe('GET /', () => {
  it('renders the home page', async () => {
    // Arrange
    const request = new Request('http://localhost/');

    // Act
    const response = await app.request(request);

    // Assert
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<h1>Shelf</h1>');
  });
});
```

## 5. Schema and the first migration

```bash
cd packages/db
vp add drizzle-orm @shelf/catalogue
vp add -D drizzle-kit
```

The Drizzle Kit config:

```ts
// packages/db/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema',
  out: './migrations',
  casing: 'snake_case',
});
```

Write one file per table in `src/schema/`, taking the columns from the diagrams, with a shared `timestamps` helper. For example:

```ts
// packages/db/src/schema/works.ts
import { sqliteTable, text, integer, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { KINDS } from '@shelf/catalogue';
import { timestamps } from './columns';

export const works = sqliteTable('works', {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  kind: text({ enum: KINDS }).notNull(),
  title: text().notNull(),
  sortTitle: text().notNull(),
  subtitle: text(),
  firstYear: integer(),
  description: text(),
  expandsWorkId: text().references((): AnySQLiteColumn => works.id),
  ...timestamps,
});
```

Then generate the migration and apply it to the local D1:

```bash
vp exec drizzle-kit generate
cd ../../apps/web && vp exec wrangler d1 migrations apply DB --local
```

Check the layout `drizzle-kit` writes. Wrangler expects flat, numbered `.sql` files. If your Drizzle Kit version writes a folder per migration instead, pin a version that writes flat files.

## 6. Infrastructure with Pulumi

```bash
pulumi login
pulumi new typescript --dir infra --name shelf-infra --stack prod
cd infra && vp add @pulumi/cloudflare
pulumi config set accountId <your account id>
```

In `Pulumi.yaml`, set `runtime.options.packagemanager: pnpm` so Pulumi uses the workspace install. The provider reads `CLOUDFLARE_API_TOKEN` from the environment. Create that token with Workers Scripts, D1 and Workers R2 Storage edit rights, scoped to your one account, and export it.

The program itself creates the two resources and exports what Wrangler needs:

```ts
// infra/index.ts
import * as pulumi from '@pulumi/pulumi';
import * as cloudflare from '@pulumi/cloudflare';

const accountId = new pulumi.Config().require('accountId');

const database = new cloudflare.D1Database(
  'catalogue',
  {
    accountId,
    name: 'shelf',
    primaryLocationHint: 'weur',
  },
  { protect: true },
);

const covers = new cloudflare.R2Bucket('covers', {
  accountId,
  name: 'shelf-covers',
  location: 'weur',
  storageClass: 'Standard',
});

export const databaseId = database.uuid;
export const bucketName = covers.name;
```

`protect: true` matters: replacing a D1 database deletes its data, and this makes Pulumi refuse to do that. Run `pulumi up` and read the preview before confirming.

## 7. Feed Pulumi's outputs into Wrangler

Run `vp add -D jsonc-parser` in `infra`, then write the script. It rewrites the two values in `wrangler.jsonc` while keeping its comments:

```ts
// infra/scripts/sync-wrangler.ts
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { applyEdits, modify } from 'jsonc-parser';

const path = 'apps/web/wrangler.jsonc';
const args = ['stack', 'output', '--json', '--stack', 'prod', '--cwd', 'infra'];
const outputs = JSON.parse(execFileSync('pulumi', args, { encoding: 'utf8' }));
const format = { formattingOptions: { tabSize: 2, insertSpaces: true } };

const set = (text: string, at: (string | number)[], value: unknown) =>
  applyEdits(text, modify(text, at, value, format));

let text = readFileSync(path, 'utf8');
text = set(text, ['d1_databases', 0, 'database_id'], outputs.databaseId);
text = set(text, ['r2_buckets', 0, 'bucket_name'], outputs.bucketName);
writeFileSync(path, text);
```

Run it from the repo root with `vp node infra/scripts/sync-wrangler.ts` and commit the result. The ids aren't secret.

## 8. First deploy by hand

Add `"deploy": "vp build && wrangler deploy"` to `apps/web/package.json`, then:

```bash
cd apps/web
vp exec wrangler login
vp exec wrangler d1 migrations apply DB --remote
vp run deploy
```

On the first deploy Cloudflare may ask you to choose your `workers.dev` subdomain. Open the URL Wrangler prints and you should see the page.

## 9. CI

Add the repository secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `PULUMI_ACCESS_TOKEN`, then add this workflow:

```yaml
# .github/workflows/ci.yml
name: ci
on:
  pull_request:
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: voidzero-dev/setup-vp@v1
      - run: vp install
      - run: vp check
      - run: vp run -r test
      - run: vp -C apps/web build

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: check
    runs-on: ubuntu-latest
    env:
      CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
    steps:
      - uses: actions/checkout@v5
      - uses: voidzero-dev/setup-vp@v1
      - run: vp install
      - uses: pulumi/actions@v6
        with: { command: up, stack-name: prod, work-dir: infra }
      - run: vp node infra/scripts/sync-wrangler.ts
      - run: vp -C apps/web exec wrangler d1 migrations apply DB --remote
      - run: vp -C apps/web run deploy
```

Check the `setup-vp` and `pulumi/actions` READMEs for their current major versions before you rely on these tags. Pushing Worker secrets is left out for now; it joins this job in the Auth milestone, when the session pepper is first needed.

## The gate

Change the `<h1>`, push to `main`, and watch the deploy job publish it. Before moving on, check two of the risks from the plan: does the Cloudflare plugin behave under `vp dev` and `vp build`, and does `vp test` run cleanly? If either fights you, that's the point to fall back to plain Vite for `apps/web` only.
