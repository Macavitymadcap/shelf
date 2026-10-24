# Milestone 2: Catalogue

This guide starts from `main` at `c000f6b`, the end of milestone 1. Part A
tidies what milestone 1 left behind. Parts B to E build the catalogue:
the shared vocabulary, full-text search, the queries and saves, htmx under
the Content Security Policy, and the pages and forms to add, edit and
delete works, editions and copies by hand, editing in place on each work's
page with `hx-put` and `hx-delete`. At the end you can enter your first 20
items from your phone, and anyone can browse and search them.

Every file and command here was run against a copy of the repository with
the same tool versions (Vite+ 1.4, pnpm 12.14, Wrangler 4.151, Hono 4.13,
Drizzle 0.45, htmx 4.0.0, Valibot 1.5): `vp run ready` passes with 52
tests across four packages, the milestone 1 smoke script still passes, and
headless Chrome 153 at 360 by 740 pixels was driven through every write:
adding a record with an extra credit row, a rejected save that kept focus
and typed input, editing a work, an edition and a copy in place, cancelling
an edit, adding and deleting copies and editions behind confirmations,
deleting the work, and live search, with no console errors from the CSP. Two things cannot be tested
locally: FTS5 on remote D1 and the phone itself, which the gate covers.

## How this guide is laid out

The same promises as milestone 1:

- Every new or changed file is given in full, with its path before the
  block.
- Every command block starts with a comment naming the directory to run it
  from.
- Steps say what to expect, and name the error you may hit at the step that
  causes it.
- Each part ends with a checkpoint and a commit.

This milestone adds about 75 files, most of them short. Where a step adds
several, they are grouped by folder in the order you need them; each part's
checkpoint is the first point where everything type-checks again.

## Decisions this guide makes

These settle questions the plan left open, or change it. The revival plan is
updated to match (Part A, step A4).

| Question                  | Decision                                                                       | Why                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| How htmx reaches the page | Vendored into `public/vendor/htmx/` by `scripts/vendor.ts`, like Open Props    | No bundling step; the script loads from `'self'` with the nonce                                    |
| Extensions                | `hx-csp` only; `hx-preload` dropped                                            | Preloading on hover does little on a phone, and every extension is another file to keep nonce-safe |
| Methods                   | `hx-post` to create, `hx-put` to save, `hx-delete` to delete, on resource URLs | The hypermedia approach: htmx sends the methods HTML forms cannot                                  |
| Editing                   | In place on the work page: a card or row swaps for its form, and back          | Your plan's routes table asked for fragments; one page holds the whole work                        |
| Without JavaScript        | No fallback                                                                    | Two users, both on Chrome with JavaScript                                                          |
| Failed saves              | 422 with the same form; `hx-status:422` morphs it in                           | Focus and typed input survive                                                                      |
| Credits                   | Work-level only; people matched by name, ignoring case                         | Edition credits wait for provider data in milestone 3                                              |
| Tracklists                | One textarea, one track a line: `A1 Title 4:05`                                | Quick to type and to correct; providers fill it in milestone 3                                     |
| Board game expansions     | Not in the forms yet                                                           | `expands_work_id` waits for BGG lookup in milestone 5                                              |
| Browsing by kind          | `/search?kind=book` with no words lists that kind A to Z                       | The kind counts on the home page link there; no separate browse pages                              |

The routes this milestone builds. Everything under `/manage` except the add
page answers with a fragment for htmx to swap:

| Method | Path                              | Auth      | Returns                                                            |
| ------ | --------------------------------- | --------- | ------------------------------------------------------------------ |
| GET    | `/`                               | Public    | Search box, counts by kind, recently added                         |
| GET    | `/search?q=&kind=`                | Public    | Results; only the results when htmx asks for a partial             |
| GET    | `/works/:id`                      | Public    | Work, editions, tracks and copies; editing controls when signed in |
| GET    | `/people/:id`                     | Public    | Everything credited to a person, with the role                     |
| GET    | `/manage/add?kind=`               | Signed in | Kind choice, or the add page for that kind                         |
| POST   | `/manage/works?kind=`             | Signed in | `HX-Location` to the new work, or 422 and the form                 |
| GET    | `/manage/works/:id`               | Signed in | The work card                                                      |
| GET    | `/manage/works/:id/edit`          | Signed in | The work card's form                                               |
| PUT    | `/manage/works/:id`               | Signed in | The saved work card, or 422 and the form                           |
| DELETE | `/manage/works/:id`               | Signed in | `HX-Location` to `/manage`                                         |
| GET    | `/manage/works/:id/editions`      | Signed in | Every edition card                                                 |
| GET    | `/manage/works/:id/editions/new`  | Signed in | Every edition card and a new-edition form                          |
| POST   | `/manage/works/:id/editions`      | Signed in | Every edition card, or 422 with the form                           |
| GET    | `/manage/editions/:id`            | Signed in | The edition card                                                   |
| GET    | `/manage/editions/:id/edit`       | Signed in | The edition card's form                                            |
| PUT    | `/manage/editions/:id`            | Signed in | The saved edition card, or 422 and the form                        |
| DELETE | `/manage/editions/:id`            | Signed in | Nothing; the card is removed                                       |
| GET    | `/manage/editions/:id/copies/new` | Signed in | The edition card with a new-copy form                              |
| POST   | `/manage/editions/:id/copies`     | Signed in | The edition card with the new copy, or 422 with the form           |
| GET    | `/manage/copies/:id`              | Signed in | The copy row                                                       |
| GET    | `/manage/copies/:id/edit`         | Signed in | The copy row's form                                                |
| PUT    | `/manage/copies/:id`              | Signed in | The saved copy row, or 422 and the form                            |
| DELETE | `/manage/copies/:id`              | Signed in | The edition card, one copy fewer                                   |
| GET    | `/manage/credit-row?kind=`        | Signed in | One blank credit row, for "Add a person"                           |

## Before you start

```bash
# from the repo root
git switch main && git pull
vp install
vp run ready
git switch -c shelf-0005
```

`vp run ready` should end with `vp run: … successful` and 20 tests. On the
VPN machine, keep `export NODE_OPTIONS=--use-system-ca` in `~/.zshrc`; the
VPN still blocks `*.workers.dev`, so check the deployed site from your phone
on mobile data.

## Part A: Tidy-ups from milestone 1

A review of the repository at `c000f6b` found four things worth fixing
before the catalogue builds on them. A2 and A3 would otherwise show up as
bugs in this milestone's forms.

| Stage | Problem                                                                                                                            | Effect if left                                                                                |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| A1    | `apps/web` still builds with `tsc && vp build`, and its `tsconfig.json` includes `srcipts`                                         | `vp run build` fails on a type clash that `vp check` does not report; editors skip `scripts/` |
| A2    | `Input` spreads its props after `class="input"`, so a `class` passed through `Field` replaces it                                   | The sign-in fields have lost their input styling                                              |
| A3    | `requireUser` builds `next` from the path only                                                                                     | Signing in from `/manage/add?kind=record` returns you to `/manage/add`, without the kind      |
| A4    | Documentation drift: the plan's status and CPU budget, the README's docs path, the interface guide's helper name, template READMEs | The docs describe a repository that no longer exists                                          |

### A1. Build with `vp build` only, and fix the include

Milestone 1's step A1 asked for `tsc` to come out of the build script; it is
still there. Running `tsc` in `apps/web` fails:

```
../../packages/db/src/testing.ts(6,50): error TS2345: Argument of type 'URL' is not assignable to parameter of type 'string | URL'.
```

The Workers types and `@types/node` each declare `URL`, and plain `tsc`
sees both. `vp check` type-checks with each package's own settings and
passes, and CI never runs the `build` script (it calls the built-in
`vp -C apps/web build`), so the fix is to stop running `tsc` at all.

In `apps/web/package.json`, change `"build": "tsc && vp build"` to
`"build": "vp build"`.

In `apps/web/tsconfig.json`, change the last line's `"srcipts"` to
`"scripts"`:

```json
  "include": ["src", "scripts", "worker-configuration.d.ts"]
```

`vp check` already lints `scripts/` from the root settings; the include
matters to your editor, which otherwise treats those files as outside the
project.

### A2. Keep the input's own class

`apps/web/src/components/atoms/input.tsx`:

```tsx
import type { FC, JSX } from 'hono/jsx';
import { joinClassNames } from '../join-class-names.ts';

export type InputProps = JSX.IntrinsicElements['input'];

export const Input: FC<InputProps> = ({ class: className, ...props }) => (
  <input class={joinClassNames('input', className as string | undefined)} {...props} />
);
```

`SignInForm` passes `class="sign-in-form__field"` to each `Field`, which
hands it to `Input`. Before this change the input ended up with
`class="sign-in-form__field"` alone, so `input.css` no longer matched it.
Now it gets both classes. Part D moves a field's class onto the field's
wrapper instead, but `Input` should never drop its own class either way.

### A3. Keep the query string in `next`

`packages/auth/src/middleware.ts`:

```ts
import { createMiddleware } from 'hono/factory';
import type { Db } from '@shelf/db';
import { readSessionCookie, writeSessionCookie } from './cookie.ts';
import { findSession, isStale, touchSession } from './sessions.ts';

export type SessionUser = { id: string; username: string; displayName: string };

export type AuthVariables = { db: Db; user: SessionUser | null };

export const loadUser = createMiddleware<{ Variables: AuthVariables }>(async (context, next) => {
  const token = readSessionCookie(context);
  const found = token ? await findSession(context.var.db, token) : null;
  context.set('user', found?.user ?? null);
  if (token && found && isStale(found.session.lastSeenAt, new Date())) {
    await touchSession(context.var.db, found.session.id);
    writeSessionCookie(context, token);
  }
  await next();
});

export const requireUser = createMiddleware<{ Variables: AuthVariables }>(async (context, next) => {
  if (context.var.user) return next();
  const { pathname, search } = new URL(context.req.url);
  const target = `/login?next=${encodeURIComponent(pathname + search)}`;
  if (!context.req.header('HX-Request')) return context.redirect(target, 303);
  context.header('HX-Redirect', target);

  return context.body(null, 401);
});

export const safeNext = (value: unknown, fallback = '/manage') =>
  typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : fallback;
```

`context.req.path` has no query string; the request URL has both parts.
`safeNext` already refuses anything that is not a same-site path, so the
longer value is still safe. A test in Part E checks it.

### A4. Bring the documentation up to date

Replace `README.md`:

````markdown
# Shelf

A catalogue of books, vinyl records and board games, running on Cloudflare
Workers with D1 and R2. See `docs/revival-plan.md` for the design and
`docs/milestone-guides/` for the step-by-step guides.

## Development

```bash
vp install      # dependencies
vp run dev      # the app at http://localhost:5173
vp run ready    # what CI checks: lint, types, tests, build
```

## Layout

| Path                 | Holds                                                        |
| -------------------- | ------------------------------------------------------------ |
| `apps/web`           | The Hono Worker: routes, pages, components, scripts          |
| `packages/catalogue` | Kinds, genres, formats, roles, sorting and tracklist parsing |
| `packages/db`        | Drizzle schema, migrations, catalogue queries and saves      |
| `packages/auth`      | Password hashing, sessions, throttling and middleware        |
| `infra`              | Pulumi program for D1, R2 and secret values                  |
````

Replace `apps/web/README.md`, whose title still says `@shelf/web` (the
package is `web`) and which lists scripts this milestone extends:

````markdown
# web

The Shelf Worker: Hono routes, Hono JSX pages and components, and the
scripts that support them. Pages are server-rendered; htmx 4 swaps them in
place.

## Scripts

Run from `apps/web`.

```bash
vp run vendor                                # copy fonts, Open Props and htmx into public/vendor
vp run migrate --local                       # apply migrations to the local D1
vp exec vpx ./scripts/create-user.ts --local # add a user (or --remote)
vp exec vpx ./scripts/smoke.ts               # sign-in checks against vp run dev
```

## Where things live

| Folder           | Holds                                                      |
| ---------------- | ---------------------------------------------------------- |
| `src/routes`     | Public catalogue routes, sign-in, and everything `/manage` |
| `src/pages`      | Whole pages and the form sections they share               |
| `src/components` | Atoms, molecules, organisms and the page template          |
| `src/forms`      | Field specs, Valibot schemas and form parsing              |
| `src/views`      | Database rows turned into the shapes components take       |
````

In `docs/milestone-guides/1c-interface.md`, find and replace in your
editor:

| Find             | Replace with                      | Where                                  |
| ---------------- | --------------------------------- | -------------------------------------- |
| `docs/1-auth.md` | `docs/milestone-guides/1-auth.md` | The opening paragraph                  |
| `class-names.ts` | `join-class-names.ts`             | The file tree, step C3 and two imports |
| `cx`             | `joinClassNames`                  | The helper, its comment and every call |

The repository's helper was renamed while building milestone 1; the guide
still shows the old name. Fix the helper's own comment to match, in
`apps/web/src/components/join-class-names.ts`:

```ts
// Joins class names, skipping empty ones: joinClassNames('field', props.class).
export const joinClassNames = (...names: (string | undefined)[]) => names.filter(Boolean).join(' ');
```

`AGENTS.md` holds only the Vite+ block that `vp config` writes. Add the
project's rules after the `<!--VITE PLUS END-->` line, so tools that read
it, including Claude Code, follow the same conventions:

```markdown
# Shelf conventions

Read `docs/revival-plan.md` before changing code; its Package, Code and
Interface conventions sections are the rules. In short:

- Internal packages export TypeScript source; imports use explicit `.ts`
  extensions.
- Source files stay under about 100 lines and functions around 10.
- Tests mark their Arrange, Act and Assert steps with comments.
- Every element with an `hx-` attribute spreads `useHx()` for its nonce.
- Writes go through htmx with the method that fits (`hx-post`, `hx-put`,
  `hx-delete`) and answer with the fragment that replaces their target;
  there is no fallback for browsers without JavaScript.
- British English in copy and documentation.
```

Finally, replace `docs/revival-plan.md` with the updated plan delivered
with this guide. It records milestone 1 as done with `ITERATIONS` at
50,000, settles the htmx delivery and PBKDF2 questions, replaces the routes
table with the one above, and adds the interface rule this milestone
introduces for components without their own elements.

### Checkpoint A

```bash
# from the repo root
vp install
vp run ready
```

Expect 20 tests to pass, as before. Then, with `vp run dev` running, sign
out, open <http://localhost:5173/manage/styleguide?x=1>, sign in, and check
the address bar ends `/manage/styleguide?x=1`. The sign-in fields should
also have their underline back.

```bash
# from the repo root
git add -A
git commit -m "fix: keep input classes and next queries; tidy build and docs"
```

## Part B: Vocabulary, search and the catalogue functions

Part B is all in `packages/catalogue` and `packages/db`, and every piece of
it is tested against a local D1 before any page uses it.

### B1. The shared vocabulary

`catalogue` grows from one list to the allowed values the forms offer, plus
two pure functions: sorting and tracklist parsing. The values are the ones
the plan's data model lists, stored lower-case and shown in sentence case.

`packages/catalogue/src/books.ts`:

```ts
export const BOOK_GENRES = [
  'novel',
  'graphic novel',
  'poetry',
  'short stories',
  'non-fiction',
  'anthology',
] as const;
export type BookGenre = (typeof BOOK_GENRES)[number];

export const BINDINGS = ['hardback', 'paperback', 'omnibus', 'absolute'] as const;
export type Binding = (typeof BINDINGS)[number];
```

`packages/catalogue/src/records.ts`:

```ts
// Discogs' top-level genres; finer styles such as ska go in tags.
export const RECORD_GENRES = [
  'rock',
  'electronic',
  'pop',
  'reggae',
  'funk and soul',
  'jazz',
  'hip hop',
  'folk',
  'blues',
  'classical',
  'latin',
  'stage and screen',
] as const;
export type RecordGenre = (typeof RECORD_GENRES)[number];

export const RECORD_FORMATS = [
  'LP',
  '2LP',
  '12-inch single',
  '10-inch',
  '7-inch',
  'box set',
] as const;
export type RecordFormat = (typeof RECORD_FORMATS)[number];

export const SPEEDS = [33, 45, 78] as const;
export type Speed = (typeof SPEEDS)[number];

// Goldmine grades, best first.
export const GRADES = ['M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P'] as const;
export type Grade = (typeof GRADES)[number];
```

`packages/catalogue/src/roles.ts`:

```ts
import type { Kind } from './kinds.ts';

export const ROLES = {
  book: [
    'author',
    'writer',
    'artist',
    'penciller',
    'inker',
    'colourist',
    'letterer',
    'illustrator',
    'cover artist',
    'translator',
    'editor',
  ],
  record: ['artist', 'featured artist', 'producer', 'engineer', 'composer', 'sleeve designer'],
  board_game: ['designer', 'artist', 'developer'],
} as const satisfies Record<Kind, readonly string[]>;

export type Role = (typeof ROLES)[Kind][number];
```

`packages/catalogue/src/sorting.ts`:

```ts
const ARTICLE = /^(the|a|an)\s+/i;

const tidy = (value: string) => value.trim().replace(/\s+/g, ' ');

// "The Dispossessed" sorts as "dispossessed".
export const sortTitle = (title: string) => tidy(title).replace(ARTICLE, '').toLowerCase();

// "Alan Moore" sorts as "moore, alan". A name typed with a comma keeps its own
// split, so "Le Guin, Ursula K." sorts as typed.
export const sortName = (name: string) => {
  const words = tidy(name).replace(/^the\s+/i, '');
  if (words.includes(',')) return words.toLowerCase();
  const parts = words.split(' ');
  const last = parts.pop() ?? '';
  return (parts.length ? `${last}, ${parts.join(' ')}` : last).toLowerCase();
};
```

