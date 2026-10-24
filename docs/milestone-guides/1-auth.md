# Milestone 1: Authentication

This guide starts from `main` at `f876900`, the end of milestone 0. Part A
tidies what milestone 0 left behind; Part B adds password sign-in, sessions
and a Content Security Policy. At the end, you can sign in and out of the
deployed Worker from your phone, and everything under `/manage` is behind
that sign-in.

Every file and command here was run against a copy of the repository with
the same tool versions (Vite+ 1.4, pnpm 12.14, Wrangler 4.151, Hono 4.13,
Drizzle 0.45): `vp check` passes, 15 tests pass across three packages, and
sign-in, sign-out, lockout and cross-site rejection were exercised against
`vp dev` with a local D1. The one thing that cannot be tested locally is
the CPU cost of password hashing on Cloudflare, which step B1 measures.

## How this guide is laid out

Milestone 0 needed about 45 follow-up questions, mostly for code shown in
part, tool errors, credentials and checking results. So in this guide:

- Every new or changed file is given in full, with its path in the heading
  or the first line.
- Every command block starts with a comment naming the directory to run it
  from.
- Steps say what output to expect, and name the error you may hit and its
  fix where it happens.
- Each part ends with a checkpoint and a commit.

## Before you start

```bash
# from the repo root
git switch main && git pull
vp install
vp run ready
git switch -c shelf-0002
```

`vp run ready` should end with `vp run: … successful`. Two things from
milestone 0 still apply:

- Keep `export NODE_OPTIONS=--use-system-ca` in `~/.zshrc` on the VPN
  machine, or Wrangler and the user script cannot reach Cloudflare.
- The VPN blocks `*.workers.dev`, so check the deployed site from your phone
  on mobile data.

## Part A: Tidy-ups from milestone 0

A review of the repository found eight things worth fixing before adding
auth. Two of them (A2 and A4) would otherwise break Part B.

| Stage | Problem                                                                                           | Effect if left                                                 |
| ----- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| A1    | Root `dev` script runs `website#dev`; the package is `web`                                        | `vp run dev` silently does nothing                             |
| A2    | `@types/node` is `^24` in the catalog and `^26.6.5` in two packages                               | pnpm installs two copies of Vite+; package tests fail to start |
| A3    | `infra` is not private; `sync-wrangler.ts` passes `tabs` instead of `tabSize`                     | Publishable package; formatting option ignored                 |
| A4    | `work_tags.ts` is missing from the schema barrel; session and passkey ids default to random UUIDs | The app cannot query tags; a forgotten id would save silently  |
| A5    | No database client yet                                                                            | Nothing can query D1                                           |
| A6    | No way to test against D1                                                                         | Auth logic would go untested                                   |
| A7    | Open Props loads from unpkg                                                                       | The Content Security Policy in B8 would block it               |
| A8    | Two quick pushes can run two deploys at once                                                      | Migrations and deploys can interleave                          |

### A1. Fix the root scripts and READMEs

`vp run dev` looks for a package called `website`, finds none and exits
without an error. The web app's `build` script also runs `tsc` before
`vp build`, which repeats the type check `vp check` already does.

Root `package.json`, `scripts` only:

```json
"scripts": {
  "ready": "vp check && vp run -r test && vp -C apps/web build",
  "dev": "vp run web#dev",
  "prepare": "vp config"
}
```

In `apps/web/package.json`, change `"build": "tsc && vp build"` to
`"build": "vp build"`.

Replace the template READMEs. Root `README.md`:

````markdown
# Shelf

A catalogue of books, vinyl records and board games, running on Cloudflare
Workers with D1 and R2. See `docs/revival-plan.md` for the design and
`docs/` for the milestone guides.

## Development

```bash
vp install      # dependencies
vp run dev      # the app at http://localhost:5173
vp run ready    # what CI checks: lint, types, tests, build
```
````

`packages/catalogue/README.md`:

```markdown
# @shelf/catalogue

The shared vocabulary of Shelf: kinds, roles, formats and code checks.
Internal to the monorepo; exported as TypeScript source and never built.
```

`packages/db/README.md`:

````markdown
# @shelf/db

The Drizzle schema, migrations and D1 client for Shelf.

```bash
vp run db:generate   # write a migration after changing src/schema
vp run test          # schema tests against a local D1
```
````

Check it:

```bash
# from the repo root
vp run dev
```

You should see Vite+ start and print `Local: http://localhost:5173/`. Stop
it with Ctrl+C.

```bash
git commit -am "fix: point root scripts at the web package"
```

### A2. Use one version of `@types/node` and `typescript`

The catalog in `pnpm-workspace.yaml` pins `@types/node` to `^24`, but the
library template gave `catalogue` and `db` their own `^26.6.5`. Vite+ takes
`@types/node` as a peer dependency, so pnpm installs one copy of Vite+ per
version. The `vp` command runs one copy and a package's tests import the
other, and the tests then fail before running with:

```
TypeError: Cannot read properties of undefined (reading 'config')
```

Nothing shows it today because only `apps/web` has tests. Part B adds tests
to two packages, so fix it now by taking both versions from the catalog.

In `pnpm-workspace.yaml`, change the catalog line to:

```yaml
'@types/node': ^26.6.5
```

`packages/catalogue/package.json` in full; this also drops `bumpp`, a
release tool these packages never use:

```json
{
  "name": "@shelf/catalogue",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "typescript": "catalog:",
    "vite-plus": "catalog:"
  }
}
```

In `packages/db/package.json`, make the same change to `devDependencies`
(A6 gives the whole file):

```json
"devDependencies": {
  "@types/node": "catalog:",
  "drizzle-kit": "catalog:",
  "typescript": "catalog:",
  "vite-plus": "catalog:"
}
```

In `apps/web/package.json`, change `"typescript": "~7.0.2"` to
`"typescript": "catalog:"`.

Then:

```bash
# from the repo root
rm -rf node_modules apps/*/node_modules packages/*/node_modules infra/node_modules
vp install
for d in . apps/web packages/*; do echo "$d -> $(readlink $d/node_modules/vite-plus)"; done
```

pnpm keeps old versions in `node_modules/.pnpm` after they stop being used,
so the reinstall clears them first. Every line of the loop's output should
end in the same `vite-plus@1.4.0_…@types+node@26.6.5…` folder. If one
differs, that package still names its own `@types/node`.

```bash
git commit -am "fix: take @types/node and typescript from the catalog"
```

### A3. Tidy `infra`

`infra/package.json` in full. It becomes private and takes `@types/node`
from the catalog, but must keep TypeScript 5. Pulumi compiles the program
with `ts-node`, which calls TypeScript's JavaScript API, and TypeScript 7
(the native compiler the catalog gives everything else) does not provide
it. With `"typescript": "catalog:"` here, `pulumi up` fails in CI with
`TypeError: Cannot read properties of undefined (reading 'readFile')`.

```json
{
  "name": "shelf-infra",
  "private": true,
  "main": "index.ts",
  "dependencies": {
    "@pulumi/cloudflare": "^6.23.1",
    "@pulumi/pulumi": "^3.113.0"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "jsonc-parser": "^3.3.1",
    "typescript": "^5.0.0"
  }
}
```

In `infra/scripts/sync-wrangler.ts`, `jsonc-parser`'s option is `tabSize`,
not `tabs`. Change the `format` line to:

```ts
const format = { formattingOptions: { tabSize: 2, insertSpaces: true } };
```

```bash
# from the repo root
vp install
git commit -am "chore: make infra private and fix sync-wrangler formatting"
```

### A4. Fix the schema exports and the two supplied ids

`drizzle.config.ts` reads the whole `src/schema` folder, so the migration
includes `work_tags`. But `src/schema/index.ts` does not export it, so the
app cannot query it. Pointing drizzle-kit at the barrel file means
drizzle-kit and the app always see the same tables. Rename the file to match
the kebab-case of `login-attempts.ts` while you are there.

```bash
# from packages/db
git mv src/schema/work_tags.ts src/schema/work-tags.ts
```

`packages/db/src/schema/index.ts`:

```ts
export * from './works.ts';
export * from './editions.ts';
export * from './copies.ts';
export * from './loans.ts';
export * from './people.ts';
export * from './credits.ts';
export * from './tags.ts';
export * from './work-tags.ts';
export * from './kinds/books.ts';
export * from './kinds/records.ts';
export * from './kinds/games.ts';
export * from './auth/users.ts';
export * from './auth/sessions.ts';
export * from './auth/passkeys.ts';
export * from './auth/login-attempts.ts';
```

`packages/db/drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema/index.ts',
  out: './migrations',
  casing: 'snake_case',
});
```

A session's id is the SHA-256 of its cookie token, and a passkey's id is the
credential id the browser returns. Both are supplied by code, so neither
should fall back to a random UUID: if a caller forgot the id, the row would
save with a value nothing can ever look up. `isStale` also moves out of the
schema into the `auth` package in B5, since the schema should only describe
tables.

`packages/db/src/schema/auth/sessions.ts`:

```ts
import { sqliteTable, text, integer, index, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { users } from './users.ts';
import { timestamps } from '../columns.ts';

export const sessions = sqliteTable(
  'sessions',
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references((): AnySQLiteColumn => users.id, { onDelete: 'cascade' }),
    expiresAt: integer({ mode: 'timestamp_ms' }).notNull(),
    lastSeenAt: integer({ mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    createdAt: timestamps.createdAt,
  },
  (session) => [index('sessions_user_id').on(session.userId)],
);
```

`packages/db/src/schema/auth/passkeys.ts`:

```ts
import {
  sqliteTable,
  text,
  blob,
  integer,
  index,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import { users } from './users.ts';
import { timestamps } from '../columns.ts';

export const passkeys = sqliteTable(
  'passkeys',
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references((): AnySQLiteColumn => users.id, { onDelete: 'cascade' }),
    publicKey: blob().notNull(),
    signCount: integer().notNull(),
    transports: text(),
    createdAt: timestamps.createdAt,
    lastUsedAt: integer({ mode: 'timestamp_ms' }),
  },
  (passkey) => [index('passkeys_user_id').on(passkey.userId)],
);
```

`$defaultFn` runs in JavaScript, not in SQL, so none of this changes the
database:

```bash
# from packages/db
vp run db:generate
```

Expected: a list of tables, then `No schema changes, nothing to migrate`.
If drizzle-kit writes a new migration instead, compare the schema files with
the ones above before going on.

```bash
git add -A && git commit -m "fix: export work_tags and stop defaulting supplied ids"
```

### A5. Add the database client

Every query needs a Drizzle client built from the D1 binding. The `casing`
option must match `drizzle.config.ts`: the schema names columns in
camelCase (`sortTitle`), the migrations created them in snake_case
(`sort_title`), and this option maps one to the other at query time.

`packages/db/src/client.ts`:

```ts
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema/index.ts';

export type D1 = Parameters<typeof drizzle>[0];

export const createDb = (d1: D1) => drizzle(d1, { schema, casing: 'snake_case' });

export type Db = ReturnType<typeof createDb>;
```

`D1` is taken from Drizzle's own signature, so `packages/db` needs no
Cloudflare types of its own; the web app passes its `env.DB` straight in.

`packages/db/src/index.ts`:

```ts
export * from './schema/index.ts';
export * from './client.ts';
```

```bash
git add -A && git commit -m "feat: add the D1 client"
```

### A6. Add a test database and the first database test

Tests need a real D1, not a mock, to prove the foreign keys, indexes and
queries behave. Wrangler's `getPlatformProxy` starts the same local D1 that
`vp dev` uses, inside a normal Node test; Drizzle's D1 migrator then applies
the migrations folder to it. Each test gets a fresh in-memory database. This
replaces the "Workers test pool" risk in the plan.

```bash
# from packages/db
vp add -D wrangler
```

`packages/db/wrangler.test.jsonc`, the bindings the test database needs and
nothing else:

```jsonc
// Test-only bindings for createTestDb(); never deployed.
{
  "name": "shelf-db-test",
  "compatibility_date": "2026-10-19",
  "d1_databases": [{ "binding": "DB", "database_name": "test", "database_id": "test" }],
}
```

`packages/db/src/testing.ts`:

```ts
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/d1/migrator';
import { getPlatformProxy } from 'wrangler';
import { createDb, type D1 } from './client.ts';

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

export const createTestDb = async () => {
  const proxy = await getPlatformProxy<{ DB: D1 }>({
    configPath: path('../wrangler.test.jsonc'),
    persist: false,
  });
  const db = createDb(proxy.env.DB);
  await migrate(db, { migrationsFolder: path('../migrations') });
  return { d1: proxy.env.DB, db, dispose: proxy.dispose };
};
```

It is exported separately as `@shelf/db/testing`, so the Worker bundle
never imports Wrangler. `packages/db/package.json` in full:

```json
{
  "name": "@shelf/db",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./testing": "./src/testing.ts"
  },
  "scripts": {
    "test": "vp test run",
    "db:generate": "drizzle-kit generate"
  },
  "dependencies": {
    "@shelf/catalogue": "catalog:",
    "drizzle-orm": "catalog:"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "drizzle-kit": "catalog:",
    "typescript": "catalog:",
    "vite-plus": "catalog:",
    "wrangler": "catalog:"
  }
}
```

The first test proves a delete rule from the plan: an edition with copies
cannot be deleted. `packages/db/tests/schema.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { eq } from 'drizzle-orm';
import { createTestDb } from '../src/testing.ts';
import { copies, editions, works } from '../src/index.ts';

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

describe('catalogue schema', () => {
  let test: TestDb;

  beforeEach(async () => {
    test = await createTestDb();
  });

  afterEach(async () => {
    await test.dispose();
  });

  it('refuses to delete an edition that still has copies', async () => {
    // Arrange
    const [work] = await test.db
      .insert(works)
      .values({ kind: 'book', title: 'Watchmen', sortTitle: 'watchmen' })
      .returning();
    const [edition] = await test.db
      .insert(editions)
      .values({ workId: work!.id, source: 'manual' })
      .returning();
    await test.db.insert(copies).values({ editionId: edition!.id });

    // Act
    const attempt = test.db.delete(editions).where(eq(editions.id, edition!.id));

    // Assert
    await expect(attempt).rejects.toThrow();
  });
});
```

```bash
# from packages/db
vp install
vp test run
```

Expected: `Test Files 1 passed (1)`, `Tests 1 passed (1)`, in about three
seconds. Two things you may see:

- `Cannot read properties of undefined (reading 'config')`: two copies of
  Vite+ are installed; go back to A2.