`sort_title` and `sort_name` are derived on every save and never typed.
Names are sorted surname first by moving the last word to the front, which
is right for "Alan Moore" and wrong for "Ursula K. Le Guin" ("guin, ursula
k. le"). Type such a name with a comma, "Le Guin, Ursula K.", and it sorts as
typed; the page then also shows it that way.

`packages/catalogue/src/tracks.ts`:

```ts
export type Track = {
  side: string;
  position: number;
  title: string;
  durationSeconds: number | null;
};

export type TracklistResult = { tracks: Track[]; errors: string[] };

// "A1 Title 3:45", "B2. Title" or "3 Title"; a missing side means side A.
const LINE = /^([A-Za-z])?(\d+)[.)]?\s+(.+?)(?:\s+(\d{1,2}):([0-5]\d))?$/;

const parseLine = (line: string): Track | null => {
  const match = LINE.exec(line);
  if (!match) return null;
  const [, side = 'A', position, title, minutes, seconds] = match;
  const durationSeconds = minutes ? Number(minutes) * 60 + Number(seconds) : null;
  return { side: side.toUpperCase(), position: Number(position), title: title!, durationSeconds };
};

export const parseTracklist = (text: string): TracklistResult => {
  const result: TracklistResult = { tracks: [], errors: [] };
  text.split('\n').forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const track = parseLine(line);
    if (track) result.tracks.push(track);
    else result.errors.push(`Line ${index + 1} needs a position and a title, as in "A1 Title".`);
  });
  return result;
};

const duration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export const formatTracklist = (tracks: Track[]) =>
  tracks
    .map((track) => {
      const time = track.durationSeconds === null ? '' : ` ${duration(track.durationSeconds)}`;
      return `${track.side}${track.position} ${track.title}${time}`;
    })
    .join('\n');
```

The pattern accepts the shapes Discogs and sleeves use: `A1`, `B2.`, or a
plain number, which goes on side A as the plan says. A line it cannot read
becomes an error with its line number rather than a silently dropped track.

`packages/catalogue/src/index.ts`:

```ts
export { KINDS, type Kind } from './kinds.ts';
export { BINDINGS, BOOK_GENRES, type Binding, type BookGenre } from './books.ts';
export {
  GRADES,
  RECORD_FORMATS,
  RECORD_GENRES,
  SPEEDS,
  type Grade,
  type RecordFormat,
  type RecordGenre,
  type Speed,
} from './records.ts';
export { ROLES, type Role } from './roles.ts';
export { sortName, sortTitle } from './sorting.ts';
export { formatTracklist, parseTracklist, type Track, type TracklistResult } from './tracks.ts';
```

`catalogue` now has tests, so it needs a `test` script (milestone 0's
rule: only packages with tests get one). `packages/catalogue/package.json`:

```json
{
  "name": "@shelf/catalogue",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vp test run"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "typescript": "catalog:",
    "vite-plus": "catalog:"
  }
}
```

`packages/catalogue/tests/sorting.test.ts`:

```ts
import { describe, expect, it } from 'vite-plus/test';
import { sortName, sortTitle } from '../src/index.ts';

describe('sortTitle', () => {
  it('drops a leading article and lower-cases', () => {
    // Arrange
    const title = '  The   Dispossessed ';

    // Act
    const sorted = sortTitle(title);

    // Assert
    expect(sorted).toBe('dispossessed');
  });

  it('keeps an article that is part of a word', () => {
    // Arrange
    const title = 'Anansi Boys';

    // Act
    const sorted = sortTitle(title);

    // Assert
    expect(sorted).toBe('anansi boys');
  });
});

describe('sortName', () => {
  it('puts the last word first', () => {
    // Arrange
    const name = 'Alan Moore';

    // Act
    const sorted = sortName(name);

    // Assert
    expect(sorted).toBe('moore, alan');
  });

  it('keeps a name typed surname first', () => {
    // Arrange
    const name = 'Le Guin, Ursula K.';

    // Act
    const sorted = sortName(name);

    // Assert
    expect(sorted).toBe('le guin, ursula k.');
  });

  it('drops a leading "The" from a band', () => {
    // Arrange
    const name = 'The Specials';

    // Act
    const sorted = sortName(name);

    // Assert
    expect(sorted).toBe('specials');
  });
});
```

`packages/catalogue/tests/tracks.test.ts`:

```ts
import { describe, expect, it } from 'vite-plus/test';
import { formatTracklist, parseTracklist } from '../src/index.ts';

describe('parseTracklist', () => {
  it('splits a side and position and reads a duration', () => {
    // Arrange
    const text = 'A1 The Rainbow 9:06\nB2. Wealth';

    // Act
    const { tracks, errors } = parseTracklist(text);

    // Assert
    expect(errors).toEqual([]);
    expect(tracks).toEqual([
      { side: 'A', position: 1, title: 'The Rainbow', durationSeconds: 546 },
      { side: 'B', position: 2, title: 'Wealth', durationSeconds: null },
    ]);
  });

  it('puts a numbered-only track on side A and skips blank lines', () => {
    // Arrange
    const text = '\n3 Inheritance\n\n';

    // Act
    const { tracks } = parseTracklist(text);

    // Assert
    expect(tracks).toEqual([
      { side: 'A', position: 3, title: 'Inheritance', durationSeconds: null },
    ]);
  });

  it('reports a line without a position', () => {
    // Arrange
    const text = 'A1 Desire\nI Believe in You';

    // Act
    const { errors } = parseTracklist(text);

    // Assert
    expect(errors).toEqual(['Line 2 needs a position and a title, as in "A1 Title".']);
  });
});

describe('formatTracklist', () => {
  it('writes tracks back in the form they are typed', () => {
    // Arrange
    const text = 'A1 The Rainbow 9:06\nB2 Wealth';

    // Act
    const formatted = formatTracklist(parseTracklist(text).tracks);

    // Assert
    expect(formatted).toBe(text);
  });
});
```

`packages/catalogue/README.md`:

````markdown
# @shelf/catalogue

The shared vocabulary of Shelf: kinds, genres, formats, grades and roles,
plus title and name sorting and tracklist parsing. Internal to the
monorepo; exported as TypeScript source and never built.

```bash
vp run test   # unit tests; no database needed
```
````

```bash
# from packages/catalogue
vp run test
```

Expect 9 tests to pass in under a second; these need no database.

### B2. The search migration

```bash
# from packages/db
vp run db:generate --custom --name=search
```

drizzle-kit prints `Prepared empty file for your custom SQL migration!` and
creates `migrations/0001_search.sql`, a snapshot and a journal entry.
Replace the placeholder comment with the table.

`packages/db/migrations/0001_search.sql`:

```sql
-- Full-text search: one row per work, rebuilt by reindexWork() on every save.
-- Hand-written because drizzle-kit cannot model virtual tables.
CREATE VIRTUAL TABLE `search` USING fts5(
  work_id UNINDEXED,
  title,
  people,
  tags,
  tokenize = 'unicode61 remove_diacritics 2',
  prefix = '2 3'
);
```

The table holds one row per work: its title and subtitle, the names of
everyone credited and its tags. `remove_diacritics 2` lets "Bronte" find
"Brontë"; `prefix = '2 3'` keeps two- and three-letter prefix indexes so
searching as you type stays quick.

Because the schema snapshot never sees this table, a later
`db:generate` will not try to drop it. `vp check` reformats the new
snapshot and journal on commit; that is expected.

### B3. Three small helpers

Writes in this milestone are lists of statements run as one D1 batch, so
a save either lands whole or not at all.

`packages/db/src/catalogue/batch.ts`:

```ts
import type { BatchItem } from 'drizzle-orm/batch';
import type { Db } from '../client.ts';

export type Statement = BatchItem<'sqlite'>;

// D1 runs a batch as one transaction: every statement lands, or none do.
export const runBatch = async (db: Db, statements: Statement[]) => {
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);
};
```

`packages/db/src/catalogue/nested.ts`:

```ts
import { sql, type SQL } from 'drizzle-orm';

// In a select from one table, Drizzle drops table names from columns written
// directly in its fields, so `people.id = credits.person_id` would become an
// ambiguous `id = person_id`. A fragment nested one level down keeps them.
export const nested = <T>(fragment: SQL) => sql<T>`${fragment}`;
```

This one works around a Drizzle behaviour the tests caught. In a
`select` from one table, Drizzle writes the columns inside a `sql` field
without their table names. A correlated subquery such as "the first person
credited on this work" mentions `people.id` and `credits.person_id`; without
table names it becomes `id = person_id`, and D1 refuses it:

```
D1_ERROR: ambiguous column name: id: SQLITE_ERROR
```

A fragment nested one level down is written in full, so every subquery is
wrapped in `nested()`. The summary and search tests fail without it.

`packages/db/src/catalogue/types.ts`:

```ts
import type { Kind } from '@shelf/catalogue';
import type { copies } from '../schema/copies.ts';
import type { editions } from '../schema/editions.ts';
import type { bookEditions } from '../schema/kinds/books.ts';
import type { gameCopies, gameEditions } from '../schema/kinds/games.ts';
import type { recordCopies, recordEditions, tracks } from '../schema/kinds/records.ts';

type Fields<Table extends { $inferInsert: object }, Key extends string> = Omit<
  Table['$inferInsert'],
  Key | 'createdAt' | 'updatedAt'
>;

export type CreditInput = { name: string; role: string };

export type WorkInput = {
  title: string;
  subtitle: string | null;
  firstYear: number | null;
  description: string | null;
  credits: CreditInput[];
  tags: string[];
};

export type TrackInput = Fields<typeof tracks, 'id' | 'editionId'>;

export type EditionDetails =
  | { kind: 'book'; values: Fields<typeof bookEditions, 'editionId'> }
  | { kind: 'record'; values: Fields<typeof recordEditions, 'editionId'>; tracks: TrackInput[] }
  | { kind: 'board_game'; values: Fields<typeof gameEditions, 'editionId'> };

// What a person can edit; where the edition came from is set once, when it is added.
export type EditionInput = Fields<
  typeof editions,
  'id' | 'workId' | 'coverKey' | 'source' | 'sourceRef'
> & {
  details: EditionDetails;
};

export type NewEdition = EditionInput & { source: string; sourceRef: string | null };

export type CopyDetails =
  | { kind: 'book' }
  | { kind: 'record'; values: Fields<typeof recordCopies, 'copyId'> }
  | { kind: 'board_game'; values: Fields<typeof gameCopies, 'copyId'> };

export type CopyInput = Fields<typeof copies, 'id' | 'editionId'> & { details: CopyDetails };

export type NewWork = { kind: Kind; work: WorkInput; edition: NewEdition; copy: CopyInput };
```

The input types are derived from the Drizzle tables, so a column added to
`book_editions` appears here without a second edit. An edition's `source`
is kept out of `EditionInput`: it is set when the edition is added
(`NewEdition`) and an edit never overwrites it, which matters once
milestone 3 records which provider an edition came from.

### B4. The search index

`packages/db/src/catalogue/search-index.ts`:

```ts
import { eq, sql } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { Db } from '../client.ts';
import { credits } from '../schema/credits.ts';
import { people } from '../schema/people.ts';
import { tags } from '../schema/tags.ts';
import { workTags } from '../schema/work-tags.ts';
import { works } from '../schema/works.ts';
import type { Statement } from './batch.ts';
import { nested } from './nested.ts';

// The FTS5 table from migration 0001, kept out of src/schema so drizzle-kit never
// sees it. FTS5's hidden `rank` column is left out: inserting into it changes settings.
export const searchIndex = sqliteTable('search', {
  workId: text().notNull(),
  title: text().notNull(),
  people: text().notNull(),
  tags: text().notNull(),
});

const namesOf = (workId: string) =>
  nested<string>(sql`coalesce((select group_concat(${people.name}, ' ') from ${credits}
    join ${people} on ${people.id} = ${credits.personId}
    where ${credits.workId} = ${workId}), '')`);

const tagsOf = (workId: string) =>
  nested<string>(sql`coalesce((select group_concat(${tags.name}, ' ') from ${workTags}
    join ${tags} on ${tags.id} = ${workTags.tagId}
    where ${workTags.workId} = ${workId}), '')`);

const titleOf = sql<string>`${works.title} || ' ' || coalesce(${works.subtitle}, '')`;

// Rebuilds one work's row from the tables; put it last in the batch that changed them.
export const reindexWork = (db: Db, workId: string): Statement[] => [
  db.delete(searchIndex).where(eq(searchIndex.workId, workId)),
  db.insert(searchIndex).select(
    db
      .select({
        workId: works.id,
        title: titleOf.as('title'),
        people: namesOf(workId).as('people'),
        tags: tagsOf(workId).as('tags'),
      })
      .from(works)
      .where(eq(works.id, workId)),
  ),
];

// "le guin" becomes "le"* "guin"*: every word must match, as a prefix.
export const toMatchQuery = (input: string) =>
  input
    .replace(/["*^:()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `"${word}"*`)
    .join(' ');
```

Three choices here are deliberate:

- The `search` table is declared for queries outside `src/schema`, so
  drizzle-kit never generates SQL for it.
- FTS5's hidden `rank` column is not declared. FTS5 treats an insert that
  names `rank` as a configuration command, so leaving it out means it can
  never be written by accident; queries order by ``sql`rank` `` instead.
- `reindexWork` rebuilds the row with `insert … select` from the tables,
  inside the same batch as the save. Statements in a D1 batch run in order,
  so it sees the credits and tags the earlier statements wrote.

`toMatchQuery` strips FTS5's operators and quotes each word, so whatever is
typed can never be a syntax error, and adds `*` so every word matches as a
prefix.

### B5. Saving works, editions and copies

`packages/db/src/catalogue/people.ts`:

```ts
import { sortName } from '@shelf/catalogue';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { credits } from '../schema/credits.ts';
import { people } from '../schema/people.ts';
import type { Statement } from './batch.ts';
import type { CreditInput } from './types.ts';

const key = (name: string) => name.trim().toLowerCase();

type Person = { id: string; name: string; sortName: string };

// Gives every name not already in `ids` a new person row.
const planPeople = (names: string[], ids: Map<string, string>) => {
  const rows: Person[] = [];
  for (const name of names) {
    if (ids.has(key(name))) continue;
    const id = crypto.randomUUID();
    ids.set(key(name), id);
    rows.push({ id, name, sortName: sortName(name) });
  }
  return rows;
};

// Reuses a person with the same name, ignoring case.
const resolvePeople = async (db: Db, names: string[]) => {
  const keys = [...new Set(names.map(key))];
  const lowerName = sql<string>`lower(${people.name})`;
  const found = keys.length
    ? await db
        .select({ id: people.id, key: lowerName })
        .from(people)
        .where(inArray(lowerName, keys))
    : [];
  const ids = new Map(found.map((person) => [person.key, person.id]));
  return { ids, rows: planPeople(names, ids) };
};

// Replaces a work's own credits (edition credits are left alone).
export const creditStatements = async (db: Db, workId: string, input: CreditInput[]) => {
  const { ids, rows } = await resolvePeople(
    db,
    input.map((credit) => credit.name),
  );
  const statements: Statement[] = [
    db.delete(credits).where(and(eq(credits.workId, workId), isNull(credits.editionId))),
  ];
  if (rows.length) statements.push(db.insert(people).values(rows));
  const values = input.map((credit, position) => ({
    workId,
    personId: ids.get(key(credit.name))!,
    role: credit.role,
    position,
  }));
  if (values.length) statements.push(db.insert(credits).values(values).onConflictDoNothing());
  return statements;
};
```

People are matched on their name, ignoring case, and created when new.
Names stay non-unique in the table, as the plan says; this lookup just
reuses the first match. Credits are replaced wholesale on each save, which
is simpler than diffing and costs nothing at catalogue scale.

`packages/db/src/catalogue/tags.ts`:

```ts
import { eq, inArray } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { tags } from '../schema/tags.ts';
import { workTags } from '../schema/work-tags.ts';
import type { Statement } from './batch.ts';

// Replaces a work's tags, creating any tag names not seen before.
export const tagStatements = async (db: Db, workId: string, names: string[]) => {
  const found = names.length ? await db.select().from(tags).where(inArray(tags.name, names)) : [];
  const ids = new Map(found.map((tag) => [tag.name, tag.id]));
  const rows = names
    .filter((name) => !ids.has(name))
    .map((name) => ({ id: crypto.randomUUID(), name }));
  rows.forEach((row) => ids.set(row.name, row.id));
  const statements: Statement[] = [db.delete(workTags).where(eq(workTags.workId, workId))];
  if (rows.length) statements.push(db.insert(tags).values(rows));
  const links = names.map((name) => ({ workId, tagId: ids.get(name)! }));
  if (links.length) statements.push(db.insert(workTags).values(links));
  return statements;
};
```

`packages/db/src/catalogue/details.ts`:

```ts
import { eq } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { bookEditions } from '../schema/kinds/books.ts';
import { gameCopies, gameEditions } from '../schema/kinds/games.ts';
import { recordCopies, recordEditions, tracks } from '../schema/kinds/records.ts';
import type { Statement } from './batch.ts';
import type { CopyDetails, EditionDetails } from './types.ts';

const recordStatements = (
  db: Db,
  editionId: string,
  details: EditionDetails & { kind: 'record' },
) => {
  const statements: Statement[] = [
    db.delete(recordEditions).where(eq(recordEditions.editionId, editionId)),
    db.insert(recordEditions).values({ ...details.values, editionId }),
    db.delete(tracks).where(eq(tracks.editionId, editionId)),
  ];
  const rows = details.tracks.map((track) => ({ ...track, editionId }));
  if (rows.length) statements.push(db.insert(tracks).values(rows));
  return statements;
};

// Replaces an edition's detail row (and, for records, its tracklist).
export const editionDetailStatements = (
  db: Db,
  editionId: string,
  details: EditionDetails,
): Statement[] => {
  if (details.kind === 'record') return recordStatements(db, editionId, details);
  const table = details.kind === 'book' ? bookEditions : gameEditions;
  return [
    db.delete(table).where(eq(table.editionId, editionId)),
    details.kind === 'book'
      ? db.insert(bookEditions).values({ ...details.values, editionId })
      : db.insert(gameEditions).values({ ...details.values, editionId }),
  ];
};

// Replaces a copy's detail row; books have none.
export const copyDetailStatements = (db: Db, copyId: string, details: CopyDetails): Statement[] => {
  if (details.kind === 'book') return [];
  if (details.kind === 'record') {
    return [
      db.delete(recordCopies).where(eq(recordCopies.copyId, copyId)),
      db.insert(recordCopies).values({ ...details.values, copyId }),
    ];
  }
  return [
    db.delete(gameCopies).where(eq(gameCopies.copyId, copyId)),
    db.insert(gameCopies).values({ ...details.values, copyId }),
  ];
};
```

A work's kind never changes, so an edition has exactly one kind of detail
row; replacing it is a delete and an insert.

`packages/db/src/catalogue/create-work.ts`:

```ts
import type { Db } from '../client.ts';
import { copies } from '../schema/copies.ts';
import { editions } from '../schema/editions.ts';
import { works } from '../schema/works.ts';
import { sortTitle } from '@shelf/catalogue';
import { runBatch, type Statement } from './batch.ts';
import { copyDetailStatements, editionDetailStatements } from './details.ts';
import { creditStatements } from './people.ts';
import { reindexWork } from './search-index.ts';
import { tagStatements } from './tags.ts';
import type { CopyInput, NewEdition, NewWork, WorkInput } from './types.ts';

export const workRow = ({ title, subtitle, firstYear, description }: WorkInput) => ({
  title,
  subtitle,
  firstYear,
  description,
  sortTitle: sortTitle(title),
});

// The statements that add an edition and its first copy to an existing work.
export const editionStatements = (
  db: Db,
  workId: string,
  { details, ...edition }: NewEdition,
  { details: copyDetails, ...copy }: CopyInput,
): Statement[] => {
  const editionId = crypto.randomUUID();
  const copyId = crypto.randomUUID();
  return [
    db.insert(editions).values({ ...edition, id: editionId, workId }),
    ...editionDetailStatements(db, editionId, details),
    db.insert(copies).values({ ...copy, id: copyId, editionId }),
    ...copyDetailStatements(db, copyId, copyDetails),
  ];
};

// Saves a work, its first edition and first copy as one transaction; returns the work id.
export const createWork = async (db: Db, { kind, work, edition, copy }: NewWork) => {
  const id = crypto.randomUUID();
  await runBatch(db, [
    db.insert(works).values({ ...workRow(work), id, kind }),
    ...(await creditStatements(db, id, work.credits)),
    ...(await tagStatements(db, id, work.tags)),
    ...editionStatements(db, id, edition, copy),
    ...reindexWork(db, id),
  ]);
  return id;
};
```

Ids are generated in code before the batch, so the edition can name its
work and the copy its edition without reading anything back.

`packages/db/src/catalogue/update-work.ts`:

```ts
import { eq, inArray } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { copies } from '../schema/copies.ts';
import { editions } from '../schema/editions.ts';
import { works } from '../schema/works.ts';
import { runBatch } from './batch.ts';
import { workRow } from './create-work.ts';
import { creditStatements } from './people.ts';
import { reindexWork, searchIndex } from './search-index.ts';
import { tagStatements } from './tags.ts';
import type { WorkInput } from './types.ts';

export const updateWork = async (db: Db, id: string, work: WorkInput) =>
  runBatch(db, [
    db.update(works).set(workRow(work)).where(eq(works.id, id)),
    ...(await creditStatements(db, id, work.credits)),
    ...(await tagStatements(db, id, work.tags)),
    ...reindexWork(db, id),
  ]);

const editionIds = (db: Db, workId: string) =>
  db.select({ id: editions.id }).from(editions).where(eq(editions.workId, workId));

// Copies, then editions, then the work: the order the restrict rules demand.
export const deleteWork = async (db: Db, id: string) =>
  runBatch(db, [
    db.delete(copies).where(inArray(copies.editionId, editionIds(db, id))),
    db.delete(editions).where(eq(editions.workId, id)),
    db.delete(works).where(eq(works.id, id)),
    db.delete(searchIndex).where(eq(searchIndex.workId, id)),
  ]);
```

`deleteWork` deletes in the order the restrict rules demand: copies, then
editions, then the work. Loans, details, tracks, credits and tag links
cascade.

`packages/db/src/catalogue/editions.ts`:

```ts
import { eq } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { copies } from '../schema/copies.ts';
import { editions } from '../schema/editions.ts';
import { runBatch } from './batch.ts';
import { editionStatements } from './create-work.ts';
import { editionDetailStatements } from './details.ts';
import type { CopyInput, EditionInput, NewEdition } from './types.ts';

export const addEdition = (db: Db, workId: string, edition: NewEdition, copy: CopyInput) =>
  runBatch(db, editionStatements(db, workId, edition, copy));

export const updateEdition = (db: Db, id: string, { details, ...edition }: EditionInput) =>
  runBatch(db, [
    db.update(editions).set(edition).where(eq(editions.id, id)),
    ...editionDetailStatements(db, id, details),
  ]);

// Its copies go first; details, tracks and edition credits cascade.
export const deleteEdition = (db: Db, id: string) =>
  runBatch(db, [
    db.delete(copies).where(eq(copies.editionId, id)),
    db.delete(editions).where(eq(editions.id, id)),
  ]);
```

`packages/db/src/catalogue/copies.ts`:

```ts
import { eq } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { copies } from '../schema/copies.ts';
import { runBatch } from './batch.ts';
import { copyDetailStatements } from './details.ts';
import type { CopyInput } from './types.ts';

export const addCopy = async (db: Db, editionId: string, { details, ...copy }: CopyInput) => {
  const id = crypto.randomUUID();
  await runBatch(db, [
    db.insert(copies).values({ ...copy, id, editionId }),
    ...copyDetailStatements(db, id, details),
  ]);
  return id;
};

export const updateCopy = (db: Db, id: string, { details, ...copy }: CopyInput) =>
  runBatch(db, [
    db.update(copies).set(copy).where(eq(copies.id, id)),
    ...copyDetailStatements(db, id, details),
  ]);

export const deleteCopy = (db: Db, id: string) => db.delete(copies).where(eq(copies.id, id));
```

### B6. Reading the catalogue

`packages/db/src/catalogue/summaries.ts`:

```ts
import { KINDS, type Kind } from '@shelf/catalogue';
import { count, desc, sql } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { nested } from './nested.ts';
import { copies } from '../schema/copies.ts';
import { credits } from '../schema/credits.ts';
import { editions } from '../schema/editions.ts';
import { people } from '../schema/people.ts';
import { works } from '../schema/works.ts';

const firstEdition = (column: typeof editions.publisher | typeof editions.year) =>
  sql`(select ${column} from ${editions} where ${editions.workId} = ${works.id}
    order by ${editions.createdAt} limit 1)`;

// One row per work, with the first-credited person and the first edition's imprint.
export const summaryFields = {
  id: works.id,
  kind: works.kind,
  title: works.title,
  creator: nested<string | null>(sql`(select ${people.name} from ${credits}
    join ${people} on ${people.id} = ${credits.personId}
    where ${credits.workId} = ${works.id} order by ${credits.position} limit 1)`),
  publisher: nested<string | null>(firstEdition(editions.publisher)),
  year: nested<number | null>(sql`coalesce(${works.firstYear}, ${firstEdition(editions.year)})`),
  copies: nested<number>(sql`(select count(*) from ${copies}
    join ${editions} on ${editions.id} = ${copies.editionId}
    where ${editions.workId} = ${works.id})`),
};

export type WorkSummary = {
  id: string;
  kind: Kind;
  title: string;
  creator: string | null;
  publisher: string | null;
  year: number | null;
  copies: number;
};

export const listRecent = (db: Db, limit = 12): Promise<WorkSummary[]> =>
  db.select(summaryFields).from(works).orderBy(desc(works.createdAt)).limit(limit);

export const countByKind = async (db: Db) => {
  const rows = await db
    .select({ kind: works.kind, total: count() })
    .from(works)
    .groupBy(works.kind);
  const totals = Object.fromEntries(KINDS.map((kind) => [kind, 0])) as Record<Kind, number>;
  for (const row of rows) totals[row.kind] = row.total;
  return totals;
};
```

One query gives every card on the home and search pages its creator,
imprint and copy count, through subqueries rather than joins, so a work
with three editions is still one row.

`packages/db/src/catalogue/search.ts`:

```ts
import type { Kind } from '@shelf/catalogue';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { works } from '../schema/works.ts';
import { searchIndex, toMatchQuery } from './search-index.ts';
import { summaryFields, type WorkSummary } from './summaries.ts';

export type SearchQuery = { text: string; kind?: Kind };

// Every work of one kind, A to Z: what a search with only a kind chosen shows.
const browseKind = (db: Db, kind: Kind) =>
  db
    .select(summaryFields)
    .from(works)
    .where(eq(works.kind, kind))
    .orderBy(asc(works.sortTitle))
    .limit(200);

// Best matches first. With no words, a chosen kind is listed A to Z; otherwise nothing.
export const searchWorks = async (db: Db, { text, kind }: SearchQuery): Promise<WorkSummary[]> => {
  const match = toMatchQuery(text);
  if (!match) return kind ? browseKind(db, kind) : [];
  return db
    .select(summaryFields)
    .from(searchIndex)
    .innerJoin(works, eq(works.id, searchIndex.workId))
    .where(and(sql`${searchIndex} match ${match}`, kind ? eq(works.kind, kind) : undefined))
    .orderBy(sql`rank`)
    .limit(50);
};
```

`packages/db/src/catalogue/edition.ts`:

```ts
import { asc, eq, inArray, type SQL } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { copies } from '../schema/copies.ts';
import { editions } from '../schema/editions.ts';
import { bookEditions } from '../schema/kinds/books.ts';
import { gameCopies, gameEditions } from '../schema/kinds/games.ts';
import { recordCopies, recordEditions, tracks } from '../schema/kinds/records.ts';
import { works } from '../schema/works.ts';

const editionRows = (db: Db, where: SQL) =>
  db
    .select({
      edition: editions,
      kind: works.kind,
      book: bookEditions,
      record: recordEditions,
      game: gameEditions,
    })
    .from(editions)
    .innerJoin(works, eq(works.id, editions.workId))
    .leftJoin(bookEditions, eq(bookEditions.editionId, editions.id))
    .leftJoin(recordEditions, eq(recordEditions.editionId, editions.id))
    .leftJoin(gameEditions, eq(gameEditions.editionId, editions.id))
    .where(where)
    .orderBy(asc(editions.createdAt));

const trackRows = (db: Db, editionIds: string[]) =>
  editionIds.length
    ? db
        .select()
        .from(tracks)
        .where(inArray(tracks.editionId, editionIds))
        .orderBy(asc(tracks.side), asc(tracks.position))
    : Promise.resolve([]);

// Editions with whichever detail row they have (the other two are null) and their tracks.
export const readEditions = async (db: Db, where: SQL) => {
  const rows = await editionRows(db, where);
  const tracked = await trackRows(
    db,
    rows.map((row) => row.edition.id),
  );
  return rows.map(({ edition, ...rest }) => ({
    ...edition,
    ...rest,
    tracks: tracked.filter((track) => track.editionId === edition.id),
  }));
};

export const readCopies = (db: Db, where: SQL) =>
  db
    .select({ copy: copies, record: recordCopies, game: gameCopies })
    .from(copies)
    .leftJoin(recordCopies, eq(recordCopies.copyId, copies.id))
    .leftJoin(gameCopies, eq(gameCopies.copyId, copies.id))
    .where(where)
    .orderBy(asc(copies.createdAt))
    .then((rows) => rows.map(({ copy, ...rest }) => ({ ...copy, ...rest })));

export const getEdition = async (db: Db, id: string) =>
  (await readEditions(db, eq(editions.id, id)))[0] ?? null;

// A copy with its details and the kind and work it belongs to.
export const getCopy = async (db: Db, id: string) => {
  const [copy] = await readCopies(db, eq(copies.id, id));
  if (!copy) return null;
  const [owner] = await db
    .select({ workId: works.id, kind: works.kind, title: works.title })
    .from(editions)
    .innerJoin(works, eq(works.id, editions.workId))
    .where(eq(editions.id, copy.editionId));
  return { ...copy, ...owner! };
};

export type EditionDetail = NonNullable<Awaited<ReturnType<typeof getEdition>>>;
export type CopyDetail = NonNullable<Awaited<ReturnType<typeof getCopy>>>;
```

Left joins on all three detail tables return the one that exists and
`null` for the other two, so the pages can test `edition.book` and so on.

`packages/db/src/catalogue/work.ts`:

```ts
import { asc, eq, inArray } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { copies } from '../schema/copies.ts';
import { credits } from '../schema/credits.ts';
import { editions } from '../schema/editions.ts';
import { people } from '../schema/people.ts';
import { tags } from '../schema/tags.ts';
import { workTags } from '../schema/work-tags.ts';
import { works } from '../schema/works.ts';
import { readCopies, readEditions } from './edition.ts';

const readCredits = (db: Db, workId: string) =>
  db
    .select({
      personId: people.id,
      name: people.name,
      role: credits.role,
      editionId: credits.editionId,
    })
    .from(credits)
    .innerJoin(people, eq(people.id, credits.personId))
    .where(eq(credits.workId, workId))
    .orderBy(asc(credits.position));

const readTags = (db: Db, workId: string) =>
  db
    .select({ name: tags.name })
    .from(workTags)
    .innerJoin(tags, eq(tags.id, workTags.tagId))
    .where(eq(workTags.workId, workId))
    .orderBy(asc(tags.name));

// A work with its credits, tags, editions (with details) and copies, or null.
export const getWork = async (db: Db, id: string) => {
  const [work] = await db.select().from(works).where(eq(works.id, id));
  if (!work) return null;
  const [credited, tagged, editionRows] = await Promise.all([
    readCredits(db, id),
    readTags(db, id),
    readEditions(db, eq(editions.workId, id)),
  ]);
  const copyRows = await readCopies(
    db,
    inArray(
      copies.editionId,
      editionRows.map((e) => e.id),
    ),
  );
  const withCopies = editionRows.map((edition) => ({
    ...edition,
    copies: copyRows.filter((copy) => copy.editionId === edition.id),
  }));
  return { ...work, credits: credited, tags: tagged.map((tag) => tag.name), editions: withCopies };
};

export type WorkDetail = NonNullable<Awaited<ReturnType<typeof getWork>>>;
```

`packages/db/src/catalogue/person.ts`:

```ts
import { asc, eq } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { credits } from '../schema/credits.ts';
import { people } from '../schema/people.ts';
import { works } from '../schema/works.ts';
import { summaryFields } from './summaries.ts';

// A person and every work credited to them, with the role, A to Z by title.
export const getPerson = async (db: Db, id: string) => {
  const [person] = await db.select().from(people).where(eq(people.id, id));
  if (!person) return null;
  const credited = await db
    .selectDistinct({ ...summaryFields, role: credits.role })
    .from(credits)
    .innerJoin(works, eq(works.id, credits.workId))
    .where(eq(credits.personId, id))
    .orderBy(asc(works.sortTitle), asc(credits.role));
  return { ...person, works: credited };
};

export type PersonDetail = NonNullable<Awaited<ReturnType<typeof getPerson>>>;
```

`packages/db/src/catalogue/index.ts`:

```ts
export { addCopy, deleteCopy, updateCopy } from './copies.ts';
export { createWork } from './create-work.ts';
export { getCopy, getEdition, type CopyDetail, type EditionDetail } from './edition.ts';
export { addEdition, deleteEdition, updateEdition } from './editions.ts';
export { getPerson, type PersonDetail } from './person.ts';
export { searchWorks, type SearchQuery } from './search.ts';
export { reindexWork, toMatchQuery } from './search-index.ts';
export { countByKind, listRecent, type WorkSummary } from './summaries.ts';
export type * from './types.ts';
export { deleteWork, updateWork } from './update-work.ts';
export { getWork, type WorkDetail } from './work.ts';
```

`packages/db/src/index.ts`:

```ts
export * from './schema/index.ts';
export * from './client.ts';
export * from './catalogue/index.ts';
```

### B7. Sample works and tests

The web app's tests need the same sample works, so they live in `src` and
leave through the `@shelf/db/testing` entry.

`packages/db/src/fixtures.ts`:

```ts
// Sample works for tests in this package and the web app.
import type { CopyInput, NewEdition, NewWork } from './index.ts';

const copy: CopyInput = {
  condition: 'Good',
  location: 'Second shelf',
  acquiredOn: null,
  acquiredFrom: null,
  notes: null,
  details: { kind: 'book' },
};

export const bookEdition = (overrides: Partial<NewEdition> = {}): NewEdition => ({
  publisher: 'DC Comics',
  year: 1987,
  barcode: null,
  source: 'manual',
  sourceRef: null,
  details: {
    kind: 'book',
    values: { isbn13: '9780930289232', genre: 'graphic novel', binding: 'paperback' },
  },
  ...overrides,
});

export const watchmen = (): NewWork => ({
  kind: 'book',
  work: {
    title: 'Watchmen',
    subtitle: null,
    firstYear: 1986,
    description: null,
    credits: [
      { name: 'Alan Moore', role: 'writer' },
      { name: 'Dave Gibbons', role: 'artist' },
    ],
    tags: ['superheroes', 'dc'],
  },
  edition: bookEdition(),
  copy,
});

export const spiritOfEden = (): NewWork => ({
  kind: 'record',
  work: {
    title: 'Spirit of Eden',
    subtitle: null,
    firstYear: 1988,
    description: null,
    credits: [{ name: 'Talk Talk', role: 'artist' }],
    tags: ['art rock'],
  },
  edition: {
    publisher: 'Parlophone',
    year: 1988,
    barcode: null,
    source: 'manual',
    sourceRef: null,
    details: {
      kind: 'record',
      values: { format: 'LP', genre: 'rock' },
      tracks: [{ side: 'A', position: 1, title: 'The Rainbow', durationSeconds: 546 }],
    },
  },
  copy: { ...copy, details: { kind: 'record', values: { mediaGrade: 'VG+', sleeveGrade: 'VG' } } },
});
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

export { spiritOfEden, watchmen } from './fixtures.ts';
```

`packages/db/tests/catalogue.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { countByKind, createWork, getWork, listRecent, people, updateWork } from '../src/index.ts';
import { createTestDb, spiritOfEden, watchmen } from '../src/testing.ts';

type TestDB = Awaited<ReturnType<typeof createTestDb>>;

describe('saving a work', () => {
  let test: TestDB;

  beforeEach(async () => {
    test = await createTestDb();
  });

  afterEach(async () => {
    await test.dispose();
  });

  it('saves the work, its credits, tags, edition, details and copy together', async () => {
    // Arrange
    const input = spiritOfEden();

    // Act
    const work = await getWork(test.db, await createWork(test.db, input));

    // Assert
    expect(work?.credits.map((credit) => credit.name)).toEqual(['Talk Talk']);
    expect(work?.tags).toEqual(['art rock']);
    expect(work?.editions[0]?.record?.format).toBe('LP');
    expect(work?.editions[0]?.tracks[0]?.title).toBe('The Rainbow');
    expect(work?.editions[0]?.copies[0]?.record?.mediaGrade).toBe('VG+');
  });

  it('reuses a person whose name differs only in case', async () => {
    // Arrange
    await createWork(test.db, watchmen());
    const vendetta = watchmen();
    vendetta.work = {
      ...vendetta.work,
      title: 'V for Vendetta',
      credits: [{ name: 'alan moore', role: 'writer' }],
    };

    // Act
    await createWork(test.db, vendetta);

    // Assert
    expect(await test.db.select().from(people)).toHaveLength(2);
  });

  it('replaces credits and tags on update', async () => {
    // Arrange
    const id = await createWork(test.db, watchmen());
    const work = {
      ...watchmen().work,
      credits: [{ name: 'Alan Moore', role: 'writer' }],
      tags: [],
    };

    // Act
    await updateWork(test.db, id, work);

    // Assert
    const saved = await getWork(test.db, id);
    expect(saved?.credits).toHaveLength(1);
    expect(saved?.tags).toEqual([]);
  });

  it('lists recent works with their first creator and copy count', async () => {
    // Arrange
    await createWork(test.db, watchmen());

    // Act
    const [summary] = await listRecent(test.db);

    // Assert
    expect(summary).toMatchObject({
      title: 'Watchmen',
      creator: 'Alan Moore',
      publisher: 'DC Comics',
      year: 1986,
      copies: 1,
    });
  });

  it('counts works by kind', async () => {
    // Arrange
    await createWork(test.db, watchmen());
    await createWork(test.db, spiritOfEden());

    // Act
    const counts = await countByKind(test.db);

    // Assert
    expect(counts).toEqual({ book: 1, record: 1, board_game: 0 });
  });
});
```

`packages/db/tests/search.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { createWork, deleteWork, searchWorks, toMatchQuery, updateWork } from '../src/index.ts';
import { createTestDb, spiritOfEden, watchmen } from '../src/testing.ts';

type TestDB = Awaited<ReturnType<typeof createTestDb>>;

const titles = async (test: TestDB, text: string, kind?: 'book' | 'record') =>
  (await searchWorks(test.db, { text, kind })).map((work) => work.title);

describe('search', () => {
  let test: TestDB;

  beforeEach(async () => {
    test = await createTestDb();
  });

  afterEach(async () => {
    await test.dispose();
  });

  it('finds a work by a prefix of a credited name', async () => {
    // Arrange
    await createWork(test.db, watchmen());

    // Act
    const found = await titles(test, 'gibb');

    // Assert
    expect(found).toEqual(['Watchmen']);
  });

  it('finds a work by tag and filters by kind', async () => {
    // Arrange
    await createWork(test.db, watchmen());
    await createWork(test.db, spiritOfEden());

    // Act
    const found = await titles(test, 'rock', 'book');

    // Assert
    expect(found).toEqual([]);
    expect(await titles(test, 'rock')).toEqual(['Spirit of Eden']);
  });

  it('follows a renamed title', async () => {
    // Arrange
    const id = await createWork(test.db, watchmen());

    // Act
    await updateWork(test.db, id, { ...watchmen().work, title: 'Before Watchmen' });

    // Assert
    expect(await titles(test, 'before')).toEqual(['Before Watchmen']);
  });

  it('forgets a deleted work', async () => {
    // Arrange
    const id = await createWork(test.db, watchmen());

    // Act
    await deleteWork(test.db, id);

    // Assert
    expect(await titles(test, 'watchmen')).toEqual([]);
  });

  it('turns typed text into quoted prefix terms', () => {
    // Arrange
    const input = 'le "guin" (dispossessed)';

    // Act
    const query = toMatchQuery(input);

    // Assert
    expect(query).toBe('"le"* "guin"* "dispossessed"*');
  });
});
```

`packages/db/README.md`:

````markdown
# @shelf/db

The Drizzle schema, migrations and D1 client for Shelf, and the catalogue
functions the app calls: `createWork`, `updateWork`, `getWork`,
`searchWorks` and the rest in `src/catalogue/`.

```bash
vp run db:generate   # write a migration after changing src/schema
vp run test          # schema, catalogue and search tests against a local D1
```

Migration `0001_search.sql` is hand-written: drizzle-kit cannot model the
FTS5 `search` table, so it is defined for queries in
`src/catalogue/search-index.ts`, outside `src/schema`.
````

### Checkpoint B

```bash
# from the repo root
vp check --fix
vp run -r test
```

Expect `vp check` to pass and 9, 10 and 11 tests in `catalogue`, `auth`
and `db`. The `db` files take two to three seconds each to start, as
before. If `search.test.ts` fails with `ambiguous column name`, a subquery
is missing its `nested()` wrapper (B3). If it fails with
`no such table: search`, the migration file is still empty (B2).

```bash
# from the repo root
git add -A
git commit -m "feat(db): catalogue saves, reads and FTS5 search"
```

## Part C: htmx under the Content Security Policy

The CSP from milestone 1 only runs scripts that carry the response's nonce.
htmx 4's `hx-csp` extension goes further: it strips every `hx-` attribute
from any element whose `hx-nonce` does not match the page's nonce, so
markup injected through a stored title could never fire a request. That
means every element with an `hx-` attribute must carry the nonce, and
fragments htmx fetches later must carry their own response's nonce, which
the extension rewrites to the page's before parsing. Part C builds the one
mechanism that makes this automatic.

### C1. Install htmx, Valibot and the vocabulary

```bash
# from apps/web
vp add -D htmx.org@4.0.0
vp add valibot '@shelf/catalogue@workspace:*'
```

`htmx.org@4.0.0` is pinned exactly: npm's `latest` tag is still htmx 2, and
the vendored file should only change when you choose. Both commands add
entries to the catalog in `pnpm-workspace.yaml`, as `catalogMode: prefer`
does for every dependency. Neither package has install scripts, so no
build approval is needed.

`apps/web/scripts/vendor.ts`:

```ts
// Copies third-party CSS, fonts and scripts into public/vendor, because the CSP only allows 'self'.
import { copyFileSync, mkdirSync } from 'node:fs';
import { basename } from 'node:path';

const caslon = 'node_modules/@fontsource/libre-caslon-text/files/libre-caslon-text-latin';
const courier = 'node_modules/@fontsource/courier-prime/files/courier-prime-latin';
const htmx = 'node_modules/htmx.org/dist';

const assets: Record<string, string[]> = {
  // Only the Open Props groups the stylesheets use; see public/styles/app.css.
  'public/vendor/open-props': ['sizes', 'fonts', 'borders', 'shadows', 'red', 'blue'].map(
    (group) => `node_modules/open-props/${group}.min.css`,
  ),
  'public/vendor/fonts': [
    `${caslon}-400-normal.woff2`,
    `${caslon}-400-italic.woff2`,
    `${caslon}-700-normal.woff2`,
    `${courier}-400-normal.woff2`,
    `${courier}-700-normal.woff2`,
  ],
  // htmx and the one extension in use; see src/components/templates/page.tsx.
  'public/vendor/htmx': [`${htmx}/htmx.min.js`, `${htmx}/ext/hx-csp.min.js`],
};

for (const [dir, files] of Object.entries(assets)) {
  mkdirSync(dir, { recursive: true });
  for (const file of files) copyFileSync(file, `${dir}/${basename(file)}`);
}
```

```bash
# from apps/web
vp run vendor
ls public/vendor/htmx
```

Expect `htmx.min.js` (about 36 KB) and `hx-csp.min.js` (about 3 KB). If
`vp run` reports a cache hit and the folder is missing, run
`node scripts/vendor.ts`, as in milestone 1.

### C2. Provide the nonce once

Passing a nonce prop through every component would touch dozens of files.
Hono JSX has React-style context, which works during server rendering, so
the nonce is provided once per response and read where it is needed.

`apps/web/src/nonce.ts`:

```ts
import { createContext, useContext } from 'hono/jsx';

// The response's CSP nonce, provided once by render() so any component can read it.
export const NonceContext = createContext('');

// Every element with an hx- attribute needs these; hx-csp strips htmx from any without.
export const useHx = () => ({ 'hx-nonce': useContext(NonceContext) });
```

Any component that adds `hx-` attributes spreads `{...useHx()}` onto the
same element. `useHx` is a hook, so call it inside the component that
renders, never at module level.

`apps/web/src/render.tsx`:

```tsx
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Child } from 'hono/jsx';
import type { AppEnv } from './env.ts';
import { NonceContext } from './nonce.ts';

type Options = { fragment?: Child; status?: ContentfulStatusCode };

// htmx sends HX-Request-Type: partial when it swaps one region; anything else,
// including a boosted link, gets the whole page.
export const render = (context: Context<AppEnv>, page: Child, options: Options = {}) => {
  const partial = options.fragment && context.req.header('HX-Request-Type') === 'partial';
  context.header('Vary', 'HX-Request-Type');
  return renderPart(context, partial ? options.fragment : page, options.status);
};

// A piece of a page for htmx to swap in. Its hx- elements carry this response's
// nonce, which hx-csp rewrites to the page's before parsing.
export const renderPart = (
  context: Context<AppEnv>,
  part: Child,
  status: ContentfulStatusCode = 200,
) =>
  context.html(
    <NonceContext.Provider value={context.get('secureHeadersNonce') ?? ''}>
      {part}
    </NonceContext.Provider>,
    status,
  );
```

Every route answers through one of these two. `render` is for anything
that can be a whole page: it picks the page or a fragment and sends
`Vary: HX-Request-Type`, so a browser never reuses a cached fragment as a
page or the reverse. `renderPart` is for the pieces htmx swaps into a
target, such as a card or its form, which are never pages. Both provide
the nonce.

htmx 4 sends `HX-Request-Type: partial` only when it swaps part of the page.
Boosted links and forms target the whole body and send `full`, so they get
the page, which is exactly what they need.

### C3. Load htmx in the page template

`apps/web/src/components/templates/page.tsx`:

```tsx
import type { FC, PropsWithChildren } from 'hono/jsx';
import { useContext } from 'hono/jsx';
import { raw } from 'hono/html';
import type { SessionUser } from '@shelf/auth';
import { NonceContext, useHx } from '../../nonce.ts';
import { SiteHeader } from '../organisms/site-header.tsx';

type PageProps = PropsWithChildren<{ title: string; user: SessionUser | null }>;

const FONTS = ['libre-caslon-text-latin-400-normal', 'courier-prime-latin-400-normal'];

// Only hx-csp may register, and htmx's own indicator styles are not needed.
const HTMX_CONFIG = 'extensions:"hx-csp", includeIndicatorCSS:false';

const Scripts: FC = () => {
  const nonce = useContext(NonceContext);
  return (
    <>
      <meta name="htmx-config" content={HTMX_CONFIG} />
      <script nonce={nonce} src="/vendor/htmx/htmx.min.js" defer />
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

// hx-boost turns every link and form inside <main> into a fetch that swaps the body.
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
```

What each part does:

- `extensions:"hx-csp"` is a whitelist: no other extension can register,
  even if a script for one somehow loaded.
- `includeIndicatorCSS:false` stops htmx adding its loading-indicator
  styles; nothing here uses indicators yet. (htmx adds them as a
  constructed stylesheet, which `style-src 'self'` allows anyway, so this
  is tidiness, not a CSP fix.)
- Both scripts are `defer`, so they run in order after parsing and before
  htmx starts on `DOMContentLoaded`. `hx-csp` reads the nonce from
  `script[nonce]` on the page, which these tags provide.
- `hx-boost:inherited="true"` on `<main>` makes every link and form inside
  it fetch and swap the body. htmx 4 needs `:inherited` for a child to
  pick an attribute up. JSX accepts the colon because it reads
  `hx-boost:inherited` as a namespaced name; `hx-status:422` later in this
  guide is not a valid name, which is why that one is spread from an object.

Route the existing pages through `render`. `apps/web/src/routes/auth.tsx`:

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
import { render } from '../render.tsx';

const text = (value: unknown) => (typeof value === 'string' ? value : '');

export const authRoutes = new Hono<AppEnv>();

authRoutes.get('/login', (context) => {
  const next = safeNext(context.req.query('next'));

  return context.var.user
    ? context.redirect(next, 303)
    : render(context, <LoginPage next={next} />);
});

authRoutes.post('/login', async (context) => {
  const form = await context.req.parseBody();
  const username = text(form.username).trim().toLowerCase();
  const password = text(form.password);
  const ip = context.req.header('cf-connecting-ip') ?? 'unknown';
  const next = safeNext(form.next);
  const result = await signIn(
    context.var.db,
    { username, password, ip },
    context.env.PASSWORD_PEPPER,
  );

  if (result.ok) {
    writeSessionCookie(context, result.token);
    return context.redirect(next, 303);
  }
  const page = <LoginPage next={next} username={username} error={result.reason} />;

  return render(context, page, { status: result.reason === 'locked' ? 429 : 401 });
});

authRoutes.post('/logout', async (context) => {
  const token = readSessionCookie(context);
  if (token) await deleteSession(context.var.db, token);
  clearSessionCookie(context);

  return context.redirect('/', 303);
});
```

`apps/web/src/routes/manage.tsx`, for now (Part E adds the catalogue
routes to it):

```tsx
import { Hono } from 'hono';
import { requireUser } from '@shelf/auth';
import type { AppEnv } from '../env.ts';
import { ManagePage } from '../pages/manage.tsx';
import { StyleguidePage } from '../pages/styleguide.tsx';
import { render } from '../render.tsx';

export const manageRoutes = new Hono<AppEnv>();

manageRoutes.use(requireUser);

manageRoutes.get('/', (context) => render(context, <ManagePage user={context.var.user!} />));

manageRoutes.get('/styleguide', (context) =>
  render(context, <StyleguidePage user={context.var.user!} />),
);
```

`apps/web/src/index.tsx`, for now (Part E replaces the home route):

```tsx
import { Hono } from 'hono';
import { csrf } from 'hono/csrf';
import { loadUser } from '@shelf/auth';
import { createDb } from '@shelf/db';
import type { AppEnv } from './env.ts';
import { HomePage } from './pages/home.tsx';
import { render } from './render.tsx';
import { authRoutes } from './routes/auth.tsx';
import { manageRoutes } from './routes/manage.tsx';
import { securityHeaders } from './security.ts';

const app = new Hono<AppEnv>();

app.use(securityHeaders);
app.use(csrf());
app.use(async (context, next) => {
  context.set('db', createDb(context.env.DB));
  await next();
});
app.use(loadUser);

app.get('/', (context) => render(context, <HomePage user={context.var.user} />));
app.route('/', authRoutes);
app.route('/manage', manageRoutes);

export default app;
```

### Checkpoint C

```bash
# from the repo root
vp check --fix
vp run -r test
vp run dev
```

Expect 39 tests: 9, 10, 11 and 9 in `catalogue`, `auth`, `db` and `web`.
Then open
<http://localhost:5173> in Chrome with DevTools open:

- The Console has no `[hx-csp] blocked` errors and no CSP violations.
- `htmx.version` typed into the Console prints `"4.0.0"`.
- The Network tab shows `htmx.min.js` and `hx-csp.min.js` loading from
  `localhost`.
- After signing in, following the "Component sheet" link shows a `fetch`
  request rather than a document load, and the address bar changes.

```bash
# from the repo root
git add -A
git commit -m "feat(web): htmx 4 with hx-csp and a nonce context"
```

## Part D: Forms and components

Part D builds everything the pages compose: new atoms and molecules, the
form layer that turns posted fields into the Part B input types, and the
organisms for forms, search and the work page. Nothing is routed until
Part E, so the checkpoint is a clean `vp check`.

### How the form layer fits together

Each form section (work, edition, copy) has two halves kept side by side
in `src/forms`:

- A list of `FieldSpec`s says how each field is drawn: label, control,
  options, hint. `FieldList` renders any list of them.
- A Valibot schema says what each field accepts and turns the strings into
  the typed values `createWork` and the rest expect.

Every field name is unique across the work, edition and copy sections, so
the add page posts all three in one flat form and each parser picks out
its own fields. Kind-specific fields live in one file per kind.

### How writes work

Every write goes through htmx with the method that fits it, and answers
with the HTML that replaces what was on the page:

| Action            | Request                                 | Answer                                     | Swapped into     |
| ----------------- | --------------------------------------- | ------------------------------------------ | ---------------- |
| Add a work        | `hx-post` from the add page             | `HX-Location` to the new work's page       | The whole page   |
| Edit anything     | `hx-get …/edit`, then `hx-put`          | The form, then the saved card or row       | That card or row |
| Add a copy        | `hx-get …/copies/new`, then `hx-post`   | The edition card with a form, then without | `#edition-<id>`  |
| Add an edition    | `hx-get …/editions/new`, then `hx-post` | Every edition, with a form, then without   | `#editions`      |
| Delete a copy     | `hx-delete`                             | The edition card, one copy fewer           | `#edition-<id>`  |
| Delete an edition | `hx-delete`                             | Nothing; `hx-swap="delete"` removes it     | `#edition-<id>`  |
| Delete a work     | `hx-delete`                             | `HX-Location` to `/manage`                 | The whole page   |

A save with mistakes answers 422 with the same form, the typed values and
a message under each field, and the form morphs it into place. There is no
fallback for browsers without JavaScript: Shelf has two users, both on
Chrome.

Hono's `csrf()` checks the `Origin` of every non-GET request with a form
body, so `hx-put` and `hx-post` are covered as plain form posts were. An
`hx-delete` has no body, so `csrf()` lets it through; it is still safe,
because a cross-site `DELETE` from script needs a CORS preflight the app
never grants, and the `SameSite=Lax` cookie is not sent with it.

### D1. Atoms

`Input` is already fixed (A2). Three more atoms join it.

`apps/web/src/components/atoms/select.tsx`:

```tsx
import type { FC, JSX } from 'hono/jsx';

export type Option = { value: string; label: string };

export type SelectProps = JSX.IntrinsicElements['select'] & {
  options: Option[];
  value?: string;
  // The label of an empty first option, for a choice that may be left unset.
  blank?: string;
};

export const Select: FC<SelectProps> = ({ options, value = '', blank, ...props }) => (
  <select class="select" {...props}>
    {blank !== undefined && <option value="">{blank}</option>}
    {options.map((option) => (
      <option value={option.value} selected={option.value === value}>
        {option.label}
      </option>
    ))}
  </select>
);
```

`apps/web/src/components/atoms/textarea.tsx`:

```tsx
import type { FC, JSX } from 'hono/jsx';

export type TextareaProps = JSX.IntrinsicElements['textarea'] & { value?: string };

export const Textarea: FC<TextareaProps> = ({ value = '', ...props }) => (
  <textarea class="textarea" rows={4} {...props}>
    {value}
  </textarea>
);
```

`apps/web/src/components/atoms/button.tsx` gains a `danger` variant, a
`LinkButton` for actions that only open a page, and passes extra
attributes through, so a button can carry `hx-get`:

```tsx
import type { FC, JSX, PropsWithChildren } from 'hono/jsx';

type Variant = 'primary' | 'quiet' | 'danger';

type ButtonProps = JSX.IntrinsicElements['button'] & { variant?: Variant };

// Extra attributes, such as hx-get, pass straight through to the <button>.
export const Button: FC<ButtonProps> = ({
  variant = 'primary',
  type = 'submit',
  children,
  ...attributes
}) => (
  <button class="button" data-variant={variant} type={type} {...attributes}>
    {children}
  </button>
);

// A link that looks like a button, for actions that only open a page.
export const LinkButton: FC<PropsWithChildren<{ href: string; variant?: Variant }>> = ({
  href,
  variant = 'quiet',
  children,
}) => (
  <a class="button" data-variant={variant} href={href}>
    {children}
  </a>
);
```

`apps/web/public/styles/atoms/button.css`:

```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-block-size: var(--tap);
  padding-inline: var(--size-4);
  border: 1px solid var(--ink);
  border-radius: var(--radius-1);
  background: var(--ink);
  color: var(--card);
  font: inherit;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;

  &:active {
    translate: 0 1px;
  }

  &[data-variant='quiet'] {
    padding-inline: var(--size-2);
    border-color: transparent;
    background: transparent;
    color: var(--ink);
    font-weight: 400;
    text-decoration: underline var(--rule-red) 1px;
    text-underline-offset: 0.2em;
  }

  &[data-variant='danger'] {
    padding-inline: var(--size-3);
    border-color: var(--rule-red);
    background: transparent;
    color: var(--rule-red);
  }

  @media (prefers-reduced-motion: reduce) {
    &:active {
      translate: none;
    }
  }
}
```

The `text-decoration: none` line is new; it keeps `LinkButton` from
picking up the base link underline.

`apps/web/public/styles/atoms/select.css`:

```css
/* Drawn like the typed blank in input.css, with the browser's own arrow. */
.select {
  display: block;
  inline-size: 100%;
  min-block-size: var(--tap);
  padding: var(--size-1) 0;
  border: 0;
  border-block-end: 1px solid var(--ink-muted);
  border-radius: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;

  &:focus-visible {
    outline: none;
    border-block-end: 2px solid var(--focus);
  }

  &[aria-invalid='true'] {
    border-block-end-color: var(--rule-red);
  }
}
```

`apps/web/public/styles/atoms/textarea.css`:

```css
/* Several ruled lines to write on, matching the detail list's blue rules. */
.textarea {
  display: block;
  inline-size: 100%;
  padding: 0;
  border: 0;
  border-block-end: 1px solid var(--ink-muted);
  background: repeating-linear-gradient(
    to bottom,
    transparent 0 calc(var(--line) - 1px),
    var(--rule-blue) calc(var(--line) - 1px) var(--line)
  );
  color: var(--ink);
  font: inherit;
  line-height: var(--line);
  resize: vertical;

  &:focus-visible {
    outline: none;
    border-block-end: 2px solid var(--focus);
  }

  &[aria-invalid='true'] {
    border-block-end-color: var(--rule-red);
  }
}
```

### D2. Molecules

`Field` now takes a hint and an error, links them to the control with
`aria-describedby`, marks the control `aria-invalid`, and has select and
textarea variants. A `class` passed to a field now goes on the wrapper,
where a parent uses it to place the field.

`apps/web/src/components/molecules/field.tsx`:

```tsx
import type { Child, FC } from 'hono/jsx';
import { Input, type InputProps } from '../atoms/input.tsx';
import { Select, type SelectProps } from '../atoms/select.tsx';
import { Textarea, type TextareaProps } from '../atoms/textarea.tsx';
import { joinClassNames } from '../join-class-names.ts';

type FrameProps = {
  label: string;
  name: string;
  id?: string;
  hint?: string;
  error?: string;
  class?: string;
};

// The label, hint and error around any control; the control is told which notes describe it.
const frame = (props: FrameProps, control: (aria: Record<string, string>) => Child) => {
  const id = props.id ?? `field-${props.name}`;
  const notes = [props.hint && `${id}-hint`, props.error && `${id}-error`].filter(Boolean);
  const aria = { id, name: props.name, 'aria-invalid': props.error ? 'true' : 'false' };
  return (
    <div class={joinClassNames('field', props.class)}>
      <label class="field__label" for={id}>
        {props.label}
      </label>
      {control(notes.length ? { ...aria, 'aria-describedby': notes.join(' ') } : aria)}
      {props.hint && (
        <p class="field__hint" id={`${id}-hint`}>
          {props.hint}
        </p>
      )}
      {props.error && (
        <p class="field__error" id={`${id}-error`}>
          {props.error}
        </p>
      )}
    </div>
  );
};

export const Field: FC<InputProps & FrameProps> = (props) => {
  const { label, name, id, hint, error, class: className, ...input } = props;
  return frame({ label, name, id, hint, error, class: className }, (aria) => (
    <Input {...input} {...aria} />
  ));
};

export const SelectField: FC<SelectProps & FrameProps> = (props) => {
  const { label, name, id, hint, error, class: className, ...select } = props;
  return frame({ label, name, id, hint, error, class: className }, (aria) => (
    <Select {...select} {...aria} />
  ));
};

export const TextareaField: FC<TextareaProps & FrameProps> = (props) => {
  const { label, name, id, hint, error, class: className, ...textarea } = props;
  return frame({ label, name, id, hint, error, class: className }, (aria) => (
    <Textarea {...textarea} {...aria} />
  ));
};
```

`apps/web/public/styles/molecules/field.css`:

```css
.field {
  display: grid;
}

.field__label {
  color: var(--ink-muted);
  font-size: var(--font-size-0);
}

.field__hint {
  color: var(--ink-muted);
  font-size: var(--font-size-0);
}

.field__error {
  color: var(--rule-red);
  font-size: var(--font-size-0);
  font-weight: 700;
}
```

`apps/web/src/components/molecules/action-bar.tsx`:

```tsx
import type { FC, PropsWithChildren } from 'hono/jsx';

// A row of buttons and links that wraps on a narrow screen.
export const ActionBar: FC<PropsWithChildren> = ({ children }) => (
  <div class="action-bar">{children}</div>
);
```

`apps/web/public/styles/molecules/action-bar.css`:

```css
.action-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--size-2);
}
```

`apps/web/src/components/molecules/hx-button.tsx`:

```tsx
import type { FC, PropsWithChildren } from 'hono/jsx';
import { useHx } from '../../nonce.ts';
import { Button } from '../atoms/button.tsx';

export type Swap = { target: string; swap: 'outerHTML' | 'innerHTML' | 'delete' };

type HxButtonProps = PropsWithChildren<
  Swap & {
    method: 'get' | 'delete';
    url: string;
    variant?: 'quiet' | 'danger';
    confirm?: string;
  }
>;

// A button that fetches or deletes a resource and swaps the answer into the page.
export const HxButton: FC<HxButtonProps> = (props) => (
  <Button
    variant={props.variant ?? 'quiet'}
    type="button"
    {...{ [`hx-${props.method}`]: props.url }}
    hx-target={props.target}
    hx-swap={props.swap}
    hx-confirm={props.confirm}
    {...useHx()}
  >
    {props.children}
  </Button>
);
```

Every in-place action is one of these: a `get` that fetches a form or
puts a card back, or a `delete` with `hx-confirm`. It has no stylesheet of
its own; it is a `Button`.

`apps/web/src/components/molecules/kind-counts.tsx`:

```tsx
import { KINDS, type Kind } from '@shelf/catalogue';
import type { FC } from 'hono/jsx';
import { KIND_PLURALS } from '../../views/labels.ts';

// "12 Books", "4 Records", "2 Games", each a link to browse that kind.
export const KindCounts: FC<{ counts: Record<Kind, number> }> = ({ counts }) => (
  <ul class="kind-counts">
    {KINDS.map((kind) => (
      <li>
        <a class="kind-counts__link" href={`/search?kind=${kind}`}>
          <span class="kind-counts__total">{counts[kind]}</span> {KIND_PLURALS[kind]}
        </a>
      </li>
    ))}
  </ul>
);
```

`apps/web/public/styles/molecules/kind-counts.css`:

```css
.kind-counts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-1) var(--size-4);
}

.kind-counts__link {
  display: inline-flex;
  align-items: center;
  gap: var(--size-1);
  min-block-size: var(--tap);
}

.kind-counts__total {
  font-family: var(--font-serif);
  font-size: var(--font-size-3);
}
```

`apps/web/src/components/molecules/track-list.tsx`:

```tsx
import type { Track } from '@shelf/catalogue';
import type { FC } from 'hono/jsx';

const time = (seconds: number | null) =>
  seconds === null ? '' : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export const TrackList: FC<{ tracks: Track[] }> = ({ tracks }) => (
  <ol class="track-list">
    {tracks.map((track) => (
      <li class="track-list__track">
        <span class="track-list__position">{`${track.side}${track.position}`}</span>
        <span>{track.title}</span>
        <span class="track-list__time">{time(track.durationSeconds)}</span>
      </li>
    ))}
  </ol>
);
```

`apps/web/public/styles/molecules/track-list.css`:

```css
/* Position, title and time on one ruled line each, like the detail list. */
.track-list {
  background: repeating-linear-gradient(
    to bottom,
    transparent 0 calc(var(--line) - 1px),
    var(--rule-blue) calc(var(--line) - 1px) var(--line)
  );
}

.track-list__track {
  display: grid;
  grid-template-columns: 3ch 1fr auto;
  gap: var(--size-2);
}

.track-list__position,
.track-list__time {
  color: var(--ink-muted);
}
```

### D3. The form layer

`apps/web/src/forms/form-data.ts` reads a post, and turns saved rows back
into form values for the edit pages:

```ts
import type { Context } from 'hono';

// Raw form input: one string per field, or several for repeated names such as credit rows.
export type FormValues = Record<string, string | string[]>;

export type FieldErrors = Record<string, string>;

export const readForm = async (context: Context): Promise<FormValues> => {
  const body = await context.req.parseBody({ all: true });
  const values: FormValues = {};
  for (const [name, value] of Object.entries(body)) {
    const strings = [value].flat().filter((part) => typeof part === 'string');
    values[name] = strings.length === 1 ? strings[0]! : strings;
  }
  return values;
};

export const one = (values: FormValues, name: string) => [values[name] ?? ''].flat()[0] ?? '';

export const many = (values: FormValues, name: string) => [values[name] ?? []].flat();

// The first value of every field, for schemas that expect one string each.
export const single = (values: FormValues) =>
  Object.fromEntries(Object.keys(values).map((name) => [name, one(values, name)]));

const asText = (value: unknown) => {
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' ? value : '';
};

// A saved row back into form input: null becomes blank, booleans become yes or no.
export const toValues = (row: object, names: readonly string[]): FormValues => {
  const fields: Record<string, unknown> = { ...row };
  return Object.fromEntries(names.map((name) => [name, asText(fields[name])]));
};
```

`parseBody({ all: true })` returns an array for a repeated name and a
string otherwise; `one` and `many` hide that difference.

`apps/web/src/forms/fields.ts` holds the Valibot building blocks. Every
field arrives as a string or not at all, and every optional field turns
blank into `null`:

```ts
import * as v from 'valibot';

// Every field arrives as a string, or not at all; blank optional fields become null.
const input = () => v.pipe(v.optional(v.string(), ''), v.trim());

const nullIfBlank = v.transform((text: string) => (text === '' ? null : text));

export const requiredText = (message: string) =>
  v.pipe(input(), v.nonEmpty(message), v.maxLength(300, 'Keep this under 300 characters.'));

export const optionalText = (max = 300) =>
  v.pipe(input(), v.maxLength(max, `Keep this under ${max} characters.`), nullIfBlank);

const whole = (min: number, max: number) =>
  v.pipe(
    v.string(),
    v.regex(/^\d+$/, 'Enter a whole number.'),
    v.transform(Number),
    v.minValue(min, `Enter ${min} or more.`),
    v.maxValue(max, `Enter ${max} or less.`),
  );

export const requiredWhole = (min: number, max: number, message: string) =>
  v.pipe(input(), v.nonEmpty(message), whole(min, max));

export const optionalWhole = (min: number, max: number) =>
  v.pipe(input(), nullIfBlank, v.nullable(whole(min, max)));

export const choice = <const Options extends readonly string[]>(
  options: Options,
  message: string,
) => v.pipe(input(), v.picklist(options, message));

export const optionalChoice = <const Options extends readonly string[]>(options: Options) =>
  v.pipe(input(), nullIfBlank, v.nullable(v.picklist(options, 'Choose one of the options.')));

// Spaces and hyphens are dropped first, so "978-0-930289-23-2" is accepted.
export const optionalCode = (pattern: RegExp, message: string) =>
  v.pipe(
    input(),
    v.transform((text) => text.replace(/[\s-]/g, '').toUpperCase()),
    nullIfBlank,
    v.nullable(v.pipe(v.string(), v.regex(pattern, message))),
  );

export const yesNo = () =>
  v.pipe(
    input(),
    v.picklist(['yes', 'no'], 'Choose yes or no.'),
    v.transform((answer) => answer === 'yes'),
  );

export const textOr = (fallback: string) =>
  v.pipe(
    input(),
    v.maxLength(100, 'Keep this under 100 characters.'),
    v.transform((text) => text || fallback),
  );

const isLanguageTag = (tag: string) => {
  try {
    return Intl.getCanonicalLocales(tag).length === 1;
  } catch {
    return false;
  }
};

// A BCP 47 tag such as en, la or grc; blank means English.
export const language = () =>
  v.pipe(textOr('en'), v.check(isLanguageTag, 'Enter a language code such as en, la or grc.'));

export const isoDate = () =>
  v.pipe(input(), nullIfBlank, v.nullable(v.pipe(v.string(), v.isoDate('Enter a date.'))));
```

`apps/web/src/forms/validate.ts`:

```ts
import * as v from 'valibot';
import type { FieldErrors } from './form-data.ts';

export type Validated<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

// The first message for each field that failed, keyed by the field's name.
export const validate = <Schema extends v.GenericSchema>(
  schema: Schema,
  input: unknown,
): Validated<v.InferOutput<Schema>> => {
  const result = v.safeParse(schema, input);
  if (result.success) return { ok: true, value: result.output };
  const nested: Record<string, string[] | undefined> = v.flatten(result.issues).nested ?? {};
  const errors = Object.entries(nested).map(([name, messages]) => [name, messages?.[0] ?? '']);
  return { ok: false, errors: Object.fromEntries(errors) };
};

export const errorsOf = (...results: Validated<unknown>[]): FieldErrors =>
  Object.assign({}, ...results.map((result) => (result.ok ? {} : result.errors)));
```

`apps/web/src/forms/spec.ts`:

```ts
// How one form field is drawn; the matching schema decides what it accepts.
export type FieldSpec = {
  name: string;
  label: string;
  control?: 'input' | 'select' | 'textarea';
  type?: 'text' | 'number' | 'date';
  inputmode?: 'numeric';
  options?: readonly (string | number)[];
  // The label of the empty first option of an optional select.
  blank?: string;
  required?: boolean;
  hint?: string;
};
```

`apps/web/src/forms/credits.ts`:

```ts
import { ROLES, type Kind } from '@shelf/catalogue';
import type { CreditInput } from '@shelf/db';
import { many, type FormValues } from './form-data.ts';
import type { Validated } from './validate.ts';

// Credit rows arrive as two repeated fields, creditName and creditRole, in row order.
export const parseCredits = (values: FormValues, kind: Kind): Validated<CreditInput[]> => {
  const roles: readonly string[] = ROLES[kind];
  const names = many(values, 'creditName');
  const chosen = many(values, 'creditRole');
  const credits = names
    .map((name, row) => ({ name: name.trim(), role: chosen[row] ?? '' }))
    .filter((credit) => credit.name !== '');
  if (credits.some((credit) => !roles.includes(credit.role))) {
    return { ok: false, errors: { credits: 'Choose a role for each person.' } };
  }
  return { ok: true, value: credits };
};
```

Credit rows post two repeated fields, `creditName` and `creditRole`, and
row order is credit order. Rows with no name are ignored, so the blank
rows the form always offers cost nothing.

`apps/web/src/forms/work.ts`:

```ts
import type { Kind } from '@shelf/catalogue';
import type { WorkDetail, WorkInput } from '@shelf/db';
import * as v from 'valibot';
import { parseCredits } from './credits.ts';
import { optionalText, optionalWhole, requiredText } from './fields.ts';
import { single, toValues, type FormValues } from './form-data.ts';
import type { FieldSpec } from './spec.ts';
import { errorsOf, validate, type Validated } from './validate.ts';

export const WORK_FIELDS: FieldSpec[] = [
  { name: 'title', label: 'Title', required: true },
  { name: 'subtitle', label: 'Subtitle' },
  { name: 'firstYear', label: 'First year', type: 'number', inputmode: 'numeric' },
  { name: 'description', label: 'Description', control: 'textarea' },
  { name: 'tags', label: 'Tags', hint: 'Separate tags with commas: ska, 2 tone.' },
];

// Lower-case, trimmed and without repeats.
const splitTags = (text: string) => [
  ...new Set(
    text
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
  ),
];

const workSchema = v.object({
  title: requiredText('Enter the title.'),
  subtitle: optionalText(),
  firstYear: optionalWhole(1000, 2100),
  description: optionalText(2000),
  tags: v.pipe(v.optional(v.string(), ''), v.transform(splitTags)),
});

export const parseWork = (values: FormValues, kind: Kind): Validated<WorkInput> => {
  const fields = validate(workSchema, single(values));
  const credits = parseCredits(values, kind);
  if (fields.ok && credits.ok)
    return { ok: true, value: { ...fields.value, credits: credits.value } };
  return { ok: false, errors: errorsOf(fields, credits) };
};

export const workValues = (work: WorkDetail): FormValues => ({
  ...toValues(work, ['title', 'subtitle', 'firstYear', 'description']),
  tags: work.tags.join(', '),
  creditName: work.credits.map((credit) => credit.name),
  creditRole: work.credits.map((credit) => credit.role),
});
```

`apps/web/src/forms/book.ts`:

```ts
import { BINDINGS, BOOK_GENRES } from '@shelf/catalogue';
import * as v from 'valibot';
import { choice, language, optionalCode, optionalText, optionalWhole } from './fields.ts';
import type { FieldSpec } from './spec.ts';

export const bookEditionFields: FieldSpec[] = [
  { name: 'genre', label: 'Genre', control: 'select', options: BOOK_GENRES, required: true },
  { name: 'binding', label: 'Binding', control: 'select', options: BINDINGS, required: true },
  { name: 'isbn13', label: 'ISBN-13', inputmode: 'numeric' },
  { name: 'isbn10', label: 'ISBN-10' },
  { name: 'pageCount', label: 'Pages', type: 'number', inputmode: 'numeric' },
  { name: 'language', label: 'Language', hint: 'A language code: en, la, grc.' },
  { name: 'editionStatement', label: 'Edition statement', hint: 'As printed: First edition.' },
  { name: 'series', label: 'Series' },
  { name: 'seriesNumber', label: 'Number in series', type: 'number', inputmode: 'numeric' },
];

export const bookEditionSchema = v.object({
  genre: choice(BOOK_GENRES, 'Choose a genre.'),
  binding: choice(BINDINGS, 'Choose a binding.'),
  isbn13: optionalCode(/^97[89]\d{10}$/, 'An ISBN-13 is 13 digits starting 978 or 979.'),
  isbn10: optionalCode(/^\d{9}[\dX]$/, 'An ISBN-10 is 9 digits then a digit or X.'),
  pageCount: optionalWhole(1, 20000),
  language: language(),
  editionStatement: optionalText(),
  series: optionalText(),
  seriesNumber: optionalWhole(0, 10000),
});

export const bookDefaults = { language: 'en' };
```

ISBNs and barcodes are checked for shape only: digits and length, with
spaces and hyphens removed. Check-digit validation is milestone 3's
`classifyCode`.

`apps/web/src/forms/record.ts`:

```ts
import { GRADES, RECORD_FORMATS, RECORD_GENRES, SPEEDS } from '@shelf/catalogue';
import * as v from 'valibot';
import { choice, optionalChoice, optionalText, requiredWhole, textOr } from './fields.ts';
import type { FieldSpec } from './spec.ts';

const speeds = SPEEDS.map(String);

export const recordEditionFields: FieldSpec[] = [
  { name: 'format', label: 'Format', control: 'select', options: RECORD_FORMATS, required: true },
  { name: 'speed', label: 'Speed (rpm)', control: 'select', options: SPEEDS, required: true },
  { name: 'genre', label: 'Genre', control: 'select', options: RECORD_GENRES, required: true },
  { name: 'catalogueNumber', label: 'Catalogue number' },
  { name: 'discCount', label: 'Discs', type: 'number', inputmode: 'numeric', required: true },
  { name: 'vinylColour', label: 'Vinyl colour' },
  { name: 'pressingCountry', label: 'Pressed in' },
  {
    name: 'tracklist',
    label: 'Tracklist',
    control: 'textarea',
    hint: 'One track a line: A1 Title 4:05. The time is optional.',
  },
];

export const recordEditionSchema = v.object({
  format: choice(RECORD_FORMATS, 'Choose a format.'),
  speed: v.pipe(choice(speeds, 'Choose a speed.'), v.transform(Number)),
  genre: choice(RECORD_GENRES, 'Choose a genre.'),
  catalogueNumber: optionalText(),
  discCount: requiredWhole(1, 20, 'Enter the number of discs.'),
  vinylColour: textOr('black'),
  pressingCountry: optionalText(),
});

export const recordCopyFields: FieldSpec[] = [
  {
    name: 'mediaGrade',
    label: 'Vinyl grade',
    control: 'select',
    options: GRADES,
    blank: 'Not graded',
  },
  {
    name: 'sleeveGrade',
    label: 'Sleeve grade',
    control: 'select',
    options: GRADES,
    blank: 'Not graded',
  },
];

export const recordCopySchema = v.object({
  mediaGrade: optionalChoice(GRADES),
  sleeveGrade: optionalChoice(GRADES),
});

export const recordDefaults = { speed: '33', discCount: '1', vinylColour: 'black' };
```

`apps/web/src/forms/game.ts`:

```ts
import * as v from 'valibot';
import { language, optionalText, optionalWhole, requiredWhole, yesNo } from './fields.ts';
import type { FieldSpec } from './spec.ts';

const number = { type: 'number', inputmode: 'numeric' } as const;

export const gameEditionFields: FieldSpec[] = [
  { name: 'minPlayers', label: 'Fewest players', ...number, required: true },
  { name: 'maxPlayers', label: 'Most players', ...number, required: true },
  { name: 'playMinutes', label: 'Playing time (minutes)', ...number, required: true },
  { name: 'minAge', label: 'Minimum age', ...number },
  { name: 'language', label: 'Language', hint: 'A language code: en, de, fr.' },
];

export const gameEditionSchema = v.pipe(
  v.object({
    minPlayers: requiredWhole(1, 100, 'Enter the fewest players.'),
    maxPlayers: requiredWhole(1, 100, 'Enter the most players.'),
    playMinutes: requiredWhole(1, 10000, 'Enter the playing time.'),
    minAge: optionalWhole(0, 99),
    language: language(),
  }),
  v.forward(
    v.check((game) => game.maxPlayers >= game.minPlayers, 'Enter at least the fewest players.'),
    ['maxPlayers'],
  ),
);

const yesOrNo = ['yes', 'no'] as const;

export const gameCopyFields: FieldSpec[] = [
  { name: 'complete', label: 'Complete', control: 'select', options: yesOrNo, required: true },
  { name: 'sleeved', label: 'Cards sleeved', control: 'select', options: yesOrNo, required: true },
  { name: 'missingNotes', label: 'What is missing', control: 'textarea' },
];

export const gameCopySchema = v.object({
  complete: yesNo(),
  sleeved: yesNo(),
  missingNotes: optionalText(1000),
});

export const gameDefaults = { language: 'en', complete: 'yes', sleeved: 'no' };
```

`v.forward` attaches the "most players" check to the `maxPlayers` field, so
the message appears under that field rather than at the top.

`apps/web/src/forms/edition.ts`:

```ts
import { formatTracklist, parseTracklist, type Kind } from '@shelf/catalogue';
import type { EditionDetail, EditionDetails, EditionInput } from '@shelf/db';
import * as v from 'valibot';
import { bookEditionFields, bookEditionSchema } from './book.ts';
import { optionalCode, optionalText, optionalWhole } from './fields.ts';
import { one, single, toValues, type FormValues } from './form-data.ts';
import { gameEditionFields, gameEditionSchema } from './game.ts';
import { recordEditionFields, recordEditionSchema } from './record.ts';
import type { FieldSpec } from './spec.ts';
import { errorsOf, validate, type Validated } from './validate.ts';

const COMMON_FIELDS: FieldSpec[] = [
  { name: 'publisher', label: 'Publisher or label' },
  { name: 'year', label: 'Year of this edition', type: 'number', inputmode: 'numeric' },
  { name: 'barcode', label: 'Barcode', inputmode: 'numeric' },
];

const commonSchema = v.object({
  publisher: optionalText(),
  year: optionalWhole(1000, 2100),
  barcode: optionalCode(/^\d{8,14}$/, 'A barcode is 8 to 14 digits.'),
});

const KIND_FIELDS = {
  book: bookEditionFields,
  record: recordEditionFields,
  board_game: gameEditionFields,
};

export const editionFields = (kind: Kind) => [...COMMON_FIELDS, ...KIND_FIELDS[kind]];

const parseRecord = (values: FormValues): Validated<EditionDetails> => {
  const fields = validate(recordEditionSchema, single(values));
  const { tracks, errors } = parseTracklist(one(values, 'tracklist'));
  if (fields.ok && !errors.length)
    return { ok: true, value: { kind: 'record', values: fields.value, tracks } };
  return {
    ok: false,
    errors: { ...errorsOf(fields), ...(errors.length ? { tracklist: errors[0]! } : {}) },
  };
};

const parseDetails = (values: FormValues, kind: Kind): Validated<EditionDetails> => {
  if (kind === 'record') return parseRecord(values);
  const result =
    kind === 'book'
      ? validate(bookEditionSchema, single(values))
      : validate(gameEditionSchema, single(values));
  return result.ok ? { ok: true, value: { kind, values: result.value } as EditionDetails } : result;
};

export const parseEdition = (values: FormValues, kind: Kind): Validated<EditionInput> => {
  const common = validate(commonSchema, single(values));
  const details = parseDetails(values, kind);
  if (common.ok && details.ok)
    return { ok: true, value: { ...common.value, details: details.value } };
  return { ok: false, errors: errorsOf(common, details) };
};

const DETAIL_NAMES = Object.fromEntries(
  Object.entries(KIND_FIELDS).map(([kind, fields]) => [kind, fields.map((field) => field.name)]),
) as Record<Kind, string[]>;

export const editionValues = (edition: EditionDetail): FormValues => ({
  ...toValues(edition, ['publisher', 'year', 'barcode']),
  ...toValues(edition.book ?? edition.record ?? edition.game ?? {}, DETAIL_NAMES[edition.kind]),
  tracklist: formatTracklist(edition.tracks),
});
```

`apps/web/src/forms/copy.ts`:

```ts
import type { Kind } from '@shelf/catalogue';
import type { CopyDetail, CopyDetails, CopyInput } from '@shelf/db';
import * as v from 'valibot';
import { isoDate, optionalText } from './fields.ts';
import { single, toValues, type FormValues } from './form-data.ts';
import { gameCopyFields, gameCopySchema } from './game.ts';
import { recordCopyFields, recordCopySchema } from './record.ts';
import type { FieldSpec } from './spec.ts';
import { errorsOf, validate, type Validated } from './validate.ts';

const COMMON_FIELDS: FieldSpec[] = [
  { name: 'condition', label: 'Condition', hint: 'In your own words: fine, worn spine.' },
  { name: 'location', label: 'Where it lives' },
  { name: 'acquiredOn', label: 'Acquired on', type: 'date' },
  { name: 'acquiredFrom', label: 'Acquired from' },
  { name: 'notes', label: 'Notes', control: 'textarea' },
];

const commonSchema = v.object({
  condition: optionalText(),
  location: optionalText(),
  acquiredOn: isoDate(),
  acquiredFrom: optionalText(),
  notes: optionalText(2000),
});

const KIND_FIELDS = { book: [], record: recordCopyFields, board_game: gameCopyFields };

export const copyFields = (kind: Kind) => [...COMMON_FIELDS, ...KIND_FIELDS[kind]];

const parseDetails = (values: FormValues, kind: Kind): Validated<CopyDetails> => {
  if (kind === 'book') return { ok: true, value: { kind } };
  const result =
    kind === 'record'
      ? validate(recordCopySchema, single(values))
      : validate(gameCopySchema, single(values));
  return result.ok ? { ok: true, value: { kind, values: result.value } as CopyDetails } : result;
};

export const parseCopy = (values: FormValues, kind: Kind): Validated<CopyInput> => {
  const common = validate(commonSchema, single(values));
  const details = parseDetails(values, kind);
  if (common.ok && details.ok)
    return { ok: true, value: { ...common.value, details: details.value } };
  return { ok: false, errors: errorsOf(common, details) };
};

export const copyValues = (copy: CopyDetail): FormValues => ({
  ...toValues(copy, ['condition', 'location', 'acquiredOn', 'acquiredFrom', 'notes']),
  ...toValues(
    copy.record ?? copy.game ?? {},
    KIND_FIELDS[copy.kind].map((field) => field.name),
  ),
});
```

`apps/web/src/forms/defaults.ts`:

```ts
import { bookDefaults } from './book.ts';
import { gameDefaults } from './game.ts';
import { recordDefaults } from './record.ts';

// What a blank add form starts with, for each kind.
export const FORM_DEFAULTS = {
  book: bookDefaults,
  record: recordDefaults,
  board_game: gameDefaults,
};
```

`apps/web/src/forms/new-entry.ts`:

```ts
import type { Kind } from '@shelf/catalogue';
import type { CopyInput, NewEdition, NewWork } from '@shelf/db';
import { parseCopy } from './copy.ts';
import { parseEdition } from './edition.ts';
import type { FormValues } from './form-data.ts';
import { errorsOf, type Validated } from './validate.ts';
import { parseWork } from './work.ts';

// Typed in by hand; milestone 3 records the provider instead.
const MANUAL = { source: 'manual', sourceRef: null };

export const parseNewEdition = (
  values: FormValues,
  kind: Kind,
): Validated<{ edition: NewEdition; copy: CopyInput }> => {
  const edition = parseEdition(values, kind);
  const copy = parseCopy(values, kind);
  if (edition.ok && copy.ok)
    return { ok: true, value: { edition: { ...edition.value, ...MANUAL }, copy: copy.value } };
  return { ok: false, errors: errorsOf(edition, copy) };
};

export const parseNewWork = (values: FormValues, kind: Kind): Validated<NewWork> => {
  const work = parseWork(values, kind);
  const rest = parseNewEdition(values, kind);
  if (work.ok && rest.ok) return { ok: true, value: { kind, work: work.value, ...rest.value } };
  return { ok: false, errors: errorsOf(work, rest) };
};
```

### D4. Views

Components take view shapes, never database rows (an interface rule from
milestone 1), so `src/views` does the mapping.

`apps/web/src/views/labels.ts`:

```ts
import type { Kind } from '@shelf/catalogue';

export const KIND_LABELS = { book: 'Book', record: 'Record', board_game: 'Game' } as const;

export const KIND_PLURALS: Record<Kind, string> = {
  book: 'Books',
  record: 'Records',
  board_game: 'Games',
};

// "graphic novel" becomes "Graphic novel" for display; stored values stay lower-case.
export const sentence = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const languages = new Intl.DisplayNames(['en-GB'], { type: 'language' });

export const languageName = (tag: string) => languages.of(tag) ?? tag;
```

`apps/web/src/views/summary.ts`:

```ts
import type { WorkSummary } from '@shelf/db';
import type { ItemSummary } from '../components/organisms/item-card.tsx';
import type { Detail } from '../components/molecules/detail-list.tsx';
import { KIND_LABELS } from './labels.ts';

const imprint = ({ kind, publisher, year }: WorkSummary): Detail | null => {
  const value = [publisher, year].filter((part) => part !== null).join(', ');
  return value ? [kind === 'record' ? 'Released' : 'Published', value] : null;
};

// The card shape the item list renders, from one summary row.
export const toItemSummary = (work: WorkSummary): ItemSummary => ({
  href: `/works/${work.id}`,
  kind: KIND_LABELS[work.kind],
  title: work.title,
  creator: work.creator ?? undefined,
  details: [imprint(work), ['Copies', String(work.copies)] as Detail].filter(
    (detail): detail is Detail => detail !== null,
  ),
});
```

`apps/web/src/views/details.ts`:

```ts
import type { CopyDetail, EditionDetail, WorkDetail } from '@shelf/db';
import type { Detail } from '../components/molecules/detail-list.tsx';
import { languageName, sentence } from './labels.ts';

type Maybe = string | number | null | undefined;

// Pairs whose value is missing are dropped, so cards only show what is known.
const known = (pairs: [string, Maybe][]): Detail[] =>
  pairs
    .filter((pair): pair is [string, string | number] => pair[1] != null && pair[1] !== '')
    .map(([term, value]) => [term, String(value)]);

export const workDetails = (work: WorkDetail) =>
  known([
    ['First year', work.firstYear],
    ['Tags', work.tags.join(', ')],
  ]);

export const editionTitle = (edition: EditionDetail) =>
  [edition.publisher, edition.year].filter((part) => part != null).join(', ') || 'Edition';

const bookDetails = ({ book }: EditionDetail) =>
  book
    ? known([
        ['Genre', sentence(book.genre)],
        ['Binding', sentence(book.binding)],
        ['ISBN', book.isbn13 ?? book.isbn10],
        ['Pages', book.pageCount],
        ['Language', book.language === 'en' ? null : languageName(book.language)],
        ['Edition', book.editionStatement],
        ['Series', book.series && [book.series, book.seriesNumber].filter(Boolean).join(' #')],
      ])
    : [];

const recordDetails = ({ record }: EditionDetail) =>
  record
    ? known([
        ['Format', `${record.format}, ${record.speed} rpm`],
        ['Genre', sentence(record.genre)],
        ['Catalogue', record.catalogueNumber],
        ['Discs', record.discCount > 1 ? record.discCount : null],
        ['Vinyl', record.vinylColour === 'black' ? null : sentence(record.vinylColour)],
        ['Pressed in', record.pressingCountry],
      ])
    : [];

const gameDetails = ({ game }: EditionDetail) =>
  game
    ? known([
        [
          'Players',
          game.minPlayers === game.maxPlayers
            ? game.minPlayers
            : `${game.minPlayers} to ${game.maxPlayers}`,
        ],
        ['Time', `${game.playMinutes} minutes`],
        ['Age', game.minAge && `${game.minAge}+`],
        ['Language', game.language === 'en' ? null : languageName(game.language)],
      ])
    : [];

export const editionDetails = (edition: EditionDetail) => [
  ...bookDetails(edition),
  ...recordDetails(edition),
  ...gameDetails(edition),
  ...known([['Barcode', edition.barcode]]),
];

export const copyDetails = (copy: Omit<CopyDetail, 'workId' | 'kind' | 'title'>) =>
  known([
    ['Where', copy.location],
    ['Condition', copy.condition],
    [
      'Grades',
      copy.record && [copy.record.mediaGrade, copy.record.sleeveGrade].filter(Boolean).join(' / '),
    ],
    ['Complete', copy.game && (copy.game.complete ? 'Yes' : `No: ${copy.game.missingNotes ?? ''}`)],
    ['Acquired', [copy.acquiredOn, copy.acquiredFrom].filter(Boolean).join(', ')],
    ['Notes', copy.notes],
  ]);
```

Detail lists only show what is known, and leave out defaults such as
English, black vinyl and one disc, so a card reads like the item rather
than like the form.

`apps/web/src/views/work.ts`:

```ts
import type { Track } from '@shelf/catalogue';
import type { WorkDetail } from '@shelf/db';
import type { Detail } from '../components/molecules/detail-list.tsx';
import { copyDetails, editionDetails, editionTitle, workDetails } from './details.ts';
import { KIND_LABELS, sentence } from './labels.ts';

type EditionRow = WorkDetail['editions'][number];
type CopyRow = EditionRow['copies'][number];

export type CopyView = { id: string; details: Detail[] };

export type EditionView = {
  id: string;
  title: string;
  details: Detail[];
  tracks: Track[];
  copies: CopyView[];
};

export type CreditView = { href: string; name: string; role: string };

export type WorkView = {
  id: string;
  kind: string;
  title: string;
  subtitle: string | null;
  credits: CreditView[];
  details: Detail[];
  description: string | null;
  editions: EditionView[];
};

export const toCopyView = (copy: CopyRow): CopyView => ({
  id: copy.id,
  details: copyDetails(copy),
});

export const toEditionView = (edition: EditionRow): EditionView => ({
  id: edition.id,
  title: editionTitle(edition),
  details: editionDetails(edition),
  tracks: edition.tracks,
  copies: edition.copies.map(toCopyView),
});

export const toWorkView = (work: WorkDetail): WorkView => ({
  id: work.id,
  kind: KIND_LABELS[work.kind],
  title: work.title,
  subtitle: work.subtitle,
  credits: work.credits.map((credit) => ({
    href: `/people/${credit.personId}`,
    name: credit.name,
    role: sentence(credit.role),
  })),
  details: workDetails(work),
  description: work.description,
  editions: work.editions.map(toEditionView),
});
```

`toEditionView` and `toCopyView` are exported because the routes that
answer with a single edition card or copy row need them too.

### D5. Organisms

`apps/web/src/components/organisms/field-list.tsx`:

```tsx
import type { FC } from 'hono/jsx';
import type { FieldErrors, FormValues } from '../../forms/form-data.ts';
import { one } from '../../forms/form-data.ts';
import type { FieldSpec } from '../../forms/spec.ts';
import { sentence } from '../../views/labels.ts';
import { Field, SelectField, TextareaField } from '../molecules/field.tsx';

type FieldListProps = { fields: FieldSpec[]; values: FormValues; errors: FieldErrors };

const options = (spec: FieldSpec) =>
  (spec.options ?? []).map((option) => ({
    value: String(option),
    label: sentence(String(option)),
  }));

// Draws each spec as the right kind of field. No stylesheet: it adds no element of its own.
export const FieldList: FC<FieldListProps> = ({ fields, values, errors }) => (
  <>
    {fields.map((spec) => {
      const common = {
        label: spec.label,
        name: spec.name,
        hint: spec.hint,
        error: errors[spec.name],
      };
      const value = one(values, spec.name);
      if (spec.control === 'select') {
        const blank = spec.required ? undefined : (spec.blank ?? 'Not recorded');
        return (
          <SelectField
            {...common}
            options={options(spec)}
            value={value}
            blank={blank}
            required={spec.required}
          />
        );
      }
      if (spec.control === 'textarea') return <TextareaField {...common} value={value} />;
      return (
        <Field
          {...common}
          value={value}
          type={spec.type}
          inputmode={spec.inputmode}
          required={spec.required}
        />
      );
    })}
  </>
);
```

`FieldList` renders a fragment and adds no element of its own, so it has
no stylesheet. The revival plan's interface rules now say so: a component
that only arranges other components gets no stylesheet.

`apps/web/src/components/organisms/credit-rows.tsx`:

```tsx
import { ROLES, type Kind } from '@shelf/catalogue';
import type { FC } from 'hono/jsx';
import { useHx } from '../../nonce.ts';
import { sentence } from '../../views/labels.ts';
import { Button } from '../atoms/button.tsx';
import { Field, SelectField } from '../molecules/field.tsx';

export type Credit = { name: string; role: string };

type CreditRowProps = { kind: Kind; credit: Credit };

// One person and their role; ids are random so rows added later never clash.
export const CreditRow: FC<CreditRowProps> = ({ kind, credit }) => {
  const id = `credit-${crypto.randomUUID().slice(0, 8)}`;
  const roles = ROLES[kind].map((role) => ({ value: role, label: sentence(role) }));
  return (
    <li class="credit-rows__row">
      <Field label="Person" name="creditName" id={`${id}-name`} value={credit.name} />
      <SelectField
        label="Role"
        name="creditRole"
        id={`${id}-role`}
        options={roles}
        value={credit.role}
      />
    </li>
  );
};

type CreditRowsProps = { kind: Kind; credits: Credit[]; error?: string };

const BLANK: Credit = { name: '', role: '' };

// Saved credits plus two blank rows; "Add a person" fetches another row.
export const CreditRows: FC<CreditRowsProps> = ({ kind, credits, error }) => (
  <div class="credit-rows">
    {error && <p class="credit-rows__error">{error}</p>}
    <ol class="credit-rows__list" id="credit-rows">
      {[...credits, BLANK, BLANK].map((credit) => (
        <CreditRow kind={kind} credit={credit} />
      ))}
    </ol>
    <Button
      variant="quiet"
      type="button"
      hx-get={`/manage/credit-row?kind=${kind}`}
      hx-target="#credit-rows"
      hx-swap="beforeend"
      {...useHx()}
    >
      Add a person
    </Button>
  </div>
);
```

`apps/web/public/styles/organisms/credit-rows.css`:

```css
.credit-rows {
  display: grid;
  gap: var(--size-2);
  justify-items: start;
}

.credit-rows__list {
  display: grid;
  gap: var(--size-3);
  justify-self: stretch;
}

/* Name and role side by side once there is room; stacked on a phone. */
.credit-rows__row {
  display: grid;
  gap: var(--size-2);

  @media (width >= 30rem) {
    grid-template-columns: 3fr 2fr;
  }
}

.credit-rows__error {
  color: var(--rule-red);
  font-weight: 700;
}
```

"Add a person" asks `/manage/credit-row` for one more row and appends it
to the list. Its ids are random, because a row fetched later cannot know
how many rows are already on the page.

`apps/web/src/components/organisms/entry-form.tsx`:

```tsx
import type { Child, FC } from 'hono/jsx';
import { useHx } from '../../nonce.ts';
import { Button } from '../atoms/button.tsx';
import { Notice } from '../atoms/notice.tsx';
import type { Swap } from '../molecules/hx-button.tsx';

export type Section = { legend: string; content: Child };

export type Request = Swap & { method: 'post' | 'put'; url: string };

type EntryFormProps = {
  request: Request;
  sections: Section[];
  submit: string;
  cancel: Child;
  invalid?: boolean;
};

const MORPH = { outerHTML: 'outerMorph', innerHTML: 'innerMorph', delete: 'delete' };

// A 422 answer is morphed into place, so focus and typed input survive. The
// attributes are spread because JSX names cannot contain ":422".
const attributes = ({ method, url, target, swap }: Request) => ({
  [`hx-${method}`]: url,
  'hx-target': target,
  'hx-swap': swap,
  'hx-status:422': `swap:${MORPH[swap]}`,
});

export const EntryForm: FC<EntryFormProps> = ({ request, sections, submit, cancel, invalid }) => (
  <form class="entry-form" {...attributes(request)} {...useHx()}>
    {invalid && <Notice tone="error">Some fields need another look.</Notice>}
    {sections.map((section) => (
      <fieldset class="entry-form__section">
        <legend class="entry-form__legend">{section.legend}</legend>
        {section.content}
      </fieldset>
    ))}
    <p class="entry-form__actions">
      <Button>{submit}</Button>
      {cancel}
    </p>
  </form>
);
```

`apps/web/public/styles/organisms/entry-form.css`:

```css
.entry-form {
  display: grid;
  gap: var(--size-5);
}

/* Each section reads as a block of the card under its own small heading. */
.entry-form__section {
  display: grid;
  gap: var(--size-3);
  margin: 0;
  padding: 0;
  border: 0;
}

.entry-form__legend {
  margin-block-end: var(--size-2);
  padding: 0;
  font-family: var(--font-serif);
  font-size: var(--font-size-3);
}

.entry-form__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
}
```

Each form is told its method, URL, target and swap. On a 422,
`hx-status:422` turns `outerHTML` into `outerMorph` (and `innerHTML` into
`innerMorph`), which updates the form in place and keeps focus, scroll and
typed values. A 200 swaps normally, replacing the form with the saved
card. Explicit `hx-post` and `hx-put` requests never push to the address
bar, so a failed save leaves the address alone.

`apps/web/src/components/organisms/search-form.tsx`:

```tsx
import { KINDS, type Kind } from '@shelf/catalogue';
import type { FC } from 'hono/jsx';
import { useHx } from '../../nonce.ts';
import { KIND_PLURALS } from '../../views/labels.ts';
import { Button } from '../atoms/button.tsx';
import { Input } from '../atoms/input.tsx';
import { Select } from '../atoms/select.tsx';

type SearchFormProps = { text?: string; kind?: Kind; live?: boolean };

const KIND_OPTIONS = KINDS.map((kind) => ({ value: kind, label: KIND_PLURALS[kind] }));

// Live search swaps only the results as you type and keeps the address bar in step.
const useLive = () => ({
  'hx-get': '/search',
  'hx-trigger': 'input delay:300ms, submit',
  'hx-target': '#search-results',
  'hx-push-url': 'true',
  ...useHx(),
});

export const SearchForm: FC<SearchFormProps> = ({ text = '', kind = '', live = false }) => (
  <form
    class="search-form"
    role="search"
    method="get"
    action="/search"
    {...(live ? useLive() : {})}
  >
    <label class="visually-hidden" for="search-text">
      Search the catalogue
    </label>
    <Input
      class="search-form__text"
      id="search-text"
      type="search"
      name="q"
      value={text}
      placeholder="Title, person or tag"
    />
    <label class="visually-hidden" for="search-kind">
      Kind
    </label>
    <Select id="search-kind" name="kind" options={KIND_OPTIONS} value={kind} blank="Everything" />
    <Button>Search</Button>
  </form>
);
```

`apps/web/public/styles/organisms/search-form.css`:

```css
.search-form {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--size-2) var(--size-3);
  align-items: end;
}

/* The text box takes the whole first row; kind and the button share the second. */
.search-form__text {
  grid-column: 1 / -1;
}
```

The live form triggers on `input` with a 300 ms debounce. Leave out the
`changed` modifier you will see in htmx examples: it compares the
triggering element's value, and a form has none, so the search would
never fire.

`apps/web/src/components/organisms/index-card.tsx` takes an `id`, so htmx
can target a card:

```tsx
import type { Child, FC, PropsWithChildren } from 'hono/jsx';
import { joinClassNames } from '../join-class-names.ts';

type IndexCardProps = PropsWithChildren<{
  title: Child;
  corner?: string;
  byline?: string;
  level?: 1 | 2;
  class?: string;
  // Lets htmx target this card, for example to swap it for its edit form.
  id?: string;
}>;

export const IndexCard: FC<IndexCardProps> = (props) => {
  const { title, corner, byline, level = 2, children } = props;
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <article class={joinClassNames('index-card', props.class)} id={props.id}>
      {corner && <p class="index-card__corner">{corner}</p>}
      <header class="index-card__header">
        {byline && <p>{byline}</p>}
        <Heading class="index-card__title">{title}</Heading>
      </header>
      {children}
    </article>
  );
};
```

`apps/web/src/components/organisms/work-card.tsx`:

```tsx
import type { FC, PropsWithChildren } from 'hono/jsx';
import type { WorkView } from '../../views/work.ts';
import { DetailList } from '../molecules/detail-list.tsx';
import { IndexCard } from './index-card.tsx';

type WorkCardProps = PropsWithChildren<{ work: WorkView }>;

// The work's own card; children are the signed-in actions, if any.
export const WorkCard: FC<WorkCardProps> = ({ work, children }) => (
  <IndexCard
    id="work"
    level={1}
    corner={work.kind}
    byline={work.subtitle ?? undefined}
    title={work.title}
  >
    {work.credits.length > 0 && (
      <ul class="work-card__credits">
        {work.credits.map((credit) => (
          <li>
            <a href={credit.href}>{credit.name}</a>, {credit.role.toLowerCase()}
          </li>
        ))}
      </ul>
    )}
    {work.details.length > 0 && <DetailList details={work.details} />}
    {work.description && <p class="work-card__description">{work.description}</p>}
    {children}
  </IndexCard>
);
```

`apps/web/public/styles/organisms/work-card.css`:

```css
.work-card__credits {
  display: grid;
}

.work-card__description {
  white-space: pre-line;
}
```

`apps/web/src/components/organisms/edition-card.tsx`:

```tsx
import type { Child, FC } from 'hono/jsx';
import type { CopyView, EditionView } from '../../views/work.ts';
import { DetailList } from '../molecules/detail-list.tsx';
import { TrackList } from '../molecules/track-list.tsx';
import { IndexCard } from './index-card.tsx';

type EditionCardProps = {
  edition: EditionView;
  actions?: Child;
  // One copy row each; the page decides whether a row shows its controls or a form.
  copyRow: (copy: CopyView) => Child;
  // A form for another copy, shown under the list while it is being added.
  adding?: Child;
};

const heading = (count: number) => (count === 1 ? 'One copy' : `${count} copies`);

export const EditionCard: FC<EditionCardProps> = ({ edition, actions, copyRow, adding }) => (
  <IndexCard id={`edition-${edition.id}`} corner="Edition" title={edition.title}>
    {edition.details.length > 0 && <DetailList details={edition.details} />}
    {edition.tracks.length > 0 && <TrackList tracks={edition.tracks} />}
    <h3 class="edition-card__heading">{heading(edition.copies.length)}</h3>
    <ol class="edition-card__copies">{edition.copies.map(copyRow)}</ol>
    {adding}
    {actions}
  </IndexCard>
);
```

`apps/web/public/styles/organisms/edition-card.css`:

```css
.edition-card__heading {
  font-size: var(--font-size-2);
}

.edition-card__copies {
  display: grid;
  gap: var(--size-3);
}
```

`apps/web/src/components/organisms/copy-row.tsx`:

```tsx
import type { Child, FC } from 'hono/jsx';
import type { CopyView } from '../../views/work.ts';
import { DetailList } from '../molecules/detail-list.tsx';

// One copy, or its edit form; either way it answers to #copy-<id>.
export const CopyRow: FC<{ copy: CopyView; actions?: Child; form?: Child }> = ({
  copy,
  actions,
  form,
}) => (
  <li class="copy-row" id={`copy-${copy.id}`}>
    {form ?? (
      <>
        <DetailList details={copy.details} />
        {actions}
      </>
    )}
  </li>
);
```

`apps/web/public/styles/organisms/copy-row.css`:

```css
/* Each copy is a short entry under a dashed rule, like a line drawn across the card. */
.copy-row {
  display: grid;
  gap: var(--size-2);
  padding-block-start: var(--size-2);
  border-block-start: 1px dashed var(--ink-muted);
}
```

`apps/web/src/components/organisms/edition-list.tsx`:

```tsx
import type { FC, PropsWithChildren } from 'hono/jsx';

// The editions of a work; htmx replaces its contents when one is added.
export const EditionList: FC<PropsWithChildren> = ({ children }) => (
  <div class="edition-list" id="editions">
    {children}
  </div>
);
```

`apps/web/public/styles/organisms/edition-list.css`:

```css
.edition-list {
  display: grid;
  gap: var(--size-4);
}
```

The work card, the edition list, each edition card and each copy row
answer to fixed ids (`#work`, `#editions`, `#edition-<id>`, `#copy-<id>`).
Those ids are the whole contract between the buttons in Part E and the
fragments the routes return.

### D6. Import the new stylesheets

`apps/web/public/styles/app.css`:

```css
/* One entry point. Later layers win, whatever the selector specificity. */
@layer vendor, reset, tokens, base, atoms, molecules, organisms, templates;

/* Open Props groups in use: spacing, type, radii, shadows, and two palettes for the rules. */
@import url('/vendor/open-props/sizes.min.css') layer(vendor);
@import url('/vendor/open-props/fonts.min.css') layer(vendor);
@import url('/vendor/open-props/borders.min.css') layer(vendor);
@import url('/vendor/open-props/shadows.min.css') layer(vendor);
@import url('/vendor/open-props/red.min.css') layer(vendor);
@import url('/vendor/open-props/blue.min.css') layer(vendor);
@import url('reset.css') layer(reset);
@import url('tokens.css') layer(tokens);
@import url('base.css') layer(base);

@import url('atoms/button.css') layer(atoms);
@import url('atoms/input.css') layer(atoms);
@import url('atoms/notice.css') layer(atoms);
@import url('atoms/select.css') layer(atoms);
@import url('atoms/textarea.css') layer(atoms);
@import url('atoms/wordmark.css') layer(atoms);

@import url('molecules/field.css') layer(molecules);
@import url('molecules/detail-list.css') layer(molecules);
@import url('molecules/sign-out-form.css') layer(molecules);
@import url('molecules/action-bar.css') layer(molecules);
@import url('molecules/kind-counts.css') layer(molecules);
@import url('molecules/track-list.css') layer(molecules);

@import url('organisms/index-card.css') layer(organisms);
@import url('organisms/item-card.css') layer(organisms);
@import url('organisms/item-list.css') layer(organisms);
@import url('organisms/site-header.css') layer(organisms);
@import url('organisms/sign-in-form.css') layer(organisms);
@import url('organisms/search-form.css') layer(organisms);
@import url('organisms/entry-form.css') layer(organisms);
@import url('organisms/credit-rows.css') layer(organisms);
@import url('organisms/work-card.css') layer(organisms);
@import url('organisms/edition-card.css') layer(organisms);
@import url('organisms/copy-row.css') layer(organisms);
@import url('organisms/edition-list.css') layer(organisms);

@import url('templates/page.css') layer(templates);
```

### Checkpoint D

```bash
# from the repo root
vp check --fix
```

Expect no warnings, lint errors or type errors. Tests are unchanged from
Checkpoint C.

```bash
# from the repo root
git add -A
git commit -m "feat(web): form layer, views and catalogue components"
```

## Part E: Pages, routes and tests

### E1. Whole pages

`apps/web/src/pages/sections.tsx` builds the three form sections every add
and edit form is made of:

```tsx
import type { Kind } from '@shelf/catalogue';
import type { Section } from '../components/organisms/entry-form.tsx';
import { CreditRows } from '../components/organisms/credit-rows.tsx';
import { FieldList } from '../components/organisms/field-list.tsx';
import { copyFields } from '../forms/copy.ts';
import { editionFields } from '../forms/edition.ts';
import { many, type FieldErrors, type FormValues } from '../forms/form-data.ts';
import { WORK_FIELDS } from '../forms/work.ts';

export type FormState = { values: FormValues; errors: FieldErrors };

// Typed rows back from the form, without the blank ones.
const typedCredits = (values: FormValues) => {
  const roles = many(values, 'creditRole');
  return many(values, 'creditName')
    .map((name, row) => ({ name, role: roles[row] ?? '' }))
    .filter((credit) => credit.name.trim() !== '');
};

export const workSection = (kind: Kind, { values, errors }: FormState): Section => ({
  legend: 'Work',
  content: (
    <>
      <FieldList fields={WORK_FIELDS} values={values} errors={errors} />
      <CreditRows kind={kind} credits={typedCredits(values)} error={errors.credits} />
    </>
  ),
});

export const editionSection = (kind: Kind, { values, errors }: FormState): Section => ({
  legend: 'Edition',
  content: <FieldList fields={editionFields(kind)} values={values} errors={errors} />,
});

export const copySection = (kind: Kind, { values, errors }: FormState): Section => ({
  legend: 'Your copy',
  content: <FieldList fields={copyFields(kind)} values={values} errors={errors} />,
});
```

`apps/web/src/pages/entry.tsx` is the add page, the one write that has a
page of its own:

```tsx
import type { SessionUser } from '@shelf/auth';
import type { Kind } from '@shelf/catalogue';
import { LinkButton } from '../components/atoms/button.tsx';
import { EntryForm } from '../components/organisms/entry-form.tsx';
import { IndexCard } from '../components/organisms/index-card.tsx';
import { Page } from '../components/templates/page.tsx';
import { KIND_LABELS } from '../views/labels.ts';
import { copySection, editionSection, workSection, type FormState } from './sections.tsx';

// The form alone is what a 422 answer sends back; it replaces itself.
export const NewWorkForm = ({ kind, state }: { kind: Kind; state: FormState }) => (
  <EntryForm
    request={{
      method: 'post',
      url: `/manage/works?kind=${kind}`,
      target: 'this',
      swap: 'outerHTML',
    }}
    sections={[workSection(kind, state), editionSection(kind, state), copySection(kind, state)]}
    submit="Save"
    cancel={<LinkButton href="/manage">Cancel</LinkButton>}
    invalid={Object.keys(state.errors).length > 0}
  />
);

export const NewWorkPage = ({
  user,
  kind,
  state,
}: {
  user: SessionUser;
  kind: Kind;
  state: FormState;
}) => (
  <Page title="Add to Shelf" user={user}>
    <IndexCard level={1} corner="Staff only" title={`Add a ${KIND_LABELS[kind].toLowerCase()}`}>
      <NewWorkForm kind={kind} state={state} />
    </IndexCard>
  </Page>
);
```

`apps/web/src/pages/home.tsx`:

```tsx
import type { SessionUser } from '@shelf/auth';
import type { Kind } from '@shelf/catalogue';
import { KindCounts } from '../components/molecules/kind-counts.tsx';
import type { ItemSummary } from '../components/organisms/item-card.tsx';
import { ItemList } from '../components/organisms/item-list.tsx';
import { SearchForm } from '../components/organisms/search-form.tsx';
import { Page } from '../components/templates/page.tsx';

type HomePageProps = {
  user: SessionUser | null;
  counts: Record<Kind, number>;
  recent: ItemSummary[];
};

export const HomePage = ({ user, counts, recent }: HomePageProps) => (
  <Page title="Shelf" user={user}>
    <h1>Shelf: A catalogue of books, games and records</h1>
    <SearchForm />
    <KindCounts counts={counts} />
    <h2>Recently added</h2>
    <ItemList items={recent} empty="Nothing is catalogued yet." />
  </Page>
);
```

The `<h1>` stays bare; the milestone 1 test looks for it exactly.

`apps/web/src/pages/search.tsx`:

```tsx
import type { SessionUser } from '@shelf/auth';
import type { Kind } from '@shelf/catalogue';
import { Notice } from '../components/atoms/notice.tsx';
import type { ItemSummary } from '../components/organisms/item-card.tsx';
import { ItemList } from '../components/organisms/item-list.tsx';
import { SearchForm } from '../components/organisms/search-form.tsx';
import { Page } from '../components/templates/page.tsx';

type SearchProps = { text: string; kind?: Kind; results: ItemSummary[] };

const summary = ({ text, kind, results }: SearchProps) => {
  if (!text && !kind) return 'Type a title, a name or a tag.';
  return results.length === 1 ? 'One match.' : `${results.length} matches.`;
};

// The part htmx swaps as you type; the notice is announced to screen readers.
export const SearchResults = (props: SearchProps) => (
  <>
    <Notice>{summary(props)}</Notice>
    {props.results.length > 0 && <ItemList items={props.results} empty="" />}
  </>
);

export const SearchPage = (props: SearchProps & { user: SessionUser | null }) => (
  <Page title={props.text ? `${props.text} - Shelf search` : 'Search - Shelf'} user={props.user}>
    <h1>Search</h1>
    <SearchForm text={props.text} kind={props.kind} live />
    <div id="search-results">
      <SearchResults {...props} />
    </div>
  </Page>
);
```

The `Notice` has `role="status"`, so a screen reader announces "3 matches."
each time the results change under the cursor.

`apps/web/src/pages/person.tsx`:

```tsx
import type { SessionUser } from '@shelf/auth';
import type { ItemSummary } from '../components/organisms/item-card.tsx';
import { ItemList } from '../components/organisms/item-list.tsx';
import { Page } from '../components/templates/page.tsx';

type PersonPageProps = { user: SessionUser | null; name: string; works: ItemSummary[] };

export const PersonPage = ({ user, name, works }: PersonPageProps) => (
  <Page title={`${name} - Shelf`} user={user}>
    <h1>{name}</h1>
    <ItemList items={works} empty="Nothing is credited to this name any more." />
  </Page>
);
```

`apps/web/src/pages/manage.tsx`:

```tsx
import type { SessionUser } from '@shelf/auth';
import { KINDS } from '@shelf/catalogue';
import { LinkButton } from '../components/atoms/button.tsx';
import { ActionBar } from '../components/molecules/action-bar.tsx';
import { IndexCard } from '../components/organisms/index-card.tsx';
import { Page } from '../components/templates/page.tsx';
import { KIND_LABELS } from '../views/labels.ts';

export const AddLinks = () => (
  <ActionBar>
    {KINDS.map((kind) => (
      <LinkButton href={`/manage/add?kind=${kind}`} variant="primary">
        {`Add a ${KIND_LABELS[kind].toLowerCase()}`}
      </LinkButton>
    ))}
  </ActionBar>
);

export const ManagePage = ({ user }: { user: SessionUser }) => (
  <Page title="Manage Shelf" user={user}>
    <IndexCard level={1} corner="Staff only" title="Manage">
      <p>Signed in as {user.displayName}.</p>
      <AddLinks />
      <p>
        <a href="/manage/styleguide">Component sheet</a>
      </p>
    </IndexCard>
  </Page>
);

export const ChooseKindPage = ({ user }: { user: SessionUser }) => (
  <Page title="Add to Shelf" user={user}>
    <IndexCard level={1} corner="Staff only" title="What are you adding?">
      <AddLinks />
    </IndexCard>
  </Page>
);
```

`apps/web/src/pages/not-found.tsx`:

```tsx
import type { SessionUser } from '@shelf/auth';
import { IndexCard } from '../components/organisms/index-card.tsx';
import { Page } from '../components/templates/page.tsx';

export const NotFoundPage = ({ user }: { user: SessionUser | null }) => (
  <Page title="Not found - Shelf" user={user}>
    <IndexCard level={1} corner="404" title="Not on the shelf">
      <p>
        Nothing is catalogued at this address. <a href="/">Back to the catalogue</a>.
      </p>
    </IndexCard>
  </Page>
);
```

The component sheet shows every new component. Its samples move to their
own file to keep the page under 100 lines.

`apps/web/src/pages/styleguide-samples.ts`:

```ts
import type { ItemSummary } from '../components/organisms/item-card.tsx';
import type { EditionView } from '../views/work.ts';

export const ITEMS: ItemSummary[] = [
  {
    href: '#',
    kind: 'Book',
    creator: 'Le Guin, Ursula K.',
    title: 'The Dispossessed: an ambiguous utopia',
    details: [
      ['Published', 'Gollancz, 1974'],
      ['Copies', '2'],
    ],
  },
  {
    href: '#',
    kind: 'Record',
    creator: 'Talk Talk',
    title: 'Spirit of Eden',
    details: [
      ['Released', 'Parlophone, 1988'],
      ['Copies', '1'],
    ],
  },
  {
    href: '#',
    kind: 'Game',
    creator: 'Uwe Rosenberg',
    title: 'Agricola',
    details: [
      ['Published', 'Lookout, 2007'],
      ['Copies', '1'],
    ],
  },
];

export const EDITION: EditionView = {
  id: 'sample',
  title: 'Parlophone, 1988',
  details: [
    ['Format', 'LP, 33 rpm'],
    ['Genre', 'Rock'],
  ],
  tracks: [
    { side: 'A', position: 1, title: 'The Rainbow', durationSeconds: 546 },
    { side: 'A', position: 2, title: 'Eden', durationSeconds: 457 },
    { side: 'B', position: 1, title: 'Desire', durationSeconds: 428 },
  ],
  copies: [
    {
      id: 'one',
      details: [
        ['Where', 'Record shelf'],
        ['Grades', 'VG+ / VG'],
      ],
    },
  ],
};
```

`apps/web/src/pages/styleguide.tsx`:

```tsx
import type { SessionUser } from '@shelf/auth';
import { Button, LinkButton } from '../components/atoms/button.tsx';
import { Notice } from '../components/atoms/notice.tsx';
import { ActionBar } from '../components/molecules/action-bar.tsx';
import { Field, SelectField, TextareaField } from '../components/molecules/field.tsx';
import { KindCounts } from '../components/molecules/kind-counts.tsx';
import { CreditRows } from '../components/organisms/credit-rows.tsx';
import { CopyRow } from '../components/organisms/copy-row.tsx';
import { EditionCard } from '../components/organisms/edition-card.tsx';
import { IndexCard } from '../components/organisms/index-card.tsx';
import { ItemList } from '../components/organisms/item-list.tsx';
import { SearchForm } from '../components/organisms/search-form.tsx';
import { Page } from '../components/templates/page.tsx';
import { EDITION, ITEMS } from './styleguide-samples.ts';

const GRADES = ['NM', 'VG+', 'VG'].map((grade) => ({ value: grade, label: grade }));

const Controls = () => (
  <IndexCard corner="Atoms and molecules" title="Controls">
    <Notice>Saved.</Notice>
    <Notice tone="error">Incorrect username or password.</Notice>
    <Field label="Title" name="title" value="Spirit of Eden" />
    <Field label="Year" name="year" value="19888" error="Enter 2100 or less." />
    <SelectField label="Vinyl grade" name="grade" options={GRADES} value="VG+" blank="Not graded" />
    <TextareaField label="Notes" name="notes" value="Gatefold sleeve." hint="Anything else." />
    <ActionBar>
      <Button>Save item</Button>
      <LinkButton href="#">Cancel</LinkButton>
      <Button variant="danger" type="button">
        Delete copy
      </Button>
    </ActionBar>
  </IndexCard>
);

export const StyleguidePage = ({ user }: { user: SessionUser }) => (
  <Page title="Component sheet" user={user}>
    <h1>Component sheet</h1>
    <SearchForm text="moore" />
    <KindCounts counts={{ book: 12, record: 4, board_game: 2 }} />
    <Controls />
    <IndexCard corner="Organisms" title="Credit rows">
      <CreditRows kind="book" credits={[{ name: 'Alan Moore', role: 'writer' }]} />
    </IndexCard>
    <EditionCard edition={EDITION} copyRow={(copy) => <CopyRow copy={copy} />} />
    <ItemList items={ITEMS} empty="Nothing is catalogued yet." />
    <ItemList items={[]} empty="Nothing is catalogued yet." />
  </Page>
);
```

### E2. The work page and its parts

The work page is assembled from parts, and each part is also what a route
returns when htmx swaps it. The signed-in controls on each part name the
URL to call and the id to swap.

`apps/web/src/pages/copy-part.tsx`:

```tsx
import { ActionBar } from '../components/molecules/action-bar.tsx';
import { HxButton } from '../components/molecules/hx-button.tsx';
import { CopyRow } from '../components/organisms/copy-row.tsx';
import type { CopyView } from '../views/work.ts';

// A copy and its controls; Delete answers with the whole edition card, so the
// copy count stays right.
type CopyPartProps = { copy: CopyView; editionId: string; signedIn: boolean };

export const CopyPart = ({ copy, editionId, signedIn }: CopyPartProps) => {
  const actions = signedIn && (
    <ActionBar>
      <HxButton
        method="get"
        url={`/manage/copies/${copy.id}/edit`}
        target={`#copy-${copy.id}`}
        swap="outerHTML"
      >
        Edit copy
      </HxButton>
      <HxButton
        method="delete"
        url={`/manage/copies/${copy.id}`}
        target={`#edition-${editionId}`}
        swap="outerHTML"
        variant="danger"
        confirm="Delete this copy?"
      >
        Delete copy
      </HxButton>
    </ActionBar>
  );
  return <CopyRow copy={copy} actions={actions} />;
};
```

`apps/web/src/pages/edition-part.tsx`:

```tsx
import type { Child } from 'hono/jsx';
import { ActionBar } from '../components/molecules/action-bar.tsx';
import { HxButton } from '../components/molecules/hx-button.tsx';
import { EditionCard } from '../components/organisms/edition-card.tsx';
import type { EditionView } from '../views/work.ts';
import { CopyPart } from './copy-part.tsx';

const EditionActions = ({ edition }: { edition: EditionView }) => {
  const card = `#edition-${edition.id}`;
  return (
    <ActionBar>
      <HxButton
        method="get"
        url={`/manage/editions/${edition.id}/edit`}
        target={card}
        swap="outerHTML"
      >
        Edit edition
      </HxButton>
      <HxButton
        method="get"
        url={`/manage/editions/${edition.id}/copies/new`}
        target={card}
        swap="outerHTML"
      >
        Add a copy
      </HxButton>
      <HxButton
        method="delete"
        url={`/manage/editions/${edition.id}`}
        target={card}
        swap="delete"
        variant="danger"
        confirm="Delete this edition and its copies?"
      >
        Delete edition
      </HxButton>
    </ActionBar>
  );
};

type EditionPartProps = { edition: EditionView; signedIn: boolean; adding?: Child };

export const EditionPart = ({ edition, signedIn, adding }: EditionPartProps) => (
  <EditionCard
    edition={edition}
    actions={signedIn && !adding && <EditionActions edition={edition} />}
    copyRow={(copy) => <CopyPart copy={copy} editionId={edition.id} signedIn={signedIn} />}
    adding={adding}
  />
);
```

While a copy is being added, the edition's own buttons are hidden, so the
card shows one form at a time.

`apps/web/src/pages/work-parts.tsx`:

```tsx
import type { Child } from 'hono/jsx';
import { ActionBar } from '../components/molecules/action-bar.tsx';
import { HxButton } from '../components/molecules/hx-button.tsx';
import { WorkCard } from '../components/organisms/work-card.tsx';
import type { WorkView } from '../views/work.ts';
import { EditionPart } from './edition-part.tsx';