- `ENOTEMPTY: directory not empty, rmdir '…/node_modules/.vitest-cache'`
  straight after a `vp install`: parallel test runs raced to clear the cache.
  Run the tests again.

```bash
git add -A && git commit -m "test: add a local D1 for tests"
```

### A7. Serve Open Props from the app

B8 sends a Content Security Policy of `style-src 'self'`, which blocks the
stylesheets the layout loads from unpkg. Copy them into `public/`, which
Vite serves in development and Wrangler uploads as static assets. The copy
is committed; rerun the script when you update Open Props.

```bash
# from apps/web
vp add -D open-props
```

Add a script to `apps/web/package.json`:

```json
"vendor": "mkdir -p public/vendor && cp node_modules/open-props/open-props.min.css node_modules/open-props/normalize.min.css public/vendor/"
```

```bash
# from apps/web
vp run vendor
ls public/vendor
git rm public/icons.svg
```

`ls` should list `normalize.min.css` and `open-props.min.css`.
`icons.svg` is a template leftover that nothing uses.

Then point the layout at the local files and the favicon. B8 replaces the
layout again; this keeps the app working in between.
`apps/web/src/layout.tsx`:

```tsx
import type { FC, PropsWithChildren } from 'hono/jsx';
import { raw } from 'hono/html';

type LayoutProps = PropsWithChildren<{ title: string }>;

export const Layout: FC<LayoutProps> = ({ title, children }) => (
  <>
    {raw('<!doctype html>')}
    <html lang="en-GB">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="stylesheet" href="/vendor/open-props.min.css" />
        <link rel="stylesheet" href="/vendor/normalize.min.css" />
      </head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  </>
);
```

Check it with `vp run dev` from the root: <http://localhost:5173/vendor/open-props.min.css>
should load, and the home page should look as before.

```bash
git add -A && git commit -m "feat: self-host Open Props"
```

### A8. Run deploys one at a time

Two pushes to `main` in quick succession start two deploy jobs, which can
apply migrations and deploy out of order. A `concurrency` group queues the
second until the first finishes. `.github/workflows/ci.yml` in full:

```yaml
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
    concurrency:
      group: deploy
      cancel-in-progress: false
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

```bash
git commit -am "ci: run deploys one at a time"
```

### Checkpoint A

```bash
# from the repo root
vp run ready
```

Expected, among other output:

```
pass: Found no warnings, lint errors, or type errors in … files
 Test Files  1 passed (1)
 Test Files  1 passed (1)
✓ built in …
vp run: … successful
```

One `Test Files` line is `@shelf/db`, the other `web`. Push the branch, open
a pull request, and merge once CI is green. The deploy job then publishes
the same page with self-hosted styles; check it on your phone.

## Part B: Authentication

```bash
# from the repo root, after merging Part A
git switch main && git pull && vp install
```

### B1. Measure PBKDF2 on the deployed Worker

Password hashing is deliberately slow, and the free Workers plan allows
10 ms of CPU per request. Cloudflare's production runtime also reportedly
refuses PBKDF2 counts above 100,000. The local runtime enforces neither:
100,000 iterations finished there in about 30 ms of wall time. So measure
on Cloudflare before writing any auth code, with a throwaway route on a
throwaway branch.

```bash
# from the repo root
git switch -c pbkdf2-bench
```

`apps/web/src/routes/bench.ts`:

```ts
import { Hono } from 'hono';

export const benchRoutes = new Hono();

const encoder = new TextEncoder();

benchRoutes.get('/__bench/pbkdf2', async (c) => {
  const iterations = Number(c.req.query('iterations') ?? '100000');
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode('benchmark password'),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return c.text(`${iterations} iterations: ok`);
});
```

In `apps/web/src/index.tsx`, import it and mount it after `app.get('/')`:

```tsx
import { benchRoutes } from './routes/bench.ts';

app.route('/', benchRoutes);
```

Deploy from your machine; CI only deploys `main`:

```bash
# from apps/web
vp run deploy
```

On your phone, open
`https://shelf.dank-shelf.workers.dev/__bench/pbkdf2?iterations=100000` and
reload it ten times. Each load shows either `100000 iterations: ok` or
Cloudflare's "Error 1102: Worker exceeded resource limits" page. If any load
fails, repeat with `iterations=50000`, then `25000`.

| Highest count that passed ten times out of ten | Set `ITERATIONS` in B4 to                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| 100,000                                        | `100_000`                                                               |
| 50,000                                         | `50_000`                                                                |
| 25,000                                         | `25_000`                                                                |
| None                                           | Stop here: passkeys need to come first; revise the plan before going on |

A lower count is acceptable for this app for two reasons. The pepper (B2) is
a secret held outside the database, so a stolen copy of D1 alone cannot be
attacked offline. And the user script requires passwords of at least 16
characters, which you generate with a password manager. The count is stored
in each hash, so it can be raised later without breaking existing users.

Then remove the route from production:

```bash
# from the repo root
git switch main
git branch -D pbkdf2-bench
cd apps/web && vp run deploy
```

Note the result; B4 uses it.

### B2. Create and store the pepper

The pepper is a secret mixed into every password before hashing. Its source
of truth is the encrypted Pulumi stack config, the same place the Cloudflare
API token lives, so it can always be recovered with `pulumi config get`. The
Worker gets a copy as a secret, set once; Worker secrets survive every
deploy, so CI never handles it.

```bash
# from the repo root
git switch -c shelf-0003
cd infra
pulumi config set --secret passwordPepper "$(openssl rand -base64 32)"
pulumi config get passwordPepper | vp -C ../apps/web exec wrangler secret put PASSWORD_PEPPER
```

Expected from Wrangler: `✨ Success! Uploaded secret PASSWORD_PEPPER`. If
the pipe does not reach Wrangler, run
`vp exec wrangler secret put PASSWORD_PEPPER` from `apps/web` and paste the
value `pulumi config get passwordPepper` prints.

Local development uses a different pepper, so a leaked laptop file never
exposes production's:

```bash
# from apps/web
echo "PASSWORD_PEPPER=$(openssl rand -base64 32)" > .dev.vars
vp run cf-typegen
grep PASSWORD_PEPPER worker-configuration.d.ts
```

The `grep` should show `PASSWORD_PEPPER: string;` inside `__BaseEnv_Env`;
`wrangler types` reads secret names from `.dev.vars`. Check `git status`:
`infra/Pulumi.prod.yaml` and `worker-configuration.d.ts` are modified, and
`.dev.vars` does not appear because `apps/web/.gitignore` covers it.

```bash
git add -A && git commit -m "feat: add the password pepper secret"
```

### B3. Create the auth package

```bash
# from the repo root
vp create vite:library --directory packages/auth
```

If it asks for a package name, use `@shelf/auth`; the `package.json` below
sets it either way. Then remove the library template's build
and sample files, and reuse `catalogue`'s TypeScript settings:

```bash
# from the repo root
rm packages/auth/vite.config.ts
rm -rf packages/auth/tests packages/auth/src
mkdir -p packages/auth/src packages/auth/tests
cp packages/catalogue/tsconfig.json packages/auth/tsconfig.json
cd packages/auth
vp add '@shelf/db@workspace:*' drizzle-orm hono
```

`packages/auth/package.json` should end up as below; edit it to match,
removing the template's publishing fields, `bumpp` and build scripts:

```json
{
  "name": "@shelf/auth",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vp test run"
  },
  "dependencies": {
    "@shelf/db": "catalog:",
    "drizzle-orm": "catalog:",
    "hono": "catalog:"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "typescript": "catalog:",
    "vite-plus": "catalog:"
  }
}
```

`vp add` writes `"@shelf/db": "catalog:"` and adds
`'@shelf/db': workspace:*` to the catalog in `pnpm-workspace.yaml`, because
the workspace uses `catalogMode: prefer`. That is expected and links the
local package. Replace the README with one line:

```markdown
# @shelf/auth

Password hashing, sessions, sign-in throttling and Hono middleware for Shelf.
```

```bash
# from the repo root
vp install
```

`vp check` fails until B4 adds source files, so commit at the end of B4.

### B4. Bytes and password hashing

The package uses only Web Crypto, which the Worker, Node and the tests all
provide, so the same code hashes passwords everywhere.

`packages/auth/src/bytes.ts`, small helpers for encoding and comparing
bytes:

```ts
const encoder = new TextEncoder();

export const utf8 = (text: string) => encoder.encode(text);

export const randomBytes = (length: number) => crypto.getRandomValues(new Uint8Array(length));

export const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');

export const fromBase64Url = (text: string) =>
  Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), (char) =>
    char.charCodeAt(0),
  );

export const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export const constantTimeEqual = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) return false;
  let difference = 0;
  a.forEach((byte, index) => {
    difference |= byte ^ (b[index] ?? 0);
  });
  return difference === 0;
};
```

`constantTimeEqual` takes the same time however many bytes match, so
response timing reveals nothing about how close a guess was. Workers has
`crypto.subtle.timingSafeEqual`, but Node does not, and the tests and the
user script run in Node.

`packages/auth/src/password.ts`, with `ITERATIONS` set from B1:

```ts
import { constantTimeEqual, fromBase64Url, randomBytes, toBase64Url, utf8 } from './bytes.ts';

const ALGORITHM = 'pbkdf2_sha256';

export const ITERATIONS = 100_000;

export const MIN_PASSWORD_LENGTH = 16;

export const DUMMY_HASH = [ALGORITHM, ITERATIONS, 'A'.repeat(22), 'A'.repeat(43)].join('$');

const pepper = async (password: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    utf8(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8(password)));
};

type Bytes = Uint8Array<ArrayBuffer>;

const derive = async (input: Bytes, salt: Bytes, iterations: number) => {
  const key = await crypto.subtle.importKey('raw', input, 'PBKDF2', false, ['deriveBits']);
  const params = { name: 'PBKDF2', hash: 'SHA-256', salt, iterations };
  return new Uint8Array(await crypto.subtle.deriveBits(params, key, 256));
};

export const hashPassword = async (password: string, secret: string, iterations = ITERATIONS) => {
  const salt = randomBytes(16);
  const hash = await derive(await pepper(password, secret), salt, iterations);
  return [ALGORITHM, iterations, toBase64Url(salt), toBase64Url(hash)].join('$');
};

export const verifyPassword = async (stored: string, password: string, secret: string) => {
  const [algorithm, iterations, salt, hash] = stored.split('$');
  if (algorithm !== ALGORITHM || !iterations || !salt || !hash) return false;
  const input = await pepper(password, secret);
  const actual = await derive(input, fromBase64Url(salt), Number(iterations));
  return constantTimeEqual(actual, fromBase64Url(hash));
};
```

How it fits together:

- The stored value reads `pbkdf2_sha256$100000$<salt>$<hash>`, so each hash
  carries its own algorithm and count and can be upgraded later.
- `pepper` runs the password through HMAC with the secret first. Without the
  secret, a copy of the `users` table cannot be cracked offline.
- `DUMMY_HASH` has the right shape and count but matches nothing. Sign-in
  verifies against it when the username is unknown, so both failures cost
  the same time.
- `Bytes` narrows the type to what `crypto.subtle` accepts. With plain
  `Uint8Array`, `vp check` fails with `TS2769: No overload matches this
  call` on `importKey`.
- `hashPassword` takes an optional count so tests can use 1,000 iterations
  and stay fast.

`packages/auth/tests/password.test.ts`:

```ts
import { describe, expect, it } from 'vite-plus/test';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../src/password.ts';

const PEPPER = 'test-pepper';

describe('password hashing', () => {
  it('verifies the password it hashed', async () => {
    // Arrange
    const stored = await hashPassword('correct horse battery staple', PEPPER, 1_000);

    // Act
    const valid = await verifyPassword(stored, 'correct horse battery staple', PEPPER);

    // Assert
    expect(valid).toBe(true);
  });

  it('rejects a wrong password', async () => {
    // Arrange
    const stored = await hashPassword('correct horse battery staple', PEPPER, 1_000);

    // Act
    const valid = await verifyPassword(stored, 'incorrect horse', PEPPER);

    // Assert
    expect(valid).toBe(false);
  });

  it('rejects the right password with a different pepper', async () => {
    // Arrange
    const stored = await hashPassword('correct horse battery staple', PEPPER, 1_000);

    // Act
    const valid = await verifyPassword(stored, 'correct horse battery staple', 'other');

    // Assert
    expect(valid).toBe(false);
  });

  it('never matches the dummy hash', async () => {
    // Arrange
    const password = '';

    // Act
    const valid = await verifyPassword(DUMMY_HASH, password, PEPPER);

    // Assert
    expect(valid).toBe(false);
  });
});
```

```bash
# from packages/auth
vp test run
```

Expected: `Tests 4 passed (4)`.

```bash
git add -A && git commit -m "feat: hash passwords with a peppered PBKDF2"
```

### B5. Tokens and sessions

A session token is 32 random bytes, sent to the browser and never stored.
The `sessions` row is keyed by its SHA-256, so a copy of the database holds
nothing that works as a cookie.

`packages/auth/src/tokens.ts`:

```ts
import { randomBytes, toBase64Url, toHex, utf8 } from './bytes.ts';

export const newToken = () => toBase64Url(randomBytes(32));

export const hashToken = async (token: string) =>
  toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(token))));
```

`packages/auth/src/sessions.ts`:

```ts
import { and, eq, gt } from 'drizzle-orm';
import { sessions, users, type Db } from '@shelf/db';
import { hashToken, newToken } from './tokens.ts';

const DAY = 24 * 60 * 60 * 1000;

export const SESSION_DAYS = 30;

const expiryFrom = (now: Date) => new Date(now.getTime() + SESSION_DAYS * DAY);

export const isStale = (lastSeenAt: Date, now: Date) => now.getTime() - lastSeenAt.getTime() > DAY;

export const createSession = async (db: Db, userId: string, now = new Date()) => {
  const token = newToken();
  const id = await hashToken(token);
  await db.insert(sessions).values({ id, userId, expiresAt: expiryFrom(now), lastSeenAt: now });
  return token;
};

export const findSession = async (db: Db, token: string, now = new Date()) => {
  const [row] = await db
    .select({
      session: sessions,
      user: { id: users.id, username: users.username, displayName: users.displayName },
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, await hashToken(token)), gt(sessions.expiresAt, now)));
  return row ?? null;
};

export const touchSession = (db: Db, id: string, now = new Date()) =>
  db
    .update(sessions)
    .set({ lastSeenAt: now, expiresAt: expiryFrom(now) })
    .where(eq(sessions.id, id));

export const deleteSession = async (db: Db, token: string) =>
  db.delete(sessions).where(eq(sessions.id, await hashToken(token)));
```