// The pieces of a work page that htmx swaps. Each answers to a fixed id:
// #work, #editions, #edition-<id> and #copy-<id>.

const WorkActions = ({ work }: { work: WorkView }) => (
  <ActionBar>
    <HxButton method="get" url={`/manage/works/${work.id}/edit`} target="#work" swap="outerHTML">
      Edit work
    </HxButton>
    <HxButton
      method="get"
      url={`/manage/works/${work.id}/editions/new`}
      target="#editions"
      swap="innerHTML"
    >
      Add an edition
    </HxButton>
    <HxButton
      method="delete"
      url={`/manage/works/${work.id}`}
      target="#work"
      swap="outerHTML"
      variant="danger"
      confirm={`Delete ${work.title}, every edition and every copy?`}
    >
      Delete work
    </HxButton>
  </ActionBar>
);

export const WorkPart = ({ work, signedIn }: { work: WorkView; signedIn: boolean }) => (
  <WorkCard work={work}>{signedIn && <WorkActions work={work} />}</WorkCard>
);

type EditionsPartProps = { work: WorkView; signedIn: boolean; adding?: Child };

// The contents of #editions: every edition, then a new-edition form while one is being added.
export const EditionsPart = ({ work, signedIn, adding }: EditionsPartProps) => (
  <>
    {work.editions.map((edition) => (
      <EditionPart edition={edition} signedIn={signedIn} />
    ))}
    {adding}
  </>
);
```

`apps/web/src/pages/work.tsx`:

```tsx
import type { SessionUser } from '@shelf/auth';
import { EditionList } from '../components/organisms/edition-list.tsx';
import { Page } from '../components/templates/page.tsx';
import type { WorkView } from '../views/work.ts';
import { EditionsPart, WorkPart } from './work-parts.tsx';

// Editing controls appear only for a signed-in user, and edit in place.
export const WorkPage = ({ user, work }: { user: SessionUser | null; work: WorkView }) => (
  <Page title={`${work.title} - Shelf`} user={user}>
    <WorkPart work={work} signedIn={user !== null} />
    <EditionList>
      <EditionsPart work={work} signedIn={user !== null} />
    </EditionList>
  </Page>
);
```

The forms that take a part's place:

`apps/web/src/pages/in-place-form.tsx`:

```tsx
import { HxButton } from '../components/molecules/hx-button.tsx';
import { EntryForm, type Request, type Section } from '../components/organisms/entry-form.tsx';
import type { FormState } from './sections.tsx';

type FormProps = { request: Request; sections: Section[]; state: FormState; cancel: string };

// Every in-place form: Cancel fetches the resource back into the same place.
export const InPlaceForm = ({ request, sections, state, cancel }: FormProps) => (
  <EntryForm
    request={request}
    sections={sections}
    submit="Save"
    invalid={Object.keys(state.errors).length > 0}
    cancel={
      <HxButton method="get" url={cancel} target={request.target} swap={request.swap}>
        Cancel
      </HxButton>
    }
  />
);
```

Cancel is a `GET` of the resource itself: `/manage/works/:id` answers with
the work card, `/manage/copies/:id` with the copy row, and so on. Nothing
on the page has to remember what was there before the form.

`apps/web/src/pages/work-forms.tsx`:

```tsx
import type { EditionDetail, WorkDetail } from '@shelf/db';
import { IndexCard } from '../components/organisms/index-card.tsx';
import { InPlaceForm } from './in-place-form.tsx';
import { copySection, editionSection, workSection, type FormState } from './sections.tsx';