`findSession` checks expiry in the query itself, so an expired row is never
treated as signed in, even before anything deletes it. `touchSession` moves
both `last_seen_at` and the expiry forward; B7 calls it at most once a day
per session.

`packages/auth/tests/sessions.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { users } from '@shelf/db';
import { createTestDb } from '@shelf/db/testing';
import { createSession, deleteSession, findSession, SESSION_DAYS } from '../src/sessions.ts';

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

const DAY = 24 * 60 * 60 * 1000;

describe('sessions', () => {
  let test: TestDb;
  let userId: string;

  beforeEach(async () => {
    test = await createTestDb();
    const [user] = await test.db
      .insert(users)
      .values({ username: 'dan', displayName: 'Dan' })
      .returning();
    userId = user!.id;
  });

  afterEach(async () => {
    await test.dispose();
  });

  it('does not find an expired session', async () => {
    // Arrange
    const token = await createSession(
      test.db,
      userId,
      new Date(Date.now() - (SESSION_DAYS + 1) * DAY),
    );

    // Act
    const found = await findSession(test.db, token);

    // Assert
    expect(found).toBeNull();
  });

  it('does not find a deleted session', async () => {
    // Arrange
    const token = await createSession(test.db, userId);
    await deleteSession(test.db, token);

    // Act
    const found = await findSession(test.db, token);

    // Assert
    expect(found).toBeNull();
  });
});
```

`@shelf/db/testing` resolves because `@shelf/db` is a dependency of this
package. Run `vp test run` from `packages/auth`; expect
`Tests 6 passed (6)`.

```bash
git add -A && git commit -m "feat: store sessions by token hash"
```

### B6. Throttling and sign-in

Each failed sign-in is recorded twice, under the username and under the IP
address. Five failures within 15 minutes on either key locks it until the
oldest ages out. The username key stops slow guessing from many addresses;
the IP key stops one address trying many usernames.

`packages/auth/src/throttle.ts`:

```ts
import { and, count, gt, inArray, lt } from 'drizzle-orm';
import { loginAttempts, type Db } from '@shelf/db';

const WINDOW = 15 * 60 * 1000;

export const MAX_FAILURES = 5;

const windowStart = (now: Date) => new Date(now.getTime() - WINDOW);

export const throttleKeys = (username: string, ip: string) => [`user:${username}`, `ip:${ip}`];

export const pruneAttempts = (db: Db, now: Date) =>
  db.delete(loginAttempts).where(lt(loginAttempts.attemptedAt, windowStart(now)));

export const isLocked = async (db: Db, keys: string[], now: Date) => {
  const rows = await db
    .select({ key: loginAttempts.key, failures: count() })
    .from(loginAttempts)
    .where(and(inArray(loginAttempts.key, keys), gt(loginAttempts.attemptedAt, windowStart(now))))
    .groupBy(loginAttempts.key);
  return rows.some((row) => row.failures >= MAX_FAILURES);
};

export const recordFailure = (db: Db, keys: string[], now: Date) =>
  db.insert(loginAttempts).values(keys.map((key) => ({ key, attemptedAt: now })));
```

`packages/auth/src/sign-in.ts` puts the steps in order and returns a result
the route can turn into a page:

```ts
import { eq } from 'drizzle-orm';
import { users, type Db } from '@shelf/db';
import { DUMMY_HASH, verifyPassword } from './password.ts';
import { createSession } from './sessions.ts';
import { isLocked, pruneAttempts, recordFailure, throttleKeys } from './throttle.ts';

export type Credentials = { username: string; password: string; ip: string };

export type SignInResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'invalid' | 'locked' };

const findUser = async (db: Db, username: string) => {
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return user;
};

export const signIn = async (
  db: Db,
  { username, password, ip }: Credentials,
  pepper: string,
  now = new Date(),
): Promise<SignInResult> => {
  const keys = throttleKeys(username, ip);
  await pruneAttempts(db, now);
  if (await isLocked(db, keys, now)) return { ok: false, reason: 'locked' };
  const user = await findUser(db, username);
  const valid = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password, pepper);
  if (!user || !valid) {
    await recordFailure(db, keys, now);
    return { ok: false, reason: 'invalid' };
  }
  return { ok: true, token: await createSession(db, user.id, now) };
};
```

A user with no `password_hash` (passkey-only, from milestone 5) also
verifies against the dummy hash, so they fail like any wrong password.

`packages/auth/tests/sign-in.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { users } from '@shelf/db';
import { createTestDb } from '@shelf/db/testing';
import { hashPassword } from '../src/password.ts';
import { findSession } from '../src/sessions.ts';
import { signIn } from '../src/sign-in.ts';
import { MAX_FAILURES } from '../src/throttle.ts';

const PEPPER = 'test-pepper';
const PASSWORD = 'correct horse battery staple';

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

describe('signIn', () => {
  let test: TestDb;

  beforeEach(async () => {
    test = await createTestDb();
    const passwordHash = await hashPassword(PASSWORD, PEPPER, 1_000);
    await test.db.insert(users).values({ username: 'dan', displayName: 'Dan', passwordHash });
  });

  afterEach(async () => {
    await test.dispose();
  });

  it('returns a token for a session that finds the user', async () => {
    // Arrange
    const credentials = { username: 'dan', password: PASSWORD, ip: '127.0.0.1' };

    // Act
    const result = await signIn(test.db, credentials, PEPPER);

    // Assert
    expect(result.ok).toBe(true);
    const found = result.ok ? await findSession(test.db, result.token) : null;
    expect(found?.user.username).toBe('dan');
  });

  it('rejects an unknown username the same way as a wrong password', async () => {
    // Arrange
    const credentials = { username: 'nobody', password: PASSWORD, ip: '127.0.0.1' };

    // Act
    const result = await signIn(test.db, credentials, PEPPER);

    // Assert
    expect(result).toEqual({ ok: false, reason: 'invalid' });
  });

  it('locks the username after repeated failures', async () => {
    // Arrange
    const wrong = { username: 'dan', password: 'wrong', ip: '127.0.0.1' };
    for (let i = 0; i < MAX_FAILURES; i++) await signIn(test.db, wrong, PEPPER);

    // Act
    const result = await signIn(test.db, { ...wrong, password: PASSWORD }, PEPPER);

    // Assert
    expect(result).toEqual({ ok: false, reason: 'locked' });
  });

  it('unlocks once the failures are older than the window', async () => {
    // Arrange
    const wrong = { username: 'dan', password: 'wrong', ip: '127.0.0.1' };
    const earlier = new Date(Date.now() - 16 * 60 * 1000);
    for (let i = 0; i < MAX_FAILURES; i++) await signIn(test.db, wrong, PEPPER, earlier);

    // Act
    const result = await signIn(test.db, { ...wrong, password: PASSWORD }, PEPPER);

    // Assert
    expect(result.ok).toBe(true);
  });
});
```

Run `vp test run` from `packages/auth`; expect `Test Files 3 passed (3)` and
`Tests 10 passed (10)`, in about ten seconds.

```bash
git add -A && git commit -m "feat: throttle sign-in by username and IP"
```

### B7. The cookie and the middleware

`packages/auth/src/cookie.ts`:

```ts
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { SESSION_DAYS } from './sessions.ts';

const NAME = 'session';

const options = {
  prefix: 'host',
  path: '/',
  secure: true,
  httpOnly: true,
  sameSite: 'Lax',
  maxAge: SESSION_DAYS * 24 * 60 * 60,
} as const;

export const readSessionCookie = (c: Context) => getCookie(c, NAME, 'host');

export const writeSessionCookie = (c: Context, token: string) => setCookie(c, NAME, token, options);

export const clearSessionCookie = (c: Context) => deleteCookie(c, NAME, options);
```

The `host` prefix makes Hono name the cookie `__Host-session`. Browsers only
accept that name with `Secure`, `Path=/` and no `Domain`, so no other site
or path can set or overwrite it. `HttpOnly` keeps it away from JavaScript;
`SameSite=Lax` keeps it off cross-site form posts. Chrome accepts `Secure`
cookies on `http://localhost`, so this works under `vp dev`; Safari does
not, so test locally in Chrome.

`packages/auth/src/middleware.ts`:

```ts
import { createMiddleware } from 'hono/factory';
import type { Db } from '@shelf/db';
import { readSessionCookie, writeSessionCookie } from './cookie.ts';
import { findSession, isStale, touchSession } from './sessions.ts';

export type SessionUser = { id: string; username: string; displayName: string };

export type AuthVariables = { db: Db; user: SessionUser | null };

export const loadUser = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  const token = readSessionCookie(c);
  const found = token ? await findSession(c.var.db, token) : null;
  c.set('user', found?.user ?? null);
  if (token && found && isStale(found.session.lastSeenAt, new Date())) {
    await touchSession(c.var.db, found.session.id);
    writeSessionCookie(c, token);
  }
  await next();
});

export const requireUser = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  if (c.var.user) return next();
  const target = `/login?next=${encodeURIComponent(c.req.path)}`;
  if (!c.req.header('HX-Request')) return c.redirect(target, 303);
  c.header('HX-Redirect', target);
  return c.body(null, 401);
});

export const safeNext = (value: unknown, fallback = '/manage') =>
  typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : fallback;
```

- `loadUser` runs on every request and only touches D1 when a cookie is
  present. Once a day it extends the session and re-sends the cookie, so
  both expire 30 days after your last visit.
- `requireUser` redirects page requests with 303, so the browser follows
  with a `GET`. htmx requests, from milestone 2, get 401 and an
  `HX-Redirect` header instead, which tells htmx to load the login page in
  full rather than swap it into a fragment.
- `safeNext` only allows a path on this site. Without it, a link to
  `/login?next=https://evil.example` would send you to another site after
  signing in. The pattern refuses `//evil.example` and `/\evil.example`,
  which browsers treat as other sites.

`packages/auth/src/index.ts`:

```ts
export * from './cookie.ts';
export * from './middleware.ts';
export * from './password.ts';
export * from './sessions.ts';
export * from './sign-in.ts';
```

```bash
# from the repo root
vp check
git add -A && git commit -m "feat: add the session cookie and auth middleware"
```

`vp check` should pass. If it reports formatting only, run
`vp check --fix`.

### B8. Wire it into the web app

```bash
# from apps/web
vp add '@shelf/auth@workspace:*' '@shelf/db@workspace:*'
```

`apps/web/src/env.ts`, the one place the app's Hono types are declared:

```ts
import type { AuthVariables } from '@shelf/auth';

export type AppEnv = { Bindings: Env; Variables: AuthVariables };
```

`apps/web/src/security.ts`:

```ts
import { NONCE, secureHeaders } from 'hono/secure-headers';

export const securityHeaders = secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", NONCE],
    styleSrc: ["'self'"],
    imgSrc: ["'self'", 'data:'],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'none'"],
    objectSrc: ["'none'"],
  },
});
```

The policy only allows scripts, styles, images and form targets from this
site, and no framing. `NONCE` adds a fresh `'nonce-…'` to `script-src` on
every response and stores it as `c.get('secureHeadersNonce')`. Nothing uses
it yet; milestone 2 puts it on the htmx script tag. `secureHeaders` also
sends Hono's default hardening headers, such as `X-Content-Type-Options`
and `Strict-Transport-Security`.

`apps/web/src/layout.tsx` gains the header and a sign-in or sign-out link:

```tsx
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
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="stylesheet" href="/vendor/open-props.min.css" />
        <link rel="stylesheet" href="/vendor/normalize.min.css" />
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
```

Sign-out is a form, not a link, because it changes state: a `GET /logout`
could be triggered by any image tag on another site.

Pages live in `apps/web/src/pages/`.

`apps/web/src/pages/home.tsx`:

```tsx
import type { SessionUser } from '@shelf/auth';
import { Layout } from '../layout.tsx';

export const HomePage = ({ user }: { user: SessionUser | null }) => (
  <Layout title="Shelf" user={user}>
    <h1>Shelf: A catalogue of books, games and records</h1>
  </Layout>
);
```

`apps/web/src/pages/login.tsx`:

```tsx
import { Layout } from '../layout.tsx';

const MESSAGES = {
  invalid: 'Incorrect username or password.',
  locked: 'Too many failed attempts. Try again in 15 minutes.',
};

type LoginPageProps = { next: string; username?: string; error?: keyof typeof MESSAGES };

export const LoginPage = ({ next, username = '', error }: LoginPageProps) => (
  <Layout title="Sign in · Shelf" user={null}>
    <h1>Sign in</h1>
    {error && <p role="alert">{MESSAGES[error]}</p>}
    <form method="post" action="/login">
      <input type="hidden" name="next" value={next} />
      <label>
        Username
        <input name="username" value={username} autocomplete="username" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autocomplete="current-password" required />
      </label>
      <button type="submit">Sign in</button>
    </form>
  </Layout>
);
```

`apps/web/src/pages/manage.tsx`, a placeholder that milestone 2 fills:

```tsx
import type { SessionUser } from '@shelf/auth';
import { Layout } from '../layout.tsx';

export const ManagePage = ({ user }: { user: SessionUser }) => (
  <Layout title="Manage · Shelf" user={user}>
    <h1>Manage</h1>
    <p>Signed in as {user.displayName}.</p>
  </Layout>
);
```

Routes live in `apps/web/src/routes/`.

`apps/web/src/routes/auth.tsx`:

```tsx
import { Hono } from 'hono';
import {
  clearSessionCookie,
  deleteSession,
  readSessionCookie,
  safeNext,
  signIn,
  writeSessionCookie,
} from '@shelf/auth';
import type { AppEnv } from '../env.ts';
import { LoginPage } from '../pages/login.tsx';

const text = (value: unknown) => (typeof value === 'string' ? value : '');

export const authRoutes = new Hono<AppEnv>();

authRoutes.get('/login', (c) => {
  const next = safeNext(c.req.query('next'));
  return c.var.user ? c.redirect(next, 303) : c.html(<LoginPage next={next} />);
});

authRoutes.post('/login', async (c) => {
  const form = await c.req.parseBody();
  const username = text(form.username).trim().toLowerCase();
  const password = text(form.password);
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
  const next = safeNext(form.next);
  const result = await signIn(c.var.db, { username, password, ip }, c.env.PASSWORD_PEPPER);
  if (result.ok) {
    writeSessionCookie(c, result.token);
    return c.redirect(next, 303);
  }
  const page = <LoginPage next={next} username={username} error={result.reason} />;
  return c.html(page, result.reason === 'locked' ? 429 : 401);
});

authRoutes.post('/logout', async (c) => {
  const token = readSessionCookie(c);
  if (token) await deleteSession(c.var.db, token);
  clearSessionCookie(c);
  return c.redirect('/', 303);
});
```