export const WorkEditPart = ({ work, state }: { work: WorkDetail; state: FormState }) => (
  <IndexCard id="work" level={1} corner="Editing" title={`Edit ${work.title}`}>
    <InPlaceForm
      request={{
        method: 'put',
        url: `/manage/works/${work.id}`,
        target: '#work',
        swap: 'outerHTML',
      }}
      sections={[workSection(work.kind, state)]}
      state={state}
      cancel={`/manage/works/${work.id}`}
    />
  </IndexCard>
);

export const EditionEditPart = ({
  edition,
  state,
}: {
  edition: EditionDetail;
  state: FormState;
}) => (
  <IndexCard id={`edition-${edition.id}`} corner="Editing" title="Edit edition">
    <InPlaceForm
      request={{
        method: 'put',
        url: `/manage/editions/${edition.id}`,
        target: `#edition-${edition.id}`,
        swap: 'outerHTML',
      }}
      sections={[editionSection(edition.kind, state)]}
      state={state}
      cancel={`/manage/editions/${edition.id}`}
    />
  </IndexCard>
);

export const NewEditionForm = ({ work, state }: { work: WorkDetail; state: FormState }) => (
  <IndexCard corner="Adding" title="Another edition">
    <InPlaceForm
      request={{
        method: 'post',
        url: `/manage/works/${work.id}/editions`,
        target: '#editions',
        swap: 'innerHTML',
      }}
      sections={[editionSection(work.kind, state), copySection(work.kind, state)]}
      state={state}
      cancel={`/manage/works/${work.id}/editions`}
    />
  </IndexCard>
);
```

`apps/web/src/pages/copy-forms.tsx`:

```tsx
import type { CopyDetail, EditionDetail } from '@shelf/db';
import { CopyRow } from '../components/organisms/copy-row.tsx';
import type { Request } from '../components/organisms/entry-form.tsx';
import { toCopyView } from '../views/work.ts';
import { InPlaceForm } from './in-place-form.tsx';
import { copySection, type FormState } from './sections.tsx';