- `text()` narrows form values to strings. `parseBody` can also return files,
  and `String(form.username)` fails lint with `no-base-to-string`.
- Usernames are compared in lower case; the user script stores them that
  way.
- `cf-connecting-ip` is the visitor's address on Cloudflare. Locally it is
  missing, so every local request shares the key `ip:unknown`.

`apps/web/src/routes/manage.tsx`:

```tsx
import { Hono } from 'hono';
import { requireUser } from '@shelf/auth';
import type { AppEnv } from '../env.ts';
import { ManagePage } from '../pages/manage.tsx';

export const manageRoutes = new Hono<AppEnv>();

manageRoutes.use(requireUser);

manageRoutes.get('/', (c) => c.html(<ManagePage user={c.var.user!} />));
```

`requireUser` covers every route added to `manageRoutes` later, so new
management pages cannot forget it.

`apps/web/src/index.tsx`:

```tsx
import { Hono } from 'hono';
import { csrf } from 'hono/csrf';
import { loadUser } from '@shelf/auth';
import { createDb } from '@shelf/db';
import type { AppEnv } from './env.ts';
import { HomePage } from './pages/home.tsx';
import { authRoutes } from './routes/auth.tsx';
import { manageRoutes } from './routes/manage.tsx';
import { securityHeaders } from './security.ts';

const app = new Hono<AppEnv>();

app.use(securityHeaders);
app.use(csrf());
app.use(async (c, next) => {
  c.set('db', createDb(c.env.DB));
  await next();
});
app.use(loadUser);

app.get('/', (c) => c.html(<HomePage user={c.var.user} />));
app.route('/', authRoutes);
app.route('/manage', manageRoutes);

export default app;
```

The middleware runs in the order written: security headers on every
response; `csrf()` refuses any form post whose `Origin` is another site
(403); then the database and the signed-in user are attached for every
route.

```bash
# from the repo root
vp check
```

It should pass. The old `index.test.tsx` calls the app without a database;
B9 replaces it with tests that run against one.

### B9. Web tests

`apps/web/src/testing.ts` builds the app's `Env` around a test database. It
sits in `src/` so it is type-checked; nothing in the Worker imports it, so
it never reaches the bundle.

```ts
import { users } from '@shelf/db';
import { createTestDb } from '@shelf/db/testing';
import { hashPassword } from '@shelf/auth';
import app from './index.tsx';

export const PEPPER = 'test-pepper';
export const PASSWORD = 'correct horse battery staple';
export const ORIGIN = 'http://localhost';

export const createTestApp = async () => {
  const test = await createTestDb();
  const env = { DB: test.d1, COVERS: {}, PASSWORD_PEPPER: PEPPER } as unknown as Env;
  const request = (path: string, init?: RequestInit) => app.request(path, init, env);
  return { ...test, request };
};

export const addUser = async (test: Awaited<ReturnType<typeof createTestApp>>) => {
  const passwordHash = await hashPassword(PASSWORD, PEPPER, 1_000);
  await test.db.insert(users).values({ username: 'dan', displayName: 'Dan', passwordHash });
};

export const loginForm = (username: string, password: string) =>
  new URLSearchParams({ username, password, next: '/manage' });
```

`apps/web/src/index.test.tsx`:

```tsx
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { createTestApp } from './testing.ts';

type TestApp = Awaited<ReturnType<typeof createTestApp>>;

describe('GET /', () => {
  let test: TestApp;

  beforeEach(async () => {
    test = await createTestApp();
  });

  afterEach(async () => {
    await test.dispose();
  });

  it('renders the home page', async () => {
    // Arrange
    const path = '/';

    // Act
    const response = await test.request(path);

    // Assert
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(
      '<h1>Shelf: A catalogue of books, games and records</h1>',
    );
  });

  it('sends a content security policy', async () => {
    // Arrange
    const path = '/';

    // Act
    const response = await test.request(path);

    // Assert
    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
  });
});
```

`apps/web/src/routes/auth.test.tsx`. Form posts send an `Origin` header,
as a browser does, or `csrf()` refuses them:

```tsx
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { addUser, createTestApp, loginForm, ORIGIN, PASSWORD } from '../testing.ts';

type TestApp = Awaited<ReturnType<typeof createTestApp>>;

const signIn = (test: TestApp, password = PASSWORD, origin = ORIGIN) =>
  test.request('/login', { method: 'POST', body: loginForm('Dan', password), headers: { origin } });

const sessionCookie = (response: Response) =>
  (response.headers.get('set-cookie') ?? '').split(';')[0] ?? '';

describe('authentication', () => {
  let test: TestApp;

  beforeEach(async () => {
    test = await createTestApp();
    await addUser(test);
  });

  afterEach(async () => {
    await test.dispose();
  });

  it('redirects a signed-out visitor from /manage to the login page', async () => {
    // Arrange
    const path = '/manage';

    // Act
    const response = await test.request(path);

    // Assert
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/login?next=%2Fmanage');
  });

  it('tells htmx to redirect instead of following a redirect', async () => {
    // Arrange
    const headers = { 'HX-Request': 'true' };

    // Act
    const response = await test.request('/manage', { headers });

    // Assert
    expect(response.status).toBe(401);
    expect(response.headers.get('hx-redirect')).toBe('/login?next=%2Fmanage');
  });

  it('signs in with a secure session cookie', async () => {
    // Arrange
    const password = PASSWORD;

    // Act
    const response = await signIn(test, password);

    // Assert
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/manage');
    expect(response.headers.get('set-cookie')).toMatch(
      /^__Host-session=.+HttpOnly; Secure; SameSite=Lax/,
    );
  });

  it('shows the manage page to a signed-in user', async () => {
    // Arrange
    const cookie = sessionCookie(await signIn(test));

    // Act
    const response = await test.request('/manage', { headers: { cookie } });

    // Assert
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Signed in as Dan.');
  });

  it('rejects a wrong password without a cookie', async () => {
    // Arrange
    const password = 'wrong';

    // Act
    const response = await signIn(test, password);

    // Assert
    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('refuses a sign-in posted from another site', async () => {
    // Arrange
    const origin = 'https://evil.example';

    // Act
    const response = await signIn(test, PASSWORD, origin);

    // Assert
    expect(response.status).toBe(403);
  });

  it('ends the session on sign out', async () => {
    // Arrange
    const cookie = sessionCookie(await signIn(test));
    await test.request('/logout', { method: 'POST', headers: { cookie, origin: ORIGIN } });

    // Act
    const response = await test.request('/manage', { headers: { cookie } });

    // Assert
    expect(response.status).toBe(303);
  });
});
```

```bash
# from apps/web
vp test run
```

Expected: `Test Files 2 passed (2)`, `Tests 9 passed (9)`.

```bash
git add -A && git commit -m "feat: sign in, sign out and protect /manage"
```

### B10. Create a user and try it locally

There is no sign-up page, so users are created with a script. It asks for
the details, hides the password as you type, hashes it with the same code
the Worker uses, and inserts the row with `wrangler d1 execute`.

Add `scripts` to the type-checked folders in `apps/web/tsconfig.json`:

```json
"include": ["src", "scripts", "worker-configuration.d.ts"]
```