export const NewCopyForm = ({ edition, state }: { edition: EditionDetail; state: FormState }) => (
  <InPlaceForm
    request={{
      method: 'post',
      url: `/manage/editions/${edition.id}/copies`,
      target: `#edition-${edition.id}`,
      swap: 'outerHTML',
    }}
    sections={[copySection(edition.kind, state)]}
    state={state}
    cancel={`/manage/editions/${edition.id}`}
  />
);

export const CopyEditPart = ({ copy, state }: { copy: CopyDetail; state: FormState }) => {
  const request: Request = {
    method: 'put',
    url: `/manage/copies/${copy.id}`,
    target: `#copy-${copy.id}`,
    swap: 'outerHTML',
  };
  const form = (
    <InPlaceForm
      request={request}
      sections={[copySection(copy.kind, state)]}
      state={state}
      cancel={`/manage/copies/${copy.id}`}
    />
  );
  return <CopyRow copy={toCopyView(copy)} form={form} />;
};
```

### E3. Routes

`apps/web/src/routes/kind.ts`:

```ts
import { KINDS, type Kind } from '@shelf/catalogue';

export const asKind = (value: string | undefined): Kind | undefined =>
  KINDS.find((kind) => kind === value);
```

`apps/web/src/routes/entry.tsx`:

```tsx
import type { Context } from 'hono';
import type { AppEnv } from '../env.ts';
import type { FieldErrors, FormValues } from '../forms/form-data.ts';
import type { FormState } from '../pages/sections.tsx';

export const fresh = (values: FormValues): FormState => ({ values, errors: {} });

// A form with mistakes answers 422, which the form morphs into place.
export const statusOf = (errors: FieldErrors) => (Object.keys(errors).length > 0 ? 422 : 200);

// After a create or a delete, htmx fetches this path and pushes it to the address bar.
export const relocate = (context: Context<AppEnv>, path: string) => {
  context.header('HX-Location', path);
  return context.body(null, 200);
};
```

`HX-Location` makes htmx fetch the path, swap it in as a boosted
navigation would and push it to the address bar. It is how a create or a
whole-work delete moves you to another page without a full reload.

`apps/web/src/routes/load.ts`:

```ts
import { getEdition, getWork, type Db } from '@shelf/db';
import { toEditionView, toWorkView } from '../views/work.ts';

// A work's view after a change, for the fragment that shows it.
export const workView = async (db: Db, id: string) => {
  const work = await getWork(db, id);
  return work ? toWorkView(work) : null;
};

// One edition with its copies, read through its work so the copies come too.
export const editionView = async (db: Db, id: string) => {
  const edition = await getEdition(db, id);
  const work = edition && (await getWork(db, edition.workId));
  const found = work?.editions.find((candidate) => candidate.id === id);
  return found ? toEditionView(found) : null;
};
```

`apps/web/src/routes/catalogue.tsx`:

```tsx
import { countByKind, getPerson, getWork, listRecent, searchWorks } from '@shelf/db';
import { Hono } from 'hono';
import type { AppEnv } from '../env.ts';
import { HomePage } from '../pages/home.tsx';
import { PersonPage } from '../pages/person.tsx';
import { SearchPage, SearchResults } from '../pages/search.tsx';
import { WorkPage } from '../pages/work.tsx';
import { render } from '../render.tsx';
import type { Detail } from '../components/molecules/detail-list.tsx';
import { sentence } from '../views/labels.ts';
import { toItemSummary } from '../views/summary.ts';
import { toWorkView } from '../views/work.ts';
import { asKind } from './kind.ts';

export const catalogueRoutes = new Hono<AppEnv>();

catalogueRoutes.get('/', async (context) => {
  const [counts, recent] = await Promise.all([
    countByKind(context.var.db),
    listRecent(context.var.db),
  ]);
  const page = (
    <HomePage user={context.var.user} counts={counts} recent={recent.map(toItemSummary)} />
  );
  return render(context, page);
});

catalogueRoutes.get('/search', async (context) => {
  const text = (context.req.query('q') ?? '').trim();
  const kind = asKind(context.req.query('kind'));
  const results = (await searchWorks(context.var.db, { text, kind })).map(toItemSummary);
  const props = { text, kind, results };
  return render(context, <SearchPage {...props} user={context.var.user} />, {
    fragment: <SearchResults {...props} />,
  });
});

catalogueRoutes.get('/works/:id', async (context) => {
  const work = await getWork(context.var.db, context.req.param('id'));
  if (!work) return context.notFound();
  return render(context, <WorkPage user={context.var.user} work={toWorkView(work)} />);
});

catalogueRoutes.get('/people/:id', async (context) => {
  const person = await getPerson(context.var.db, context.req.param('id'));
  if (!person) return context.notFound();
  const works = person.works.map((work) => {
    const item = toItemSummary(work);
    return { ...item, details: [['Role', sentence(work.role)] as Detail, ...item.details] };
  });
  return render(context, <PersonPage user={context.var.user} name={person.name} works={works} />);
});
```

`apps/web/src/routes/works.tsx`:

```tsx
import { createWork, deleteWork, getWork, updateWork } from '@shelf/db';
import { Hono } from 'hono';
import type { AppEnv } from '../env.ts';
import { FORM_DEFAULTS } from '../forms/defaults.ts';
import { readForm } from '../forms/form-data.ts';
import { parseNewWork } from '../forms/new-entry.ts';
import { parseWork, workValues } from '../forms/work.ts';
import { NewWorkForm, NewWorkPage } from '../pages/entry.tsx';
import { ChooseKindPage } from '../pages/manage.tsx';
import { WorkEditPart } from '../pages/work-forms.tsx';
import { WorkPart } from '../pages/work-parts.tsx';
import { render, renderPart } from '../render.tsx';
import { fresh, relocate, statusOf } from './entry.tsx';
import { asKind } from './kind.ts';
import { workView } from './load.ts';

export const workRoutes = new Hono<AppEnv>();

workRoutes.get('/add', (context) => {
  const user = context.var.user!;
  const kind = asKind(context.req.query('kind'));
  if (!kind) return render(context, <ChooseKindPage user={user} />);
  return render(
    context,
    <NewWorkPage user={user} kind={kind} state={fresh(FORM_DEFAULTS[kind])} />,
  );
});

workRoutes.post('/works', async (context) => {
  const kind = asKind(context.req.query('kind'));
  if (!kind) return context.notFound();
  const values = await readForm(context);
  const parsed = parseNewWork(values, kind);
  if (parsed.ok)
    return relocate(context, `/works/${await createWork(context.var.db, parsed.value)}`);
  const state = { values, errors: parsed.errors };
  return renderPart(context, <NewWorkForm kind={kind} state={state} />, 422);
});

workRoutes.get('/works/:id', async (context) => {
  const work = await workView(context.var.db, context.req.param('id'));
  if (!work) return context.notFound();
  return renderPart(context, <WorkPart work={work} signedIn />);
});

workRoutes.get('/works/:id/edit', async (context) => {
  const work = await getWork(context.var.db, context.req.param('id'));
  if (!work) return context.notFound();
  return renderPart(context, <WorkEditPart work={work} state={fresh(workValues(work))} />);
});

workRoutes.put('/works/:id', async (context) => {
  const work = await getWork(context.var.db, context.req.param('id'));
  if (!work) return context.notFound();
  const values = await readForm(context);
  const parsed = parseWork(values, work.kind);
  if (!parsed.ok) {
    const state = { values, errors: parsed.errors };
    return renderPart(context, <WorkEditPart work={work} state={state} />, statusOf(state.errors));
  }
  await updateWork(context.var.db, work.id, parsed.value);
  return renderPart(
    context,
    <WorkPart work={(await workView(context.var.db, work.id))!} signedIn />,
  );
});

workRoutes.delete('/works/:id', async (context) => {
  await deleteWork(context.var.db, context.req.param('id'));
  return relocate(context, '/manage');
});
```

`apps/web/src/routes/work-editions.tsx`:

```tsx
import { addEdition, getWork } from '@shelf/db';
import { Hono } from 'hono';
import type { AppEnv } from '../env.ts';
import { FORM_DEFAULTS } from '../forms/defaults.ts';
import { readForm } from '../forms/form-data.ts';
import { parseNewEdition } from '../forms/new-entry.ts';
import { NewEditionForm } from '../pages/work-forms.tsx';
import { EditionsPart } from '../pages/work-parts.tsx';
import { renderPart } from '../render.tsx';
import { fresh } from './entry.tsx';
import { workView } from './load.ts';

// A work's editions as one region, #editions, which adding an edition replaces.
export const workEditionRoutes = new Hono<AppEnv>();

workEditionRoutes.get('/works/:id/editions', async (context) => {
  const work = await workView(context.var.db, context.req.param('id'));
  if (!work) return context.notFound();
  return renderPart(context, <EditionsPart work={work} signedIn />);
});

workEditionRoutes.get('/works/:id/editions/new', async (context) => {
  const work = await getWork(context.var.db, context.req.param('id'));
  if (!work) return context.notFound();
  const form = <NewEditionForm work={work} state={fresh(FORM_DEFAULTS[work.kind])} />;
  return renderPart(
    context,
    <EditionsPart work={(await workView(context.var.db, work.id))!} signedIn adding={form} />,
  );
});

workEditionRoutes.post('/works/:id/editions', async (context) => {
  const work = await getWork(context.var.db, context.req.param('id'));
  if (!work) return context.notFound();
  const values = await readForm(context);
  const parsed = parseNewEdition(values, work.kind);
  if (parsed.ok) await addEdition(context.var.db, work.id, parsed.value.edition, parsed.value.copy);
  const form = parsed.ok ? undefined : (
    <NewEditionForm work={work} state={{ values, errors: parsed.errors }} />
  );
  const view = (await workView(context.var.db, work.id))!;
  return renderPart(
    context,
    <EditionsPart work={view} signedIn adding={form} />,
    parsed.ok ? 200 : 422,
  );
});
```

`apps/web/src/routes/editions.tsx`:

```tsx
import { deleteEdition, getEdition, updateEdition } from '@shelf/db';
import { Hono } from 'hono';
import type { AppEnv } from '../env.ts';
import { editionValues, parseEdition } from '../forms/edition.ts';
import { readForm } from '../forms/form-data.ts';
import { EditionPart } from '../pages/edition-part.tsx';
import { EditionEditPart } from '../pages/work-forms.tsx';
import { renderPart } from '../render.tsx';
import { fresh } from './entry.tsx';
import { editionView } from './load.ts';