`apps/web/scripts/create-user.ts`:

```ts
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { hashPassword, MIN_PASSWORD_LENGTH } from '@shelf/auth';

const target = process.argv.includes('--remote') ? '--remote' : '--local';
if (target === '--local') process.loadEnvFile('.dev.vars');
const pepper = process.env.PASSWORD_PEPPER;
if (!pepper) throw new Error('PASSWORD_PEPPER is not set');

const prompt = createInterface({ input: process.stdin, output: process.stdout, terminal: false });

const askHidden = async (question: string) => {
  const echo = (setting: string) => {
    if (process.stdin.isTTY) execFileSync('stty', [setting], { stdio: 'inherit' });
  };
  echo('-echo');
  const answer = await prompt.question(question);
  echo('echo');
  process.stdout.write('\n');
  return answer;
};

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;

const username = (await prompt.question('Username: ')).trim().toLowerCase();
const displayName = (await prompt.question('Display name: ')).trim();
const password = await askHidden(`Password (${MIN_PASSWORD_LENGTH}+ characters): `);
prompt.close();
if (password.length < MIN_PASSWORD_LENGTH) throw new Error('Password is too short');

const now = Date.now();
const hash = await hashPassword(password, pepper);
const values = [crypto.randomUUID(), username, displayName, hash].map(quote).join(', ');
const sql = `INSERT INTO users (id, username, display_name, password_hash, created_at, updated_at) VALUES (${values}, ${now}, ${now});`;

execFileSync('vp', ['exec', 'wrangler', 'd1', 'execute', 'DB', target, '--command', sql], {
  stdio: 'inherit',
});
```

- `terminal: false` matters: in terminal mode, Node's readline echoes what
  you type itself, so `stty -echo` alone would not hide the password.
- `quote` doubles any single quote, so a display name such as `O'Brien`
  cannot break the SQL.
- `--local` reads the pepper from `.dev.vars`; `--remote` expects it in the
  environment (B11).

Run it against your local database, then start the app:

```bash
# from apps/web
vp run migrate --local
vp exec vpx ./scripts/create-user.ts --local
vp dev
```

`migrate` should report `No migrations to apply` (or apply `0000_…` on a
fresh machine). The script ends with `🚣 1 command executed successfully`.

In Chrome, at <http://localhost:5173>:

1. The header shows "Sign in".
2. <http://localhost:5173/manage> redirects to `/login?next=%2Fmanage`.
3. A wrong password shows "Incorrect username or password." and keeps the
   username filled in.
4. The right password lands on `/manage` with "Signed in as …", and the
   header shows your name and "Sign out". In DevTools, Application,
   Cookies shows `__Host-session` as HttpOnly and Secure.
5. "Sign out" returns to `/`; `/manage` redirects to the login page again.

Locally every request shares the IP key, so five wrong passwords lock every
username for 15 minutes. To reset:

```bash
# from apps/web
vp exec wrangler d1 execute DB --local --command "DELETE FROM login_attempts"
```

```bash
git add -A && git commit -m "feat: add a script to create users"
```

### Checkpoint B

```bash
# from the repo root
vp run ready
```

Expected: no lint or type errors, three `Test Files` lines (`@shelf/db` 1,
`@shelf/auth` 3, `web` 2, all passed), and a build. Push the branch, open a
pull request and merge once CI is green. CI deploys the auth code; the
`PASSWORD_PEPPER` secret from B2 is already on the Worker.

### B11. Create your real user

Generate a password of 20 or more characters in your password manager and
save it there first. Then:

```bash
# from apps/web
PASSWORD_PEPPER="$(pulumi config get passwordPepper --cwd ../../infra)" vp exec vpx ./scripts/create-user.ts --remote
```

The output should say it is executing on the remote database and end with
`1 command executed successfully`. Run it again for the second user when
needed.

## The gate

On your phone, on mobile data, at <https://shelf.dank-shelf.workers.dev>:

- [ ] The home page loads with its styles and a "Sign in" link.
- [ ] `/manage` redirects to the sign-in page.
- [ ] A wrong password shows "Incorrect username or password."
- [ ] The right password lands on `/manage` with "Signed in as …".
- [ ] Reopening the browser later still shows you signed in.
- [ ] "Sign out" returns to the home page, and `/manage` asks you to sign in
      again.
- [ ] Sign-in completes without "Error 1102" over several tries.

Leave the lockout to the automated tests: triggering it by hand locks your
phone's address and your username for 15 minutes.

## Troubleshooting

| Symptom                                                                           | Cause                                                                                 | Fix                                                                      |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `vp run dev` prints nothing and exits                                             | Root script names `website#dev`                                                       | A1                                                                       |
| `Cannot read properties of undefined (reading 'config')` in package tests         | Two `@types/node` versions, so two copies of Vite+                                    | A2, including the reinstall and the `readlink` check                     |
| `pulumi up` fails with `Cannot read properties of undefined (reading 'readFile')` | `infra` resolved TypeScript 7, which has no JavaScript API for Pulumi's `ts-node`     | Keep `"typescript": "^5.0.0"` in `infra/package.json` (A3) and reinstall |
| `ENOTEMPTY … .vitest-cache`                                                       | Parallel test runs clearing the cache after an install                                | Run the tests again                                                      |
| `TS2769: No overload matches this call` at `importKey`                            | Plain `Uint8Array` passed to Web Crypto                                               | Use the `Bytes` type from B4                                             |
| `no-base-to-string` warning in the login route                                    | `String()` on a form value                                                            | Use the `text()` helper from B8                                          |
| `ERR_PNPM_IGNORED_BUILDS` after `vp add`                                          | A new dependency has an install script                                                | `vp pm approve-builds`; approve only tools you recognise                 |
| `PASSWORD_PEPPER is not set` from the script                                      | No `.dev.vars` (local) or no variable (remote)                                        | B2 for local; the `PASSWORD_PEPPER=…` prefix in B11 for remote           |
| Every local sign-in says "Incorrect…"                                             | The user was hashed with a different pepper, or `.dev.vars` changed after creating it | Delete the user with `wrangler d1 execute` and run the script again      |
| "Too many failed attempts" locally                                                | All local requests share `ip:unknown`                                                 | Clear `login_attempts` (B10)                                             |
| No cookie after signing in locally                                                | Safari refuses `Secure` cookies on `http://localhost`                                 | Use Chrome                                                               |
| `Forbidden` (403) on a form post                                                  | `csrf()` saw an `Origin` from another site                                            | Open the app on the same host it posts to                                |
| 500 on sign-in in production only                                                 | The Worker has no `PASSWORD_PEPPER`                                                   | `vp exec wrangler secret list`; repeat B2's `secret put`                 |
| "Error 1102" on sign-in                                                           | Hashing exceeds the CPU limit                                                         | Lower `ITERATIONS` (B1) and recreate users                               |
| `fetch failed` or certificate errors from Wrangler                                | VPN inspecting HTTPS                                                                  | `export NODE_OPTIONS=--use-system-ca`                                    |

## What milestone 2 builds on

- `requireUser` already covers everything under `/manage`; new management
  routes go on `manageRoutes`.
- The script nonce is in `c.get('secureHeadersNonce')` for the htmx script
  tag and the `hx-csp` extension.
- `createTestDb()` and `createTestApp()` are ready for catalogue tests.
- The layout takes `user`, so pages can show editing controls only when
  someone is signed in.