export const editionRoutes = new Hono<AppEnv>();

editionRoutes.get('/editions/:id', async (context) => {
  const edition = await editionView(context.var.db, context.req.param('id'));
  if (!edition) return context.notFound();
  return renderPart(context, <EditionPart edition={edition} signedIn />);
});

editionRoutes.get('/editions/:id/edit', async (context) => {
  const edition = await getEdition(context.var.db, context.req.param('id'));
  if (!edition) return context.notFound();
  return renderPart(
    context,
    <EditionEditPart edition={edition} state={fresh(editionValues(edition))} />,
  );
});

editionRoutes.put('/editions/:id', async (context) => {
  const edition = await getEdition(context.var.db, context.req.param('id'));
  if (!edition) return context.notFound();
  const values = await readForm(context);
  const parsed = parseEdition(values, edition.kind);
  if (!parsed.ok) {
    const state = { values, errors: parsed.errors };
    return renderPart(context, <EditionEditPart edition={edition} state={state} />, 422);
  }
  await updateEdition(context.var.db, edition.id, parsed.value);
  return renderPart(
    context,
    <EditionPart edition={(await editionView(context.var.db, edition.id))!} signedIn />,
  );
});

// Answers 200 with nothing; the button's hx-swap="delete" removes the card.
editionRoutes.delete('/editions/:id', async (context) => {
  await deleteEdition(context.var.db, context.req.param('id'));
  return context.body(null, 200);
});
```

`apps/web/src/routes/copies.tsx`:

```tsx
import { addCopy, deleteCopy, getCopy, getEdition, updateCopy } from '@shelf/db';
import { Hono } from 'hono';
import type { AppEnv } from '../env.ts';
import { copyValues, parseCopy } from '../forms/copy.ts';
import { FORM_DEFAULTS } from '../forms/defaults.ts';
import { readForm } from '../forms/form-data.ts';
import { CopyPart } from '../pages/copy-part.tsx';
import { EditionPart } from '../pages/edition-part.tsx';
import { CopyEditPart, NewCopyForm } from '../pages/copy-forms.tsx';
import { renderPart } from '../render.tsx';
import { toCopyView } from '../views/work.ts';
import { fresh } from './entry.tsx';
import { editionView } from './load.ts';

export const copyRoutes = new Hono<AppEnv>();

// Adding a copy swaps the whole edition card, so its copy count updates too.
copyRoutes.get('/editions/:id/copies/new', async (context) => {
  const edition = await getEdition(context.var.db, context.req.param('id'));
  if (!edition) return context.notFound();
  const form = <NewCopyForm edition={edition} state={fresh(FORM_DEFAULTS[edition.kind])} />;
  const view = (await editionView(context.var.db, edition.id))!;
  return renderPart(context, <EditionPart edition={view} signedIn adding={form} />);
});

copyRoutes.post('/editions/:id/copies', async (context) => {
  const edition = await getEdition(context.var.db, context.req.param('id'));
  if (!edition) return context.notFound();
  const values = await readForm(context);
  const parsed = parseCopy(values, edition.kind);
  if (parsed.ok) await addCopy(context.var.db, edition.id, parsed.value);
  const form = parsed.ok ? undefined : (
    <NewCopyForm edition={edition} state={{ values, errors: parsed.errors }} />
  );
  const view = (await editionView(context.var.db, edition.id))!;
  return renderPart(
    context,
    <EditionPart edition={view} signedIn adding={form} />,
    parsed.ok ? 200 : 422,
  );
});

copyRoutes.get('/copies/:id', async (context) => {
  const copy = await getCopy(context.var.db, context.req.param('id'));
  if (!copy) return context.notFound();
  return renderPart(
    context,
    <CopyPart copy={toCopyView(copy)} editionId={copy.editionId} signedIn />,
  );
});

copyRoutes.get('/copies/:id/edit', async (context) => {
  const copy = await getCopy(context.var.db, context.req.param('id'));
  if (!copy) return context.notFound();
  return renderPart(context, <CopyEditPart copy={copy} state={fresh(copyValues(copy))} />);
});

copyRoutes.put('/copies/:id', async (context) => {
  const copy = await getCopy(context.var.db, context.req.param('id'));
  if (!copy) return context.notFound();
  const values = await readForm(context);
  const parsed = parseCopy(values, copy.kind);
  if (!parsed.ok) {
    const state = { values, errors: parsed.errors };
    return renderPart(context, <CopyEditPart copy={copy} state={state} />, 422);
  }
  await updateCopy(context.var.db, copy.id, parsed.value);
  const saved = (await getCopy(context.var.db, copy.id))!;
  return renderPart(
    context,
    <CopyPart copy={toCopyView(saved)} editionId={copy.editionId} signedIn />,
  );
});

// Answers with the edition card, whose copy count has dropped by one.
copyRoutes.delete('/copies/:id', async (context) => {
  const copy = await getCopy(context.var.db, context.req.param('id'));
  if (!copy) return context.notFound();
  await deleteCopy(context.var.db, copy.id);
  const view = (await editionView(context.var.db, copy.editionId))!;
  return renderPart(context, <EditionPart edition={view} signedIn />);
});
```

Every route follows the same shape: load what it acts on (404 if
missing), read the form, parse it, then answer with the part that
belongs in the target; with status 422 and the form when parsing fails.

`apps/web/src/routes/manage.tsx`:

```tsx
import { Hono } from 'hono';
import { requireUser } from '@shelf/auth';
import type { AppEnv } from '../env.ts';
import { CreditRow } from '../components/organisms/credit-rows.tsx';
import { ManagePage } from '../pages/manage.tsx';
import { StyleguidePage } from '../pages/styleguide.tsx';
import { render, renderPart } from '../render.tsx';
import { copyRoutes } from './copies.tsx';
import { editionRoutes } from './editions.tsx';
import { asKind } from './kind.ts';
import { workEditionRoutes } from './work-editions.tsx';
import { workRoutes } from './works.tsx';

export const manageRoutes = new Hono<AppEnv>();

manageRoutes.use(requireUser);

manageRoutes.get('/', (context) => render(context, <ManagePage user={context.var.user!} />));

manageRoutes.get('/styleguide', (context) =>
  render(context, <StyleguidePage user={context.var.user!} />),
);

// One blank credit row, appended by the form's "Add a person" button.
manageRoutes.get('/credit-row', (context) => {
  const kind = asKind(context.req.query('kind'));
  if (!kind) return context.notFound();
  return renderPart(context, <CreditRow kind={kind} credit={{ name: '', role: '' }} />);
});

manageRoutes.route('/', workRoutes);
manageRoutes.route('/', workEditionRoutes);
manageRoutes.route('/', editionRoutes);
manageRoutes.route('/', copyRoutes);
```

`requireUser` runs before every route mounted here, so none of them
checks the session itself; the user is always there, which is why they
read `context.var.user!` and render parts with `signedIn`. When a session
has expired, `requireUser` answers an htmx request with 401 and
`HX-Redirect`, so a button pressed on a stale page takes you to sign in
rather than swapping an error into the card.

`apps/web/src/index.tsx`:

```tsx
import { Hono } from 'hono';
import { csrf } from 'hono/csrf';
import { loadUser } from '@shelf/auth';
import { createDb } from '@shelf/db';
import type { AppEnv } from './env.ts';
import { NotFoundPage } from './pages/not-found.tsx';
import { render } from './render.tsx';
import { authRoutes } from './routes/auth.tsx';
import { catalogueRoutes } from './routes/catalogue.tsx';
import { manageRoutes } from './routes/manage.tsx';
import { securityHeaders } from './security.ts';

const app = new Hono<AppEnv>();

app.use(securityHeaders);
app.use(csrf());
app.use(async (context, next) => {
  context.set('db', createDb(context.env.DB));
  await next();
});
app.use(loadUser);

app.route('/', catalogueRoutes);
app.route('/', authRoutes);
app.route('/manage', manageRoutes);

app.notFound((context) => {
  const page = <NotFoundPage user={context.var.user ?? null} />;
  return render(context, page, { status: 404 });
});

export default app;
```

The public routes are mounted first; `/manage` paths never match them.
`app.notFound` replaces Hono's plain-text 404, and `context.notFound()` in
any route lands there.

### E4. Tests

`apps/web/src/testing.ts` gains a signed-in helper and `send`, which makes
a request the way htmx does:

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

type TestApp = Awaited<ReturnType<typeof createTestApp>>;

// Adds the test user, signs in and returns headers that carry the session.
export const signedIn = async (test: TestApp) => {
  await addUser(test);
  const body = loginForm('dan', PASSWORD);
  const response = await test.request('/login', {
    method: 'POST',
    body,
    headers: { origin: ORIGIN },
  });
  const cookie = (response.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
  return { cookie, origin: ORIGIN };
};

// A request as htmx sends it: form-encoded, from this site, marked as htmx.
export const send = (
  test: TestApp,
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  headers: Record<string, string>,
  form: Record<string, string> = {},
) =>
  test.request(path, {
    method,
    body: method === 'DELETE' ? undefined : new URLSearchParams(form),
    headers: { ...headers, 'HX-Request': 'true', 'HX-Request-Type': 'partial' },
  });
```

`apps/web/src/routes/catalogue.test.tsx`:

```tsx
import { createWork } from '@shelf/db';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { createTestApp, signedIn } from '../testing.ts';
import { watchmen } from '@shelf/db/testing';

type TestApp = Awaited<ReturnType<typeof createTestApp>>;

describe('the public catalogue', () => {
  let test: TestApp;

  beforeEach(async () => {
    test = await createTestApp();
  });

  afterEach(async () => {
    await test.dispose();
  });

  it('lists a saved work on the home page', async () => {
    // Arrange
    await createWork(test.db, watchmen());

    // Act
    const html = await (await test.request('/')).text();

    // Assert
    expect(html).toContain('Watchmen');
    expect(html).toContain('1</span> Books');
  });

  it('answers a live search with only the results', async () => {
    // Arrange
    await createWork(test.db, watchmen());
    const headers = { 'HX-Request': 'true', 'HX-Request-Type': 'partial' };

    // Act
    const response = await test.request('/search?q=gibb', { headers });

    // Assert
    const html = await response.text();
    expect(html).toContain('Watchmen');
    expect(html).not.toContain('<!doctype html>');
    expect(response.headers.get('vary')).toContain('HX-Request-Type');
  });

  it('shows the whole search page to a plain request', async () => {
    // Arrange
    await createWork(test.db, watchmen());

    // Act
    const html = await (await test.request('/search?q=watch')).text();

    // Assert
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Watchmen');
  });

  it('shows editing controls on a work only when signed in', async () => {
    // Arrange
    const id = await createWork(test.db, watchmen());
    const headers = await signedIn(test);

    // Act
    const visitor = await (await test.request(`/works/${id}`)).text();
    const editor = await (await test.request(`/works/${id}`, { headers })).text();

    // Assert
    expect(visitor).toContain('Alan Moore');
    expect(visitor).not.toContain('Edit work');
    expect(editor).toContain('Edit work');
  });

  it('answers an unknown work with a 404 page', async () => {
    // Arrange
    const path = '/works/missing';

    // Act
    const response = await test.request(path);

    // Assert
    expect(response.status).toBe(404);
    expect(await response.text()).toContain('Not on the shelf');
  });

  it('stamps the response nonce on every htmx element', async () => {
    // Arrange
    const id = await createWork(test.db, watchmen());
    const headers = await signedIn(test);

    // Act
    const response = await test.request(`/works/${id}`, { headers });

    // Assert
    const policy = response.headers.get('content-security-policy') ?? '';
    const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
    const tags = (await response.text()).match(/<[a-z]+ [^>]*\shx-[a-z]+[^>]*>/g) ?? [];
    expect(tags.length).toBeGreaterThan(5);
    for (const tag of tags) expect(tag).toContain(`hx-nonce="${nonce}"`);
  });
});
```

The last test is the one to keep an eye on: it finds every tag with an
`hx-` attribute on a signed-in work page and checks each carries the
response's nonce. A component that forgets `useHx()` fails here rather than
silently on your phone.

`apps/web/src/routes/entries.test.tsx`:

```tsx
import { createWork, getWork } from '@shelf/db';
import { watchmen } from '@shelf/db/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { createTestApp, send, signedIn } from '../testing.ts';

type TestApp = Awaited<ReturnType<typeof createTestApp>>;

const BOOK = {
  title: 'The Dispossessed',
  creditName: 'Ursula K. Le Guin',
  creditRole: 'author',
  genre: 'novel',
  binding: 'paperback',
  isbn13: '978-0-06-051275-0',
  location: 'Second shelf',
};

describe('adding, editing and deleting', () => {
  let test: TestApp;
  let headers: Record<string, string>;

  beforeEach(async () => {
    test = await createTestApp();
    headers = await signedIn(test);
  });

  afterEach(async () => {
    await test.dispose();
  });

  it('adds a book and sends htmx to its page', async () => {
    // Arrange
    const form = BOOK;

    // Act
    const response = await send(test, 'POST', '/manage/works?kind=book', headers, form);

    // Assert
    const location = response.headers.get('hx-location') ?? '';
    expect(response.status).toBe(200);
    expect(location).toMatch(/^\/works\//);
    expect(await (await test.request(location)).text()).toContain('9780060512750');
  });

  it('answers a bad form with 422 and only the form, keeping what was typed', async () => {
    // Arrange
    const form = { ...BOOK, title: '', isbn13: '12345' };

    // Act
    const response = await send(test, 'POST', '/manage/works?kind=book', headers, form);

    // Assert
    const html = await response.text();
    expect(response.status).toBe(422);
    expect(html).not.toContain('<!doctype html>');
    expect(html).toContain('Enter the title.');
    expect(html).toContain('An ISBN-13 is 13 digits starting 978 or 979.');
    expect(html).toContain('value="Ursula K. Le Guin"');
  });

  it('puts an edited work and answers with its card', async () => {
    // Arrange
    const id = await createWork(test.db, watchmen());
    const form = {
      title: 'Watchmen',
      subtitle: 'Absolute edition',
      creditName: 'Alan Moore',
      creditRole: 'writer',
    };

    // Act
    const response = await send(test, 'PUT', `/manage/works/${id}`, headers, form);

    // Assert
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('id="work"');
    expect((await getWork(test.db, id))?.subtitle).toBe('Absolute edition');
  });

  it('adds a copy, then deletes it, answering with the edition card each time', async () => {
    // Arrange
    const id = await createWork(test.db, watchmen());
    const edition = (await getWork(test.db, id))!.editions[0]!;
    const added = await send(test, 'POST', `/manage/editions/${edition.id}/copies`, headers, {
      location: 'Loft',
    });
    const copy = (await getWork(test.db, id))!.editions[0]!.copies[1]!;

    // Act
    const deleted = await send(test, 'DELETE', `/manage/copies/${copy.id}`, headers);

    // Assert
    expect(await added.text()).toContain('2 copies');
    expect(await deleted.text()).toContain('One copy');
  });

  it('deletes a work and sends htmx to /manage', async () => {
    // Arrange
    const id = await createWork(test.db, watchmen());

    // Act
    const response = await send(test, 'DELETE', `/manage/works/${id}`, headers);

    // Assert
    expect(response.headers.get('hx-location')).toBe('/manage');
    expect(await getWork(test.db, id)).toBeNull();
  });

  it('refuses a put from another site', async () => {
    // Arrange
    const id = await createWork(test.db, watchmen());
    const foreign = { ...headers, origin: 'https://evil.example' };

    // Act
    const response = await send(test, 'PUT', `/manage/works/${id}`, foreign, { title: 'Stolen' });

    // Assert
    expect(response.status).toBe(403);
  });

  it('sends a signed-out visitor to sign in and back to the add page', async () => {
    // Arrange
    const path = '/manage/add?kind=book';

    // Act
    const response = await test.request(path);

    // Assert
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/login?next=%2Fmanage%2Fadd%3Fkind%3Dbook');
  });
});
```

### Checkpoint E

```bash
# from the repo root
vp check --fix
vp run ready
```

Expect 52 tests: 9 in `catalogue`, 10 in `auth`, 11 in `db` and 22 in
`web`, and a build.

### E5. Try it locally

```bash
# from apps/web
vp run migrate --local
```

Wrangler lists `0001_search.sql` as applied (`0000` was applied in
milestone 0). Then, with `vp run dev` running and signed in as your local
user:

1. Open `/manage`, choose "Add a record", and fill in a title, a person and
   a genre. Press "Add a person"; a third blank row appears.
2. Type `19888` as the first year, keep the cursor there and save. "Enter
   2100 or less." appears under the field, the cursor is still in it, and
   everything else you typed is still there.
3. Correct the year, add a tracklist line such as `A1 The Rainbow 9:06`,
   and save. You land on the work page, and the address bar shows it.
4. "Edit work": the card turns into its form. Add a subtitle and save; the
   card comes back with it, and the address bar has not changed. Try
   "Edit work" then "Cancel" too.
5. "Add a copy", give it a location, save; the edition shows "2 copies".
6. "Edit copy" on one copy, choose a vinyl grade, save; only that copy
   changes.
7. "Delete copy" asks first; accept, and the edition shows "One copy".
8. "Add an edition", fill in a genre and save; a second edition card
   appears. "Delete edition" on it asks, then removes it.
9. Open `/search` and type part of the person's name. Results appear after
   a pause, and the address bar follows what you type.
10. Back on the work page, "Delete work" asks, then takes you to
    `/manage`.

Keep DevTools' Console open: it should stay free of `[hx-csp] blocked`
errors. The red lines you will see are `Failed to load resource: … 422`
in step 2: Chrome logs every 4xx response, and those are expected.

The milestone 1 smoke script should still pass:

```bash
# from apps/web
vp exec vpx ./scripts/smoke.ts
```

```bash
# from the repo root
git add -A
git commit -m "feat(web): catalogue pages, in-place editing and live search"
git push -u origin shelf-0005
```

Open a pull request and merge it once CI is green. The deploy job applies
`0001_search.sql` to the remote database before deploying the Worker.

## The gate

On your phone, on mobile data, at <https://shelf.dank-shelf.workers.dev>,
sign in and enter your first 20 items by hand. Include at least one of each
kind, one work with two editions and one edition with two copies. Then
check:

- [ ] The deploy log shows `0001_search.sql` applied with no errors. This is
      the first time FTS5 meets remote D1; if it fails, see Troubleshooting.
- [ ] Each saved item opens on its work page with the details you typed.
- [ ] A record's tracklist shows sides, positions and times.
- [ ] A save with a mistake keeps your typing and shows the message under
      the field.
- [ ] Editing a work, an edition and a copy happens in place, and Cancel
      puts the card back.
- [ ] Each delete asks first.
- [ ] Signed out, the home page shows the counts and recent items, a work
      page shows no editing controls, and `/manage/add?kind=book` asks you
      to sign in and returns you there afterwards.
- [ ] Searching for part of a person's name, a tag or a title finds the
      work as you type.
- [ ] Tapping "4 Records" lists your records A to Z.
- [ ] Nothing scrolls sideways on any page in light or dark mode.

## Troubleshooting

| Symptom                                                                     | Cause                                                                                                   | Fix                                                                                                             |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `D1_ERROR: ambiguous column name: id`                                       | A subquery in a one-table select lost its table names                                                   | Wrap the `sql` fragment in `nested()` (B3)                                                                      |
| Every D1 test fails with `SQL code did not contain a statement`             | `0001_search.sql` still holds only drizzle-kit's placeholder comment                                    | Fill it (B2)                                                                                                    |
| `no such table: search`                                                     | `0001_search.sql` is not applied locally                                                                | `vp run migrate --local` in `apps/web`                                                                          |
| `fts5: syntax error` from a search                                          | Raw input reached `match`                                                                               | Pass the text through `toMatchQuery` (B4)                                                                       |
| `TS2769: No overload matches this call` at `db.insert(searchIndex).select(` | A `sql` field in the select has no alias                                                                | Add `.as('name')` to each, as in B4                                                                             |
| Formatting fails with `Unexpected token` at `hx-status:422`                 | JSX attribute names cannot contain `:422`                                                               | Spread it from an object, as `EntryForm` does                                                                   |
| `[hx-csp] blocked <…>: no hx-nonce attribute` in the Console                | An element with `hx-` attributes lacks `{...useHx()}`, or was rendered without `render` or `renderPart` | Add the spread; answer through `render` or `renderPart`; the nonce test in E4 finds the element                 |
| A button does nothing, and the Console says the target was not found        | The part it targets lost its id                                                                         | Check `#work`, `#editions`, `#edition-<id>` and `#copy-<id>` (D5)                                               |
| A save swaps the whole page into a card                                     | The route answered with `render` and a page instead of `renderPart`                                     | Answer htmx targets with `renderPart`                                                                           |
| Live search never fires                                                     | `changed` in `hx-trigger` on the form                                                                   | Use `input delay:300ms, submit` (D5)                                                                            |
| A failed save loses what was typed or the cursor                            | The 422 was swapped as `outerHTML`                                                                      | Check the form carries `hx-status:422="swap:outerMorph"` (D5)                                                   |
| `Forbidden` (403) on a save                                                 | `csrf()` saw an `Origin` from another site                                                              | Open the app on the same host it saves to                                                                       |
| `Choose a role for each person.`                                            | A posted role is not one of that kind's roles                                                           | Choose a role from the list; roles are per kind (B1)                                                            |
| Sign-in fields lost their underline                                         | `Input` dropped its own class                                                                           | A2                                                                                                              |
| After signing in from an add page, the kind is gone                         | `next` lost its query string                                                                            | A3                                                                                                              |
| The deploy fails applying `0001_search.sql`                                 | Remote D1 refused the virtual table                                                                     | Keep the error and the migration out of `main`; the plan's fallback is `LIKE` queries over `works` and `people` |
| `wrangler d1 export` fails on the remote database                           | Exports refuse databases with virtual tables                                                            | Expected; rely on Time Travel, or drop `search`, export and rebuild, as the plan describes                      |

## What milestone 3 builds on

- `createWork` and `addEdition` take a `NewEdition`, whose `source` and
  `sourceRef` will name the provider an edition came from.
- `FORM_DEFAULTS` and the `FormValues` shape are what a chosen candidate
  fills before the add form opens; nothing is saved until the form is
  submitted.
- `editions.barcode` and `book_editions.isbn13` are indexed and ready for
  the "already own this?" check after a scan.
- The add page is the place for the barcode field, the camera button and
  the candidate list; `EntryForm` takes any sections and any request.
- `parseTracklist` reads the `A1`-style positions Discogs and MusicBrainz
  return.
- Milestone 4's loan badges swap into a copy row the same way: a part with
  an id, and a route that answers with it.
