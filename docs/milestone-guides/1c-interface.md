# Milestone 1, part C: the interface

This guide restyles the pages milestone 1 built and sets up the component
structure milestone 2 will grow. It starts after Checkpoint B of
`docs/milestone-guides/1-auth.md`; it can land before or after the gate.

The direction is a library card catalogue: warm card stock on a cool grey
desk, a red rule under each card's heading, faint blue ruled lines under
typed details, and a punched hole at the foot of every card. Titles are set
in Libre Caslon Text; everything typed on the card is Courier Prime. Dark
mode follows the phone's setting. The layout is built for a 360 px wide
screen (the Galaxy A5) and centres at 40 rem on anything wider.

Everything here was run against a copy of the repository: `vp run ready`
passes with 20 tests, the smoke script from B10 passes unchanged, and every
page was checked at 360 px in light and dark.

## How the interface is organised

Components follow atomic design. Each JSX component has one stylesheet of
the same name, in a matching folder under `public/styles`:

| Level     | Components                                                      | What belongs here                    |
| --------- | --------------------------------------------------------------- | ------------------------------------ |
| Atoms     | `Button`, `Input`, `Notice`, `Wordmark`                         | One element, no knowledge of the app |
| Molecules | `Field`, `DetailList`, `SignOutForm`                            | A few atoms doing one job            |
| Organisms | `IndexCard`, `ItemCard`, `ItemList`, `SignInForm`, `SiteHeader` | A recognisable section of a page     |
| Templates | `Page`                                                          | The document: head, header and main  |
| Pages     | `src/pages/*.tsx`                                               | A template filled with real data     |

Part C creates or changes these files under `apps/web` (pages and routes
aside):

```
apps/web/
├── scripts/vendor.ts                 C1
├── public/
│   ├── vendor/open-props/*.min.css   C1, copied
│   ├── vendor/fonts/*.woff2          C1, copied
│   └── styles/
│       ├── app.css                   C2
│       ├── reset.css                 C2
│       ├── tokens.css                C2
│       ├── base.css                  C2
│       ├── atoms/                    C3: button, input, notice, wordmark
│       ├── molecules/                C4: field, detail-list, sign-out-form
│       ├── organisms/                C5: index-card, item-card, item-list,
│       │                                 sign-in-form, site-header
│       └── templates/page.css        C6
└── src/components/
    ├── join-class-names.ts                C3
    ├── atoms/*.tsx                   C3
    ├── molecules/*.tsx               C4
    ├── organisms/*.tsx               C5
    └── templates/page.tsx            C6
```

Four rules keep it predictable:

- Components use the semantic tokens in `tokens.css` (`--ink`, `--card`,
  `--rule-red`), never raw Open Props colours. Open Props supplies sizes,
  radii, shadows and the colours the tokens are built from.
- Every stylesheet sits in a cascade layer, declared once in `app.css`:
  `vendor, reset, tokens, base, atoms, molecules, organisms, templates`. A later
  layer always wins over an earlier one, so an organism can adjust an atom
  without a more specific selector.
- No `style` attributes. The CSP's `style-src 'self'` blocks them; add a
  class and a rule instead.
- Every part of a component gets its own class, prefixed with the
  component's name: `.index-card`, `.index-card__title`. Variations are a
  `data-variant` or `data-tone` attribute, never a modifier class.
- A stylesheet only selects its own component's classes. When a parent
  needs to place a child (stretch a field, say), it passes a class in,
  as `SignInForm` does with `class="sign-in-form__field"`; it never writes
  `.sign-in-form .field`.
- Nest with `&` for anything that is the same element in another state:
  pseudo-classes, pseudo-elements, attribute variants and media queries.
  Do not nest a component's parts; they stay flat, top-level rules.

### Why parts stay flat

Native CSS nesting is not Sass: `&__title` is invalid, not a shorthand for
`.index-card__title`. Nesting a part therefore means either a descendant
selector (`.index-card .title`), which also styles any matching element in
components nested inside the card and doubles the specificity, or
repeating the full name inside the parent, which is longer than writing
it flat. Flat, prefixed parts keep every rule at the weight of one class,
so the layer order alone decides which wins, and `index-card__title` in
the JSX finds its rule with one search.

States, variants and pseudo-elements are where nesting pays: `&:active`
compiles to `.button:active`, the same selector and specificity as
writing it out, with less repetition. Always write the `&`; nesting a bare
element name (`h2 { … }` inside a rule) needs Chrome 120, while `&`
nesting needs 112.

### What Open Props is for here

Open Props supplies the scales: `--size-*` for every gap and padding,
`--font-size-*` and `--font-lineheight-*` for type, `--radius-*`,
`--shadow-*` (which adjusts itself for dark mode), the fallback font
stacks, and the red and blue palettes behind the two rules. The colours
that define the look (desk, card, ink) are chosen by hand, because Open
Props has no warm card stock or navy ink.

So the app loads only those six groups, not the whole bundle: 2.4 KB
gzipped instead of 8 KB. Open Props' `normalize.css` is replaced by a
short reset of our own. Normalize brings opinions (bold `dt`, margins,
padded and narrowed list items, colours) that the card design had to undo
one by one; the reset only removes browser defaults.

Every feature used needs Chrome 114 or later (`text-wrap: balance` is the
newest; `&` nesting, `:has()`, `color-mix()`, `dvh` and `@layer` are
older).

## Before you start

```bash
# from the repo root
git switch main && git pull
vp install
vp run ready
git switch -c shelf-0003-interface
```

## C1. Vendor the fonts and the Open Props groups

This step replaces A7's copy. The Galaxy A5 only has Roboto and Noto
Serif, so both typefaces are served from the app: five files, about
115 KB in all, with the two regular weights preloaded. Open Props is
copied as six small files instead of the full bundle, and normalize goes.

```bash
# from apps/web
vp add -D @fontsource/libre-caslon-text @fontsource/courier-prime
```

Neither package has an install script, so no build approval is needed.
`pnpm-workspace.yaml` gains two catalog entries, as in A7.

The copy is now too much for one shell line, and brace expansion is not
portable to every `sh`. Replace the shell command with a script:

`apps/web/scripts/vendor.ts`:

```ts
// Copies third-party CSS and fonts into public/vendor, because the CSP only allows 'self'.
import { copyFileSync, mkdirSync } from 'node:fs';
import { basename } from 'node:path';

const caslon = 'node_modules/@fontsource/libre-caslon-text/files/libre-caslon-text-latin';
const courier = 'node_modules/@fontsource/courier-prime/files/courier-prime-latin';

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
};

for (const [dir, files] of Object.entries(assets)) {
  mkdirSync(dir, { recursive: true });
  for (const file of files) copyFileSync(file, `${dir}/${basename(file)}`);
}
```

In `apps/web/package.json`, change the `vendor` script to:

```json
"vendor": "node scripts/vendor.ts"
```

Node 22.18 and later run TypeScript files directly. Remove the old
copies, then run it:

```bash
# from apps/web
git rm public/vendor/open-props.min.css public/vendor/normalize.min.css
vp run vendor
ls public/vendor/open-props public/vendor/fonts
```

Expect six files in `open-props` (`blue`, `borders`, `fonts`, `red`,
`shadows` and `sizes`, each `.min.css`) and five `.woff2` files in `fonts`:
three Libre Caslon Text (400, 400 italic, 700) and two Courier Prime (400,
700). Commit them after the next paragraph's change, or the pre-commit
hook reformats them.

`vp check --fix` reformats the minified files into hundreds of lines, so
every `vp run vendor` would then show as a change. Tell the formatter to
leave vendored files alone, in the root `vite.config.ts`:

```ts
  fmt: {
    singleQuote: true,
    ignorePatterns: ['apps/web/public/vendor/**'],
  },
```

The `open-props` package stays a dev dependency; the script copies from
it, so `vp update open-props` followed by `vp run vendor` updates it.

## C2. Tokens, base styles and the entry stylesheet

`app.css` is the only stylesheet the page links. It declares the layer
order first; `@import` rules must come before any other rule, and only a
`@layer` statement may precede them.

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
@import url('atoms/wordmark.css') layer(atoms);

@import url('molecules/field.css') layer(molecules);
@import url('molecules/detail-list.css') layer(molecules);
@import url('molecules/sign-out-form.css') layer(molecules);

@import url('organisms/index-card.css') layer(organisms);
@import url('organisms/item-card.css') layer(organisms);
@import url('organisms/item-list.css') layer(organisms);
@import url('organisms/site-header.css') layer(organisms);
@import url('organisms/sign-in-form.css') layer(organisms);

@import url('templates/page.css') layer(templates);
```

`apps/web/public/styles/reset.css`:

```css
/* Removes browser defaults the design does not want; adds no opinions of its own. */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body,
h1,
h2,
h3,
h4,
p,
ul,
ol,
dl,
dd,
figure,
blockquote {
  margin: 0;
}

ul[class],
ol[class] {
  padding: 0;
  list-style: none;
}

img,
svg {
  display: block;
  max-inline-size: 100%;
}

input,
button,
select,
textarea {
  font: inherit;
  color: inherit;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

`apps/web/public/styles/tokens.css`:

```css
@font-face {
  font-family: 'Libre Caslon Text';
  src: url('/vendor/fonts/libre-caslon-text-latin-400-normal.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'Libre Caslon Text';
  src: url('/vendor/fonts/libre-caslon-text-latin-400-italic.woff2') format('woff2');
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: 'Libre Caslon Text';
  src: url('/vendor/fonts/libre-caslon-text-latin-700-normal.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}
@font-face {
  font-family: 'Courier Prime';
  src: url('/vendor/fonts/courier-prime-latin-400-normal.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'Courier Prime';
  src: url('/vendor/fonts/courier-prime-latin-700-normal.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}

/* Semantic tokens: components use these, never raw Open Props colours. */
:root {
  color-scheme: light dark;
  --font-serif: 'Libre Caslon Text', var(--font-old-style);
  --font-typed: 'Courier Prime', var(--font-monospace-code);

  --desk: #d8dde1;
  --card: #f6f1e4;
  --ink: #1f2a44;
  --ink-muted: #565e70;
  --rule-red: var(--red-9);
  --rule-blue: color-mix(in oklab, var(--blue-5) 35%, transparent);
  --focus: var(--blue-8);

  --line: 1.75rem;
  --gutter: var(--size-3);
  --measure: 40rem;
  --tap: 44px;
  --card-radius: var(--radius-1);
  --card-shadow: var(--shadow-2);
}

@media (prefers-color-scheme: dark) {
  :root {
    --desk: #121417;
    --card: #25231f;
    --ink: #e9e3d5;
    --ink-muted: #a59e90;
    --rule-red: var(--red-5);
    --rule-blue: color-mix(in oklab, var(--blue-6) 30%, transparent);
    --focus: var(--blue-4);
  }
}
```

`apps/web/public/styles/base.css`:

```css
html {
  background: var(--desk);
  color: var(--ink);
  font-family: var(--font-typed);
}

body {
  min-block-size: 100dvh;
  font-size: var(--font-size-1);
  line-height: var(--line);
}

h1,
h2,
h3 {
  font-family: var(--font-serif);
  font-weight: 400;
  line-height: var(--font-lineheight-1);
  text-wrap: balance;
}

h1 {
  font-size: var(--font-size-5);
}

h2 {
  font-size: var(--font-size-4);
}

a {
  color: inherit;
  text-decoration: underline var(--rule-red) 1px;
  text-underline-offset: 0.2em;
}

:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

.visually-hidden {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
```

The reset clears list styles only on lists with a class, so a plain `ul`
in a page's prose keeps its bullets.

The `h1` rule styles the home page heading without a class, so the test
that matches `<h1>Shelf: A catalogue of books, games and records</h1>`
still passes.

Contrast against the card, in light and dark: ink is about 12:1, muted
ink about 6:1 and the red 4.8:1 (light) and 5.7:1 (dark), so all clear
WCAG AA's 4.5:1 for body text.

## C3. Atoms

```bash
# from apps/web
mkdir -p src/components/{atoms,molecules,organisms,templates}
mkdir -p public/styles/{atoms,molecules,organisms,templates}
```

### The class-name helper

`IndexCard` and `Field` accept a `class` from their parent and add it to
their own. One small helper does the joining, and it sits beside the level
folders because every level may use it:

`apps/web/src/components/join-class-names.ts`:

```ts
// Joins class names, skipping empty ones: joinClassNames('field', props.class).
export const joinClassNames = (...names: (string | undefined)[]) => names.filter(Boolean).join(' ');
```

### The atoms

`apps/web/src/components/atoms/button.tsx`:

```tsx
import type { FC, PropsWithChildren } from 'hono/jsx';

type ButtonProps = PropsWithChildren<{
  variant?: 'primary' | 'quiet';
  type?: 'submit' | 'button';
}>;

export const Button: FC<ButtonProps> = ({ variant = 'primary', type = 'submit', children }) => (
  <button class="button" data-variant={variant} type={type}>
    {children}
  </button>
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

  @media (prefers-reduced-motion: reduce) {
    &:active {
      translate: none;
    }
  }
}
```

`apps/web/src/components/atoms/input.tsx`:

```tsx
import type { FC, JSX } from 'hono/jsx';

export type InputProps = Omit<JSX.IntrinsicElements['input'], 'class'>;

export const Input: FC<InputProps> = (props) => <input {...props} class="input" />;
```

`apps/web/public/styles/atoms/input.css`:

```css
/* A typed blank on the card: no box, just the line to write on. */
.input {
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

`apps/web/src/components/atoms/notice.tsx`:

```tsx
import type { FC, PropsWithChildren } from 'hono/jsx';

type NoticeProps = PropsWithChildren<{ tone?: 'info' | 'error' }>;

export const Notice: FC<NoticeProps> = ({ tone = 'info', children }) => (
  <p class="notice" data-tone={tone} role={tone === 'error' ? 'alert' : 'status'}>
    {children}
  </p>
);
```

`apps/web/public/styles/atoms/notice.css`:

```css
.notice {
  padding-inline-start: var(--size-2);
  border-inline-start: 3px solid var(--ink-muted);
  color: var(--ink);

  &[data-tone='error'] {
    border-inline-start-color: var(--rule-red);
    color: var(--rule-red);
  }
}
```

`apps/web/src/components/atoms/wordmark.tsx`:

```tsx
import type { FC } from 'hono/jsx';

export const Wordmark: FC = () => (
  <a class="wordmark" href="/">
    Shelf
  </a>
);
```

`apps/web/public/styles/atoms/wordmark.css`:

```css
.wordmark {
  font-family: var(--font-serif);
  font-size: var(--font-size-5);
  line-height: 1;
  text-decoration: none;
}
```

`Input` puts `class="input"` after the spread, and its props type leaves
`class` out, so a caller cannot replace the atom's class by accident.

`Notice` gives errors `role="alert"`, as the login page did before, so a
screen reader announces a failed sign-in.

## C4. Molecules

`apps/web/src/components/molecules/field.tsx`:

```tsx
import type { FC } from 'hono/jsx';
import { Input, type InputProps } from '../atoms/input.tsx';
import { joinClassNames } from '../join-class-names.ts';

// `class` goes on the wrapper, so a parent can place the field without reaching into it.
type FieldProps = Omit<InputProps, 'class'> & { label: string; name: string; class?: string };

export const Field: FC<FieldProps> = ({ label, name, class: className, ...input }) => (
  <div class={joinClassNames('field', className)}>
    <label class="field__label" for={`field-${name}`}>
      {label}
    </label>
    <Input id={`field-${name}`} name={name} {...input} />
  </div>
);
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
```

`apps/web/src/components/molecules/detail-list.tsx`:

```tsx
import type { FC } from 'hono/jsx';

export type Detail = [term: string, value: string];

export const DetailList: FC<{ details: Detail[] }> = ({ details }) => (
  <dl class="detail-list">
    {details.map(([term, value]) => (
      <>
        <dt class="detail-list__term">{term}</dt>
        <dd>{value}</dd>
      </>
    ))}
  </dl>
);
```

`apps/web/public/styles/molecules/detail-list.css`:

```css
/* Typed lines sitting on faint blue rules, like a filled-in card. */
.detail-list {
  display: grid;
  grid-template-columns: max-content 1fr;
  column-gap: var(--size-3);
  background: repeating-linear-gradient(
    to bottom,
    transparent 0 calc(var(--line) - 1px),
    var(--rule-blue) calc(var(--line) - 1px) var(--line)
  );
}

.detail-list__term {
  color: var(--ink-muted);
}
```

`apps/web/src/components/molecules/sign-out-form.tsx`:

```tsx
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
```

`apps/web/public/styles/molecules/sign-out-form.css`:

```css
.sign-out-form {
  display: flex;
  align-items: center;
  gap: var(--size-1);
  font-size: var(--font-size-0);
}

.sign-out-form__name {
  display: inline-flex;
  align-items: center;
  min-block-size: var(--tap);
  padding-inline: var(--size-2);
}
```

The ruled lines are a repeating gradient one `--line` tall, the same as
the body line height, so each typed row sits on its own rule. Any margin
on `dt` or `dd` would push the rows off their rules; the reset removes the
browser's `dd` indent, and nothing else adds one.

`Field` ids are `field-<name>`, so the username input is `#field-username`.
Its `class` prop goes on the wrapper, not the input, so a parent can place
the whole field.

## C5. Organisms

`apps/web/src/components/organisms/index-card.tsx`:

```tsx
import type { Child, FC, PropsWithChildren } from 'hono/jsx';
import { joinClassNames } from '../join-class-names.ts';

type IndexCardProps = PropsWithChildren<{
  title: Child;
  corner?: string;
  byline?: string;
  level?: 1 | 2;
  class?: string;
}>;

export const IndexCard: FC<IndexCardProps> = (props) => {
  const { title, corner, byline, level = 2, children } = props;
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <article class={joinClassNames('index-card', props.class)}>
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

`apps/web/public/styles/organisms/index-card.css`:

```css
/* The card itself: stock, corner mark, red header rule and the punched hole. */
.index-card {
  position: relative;
  display: grid;
  gap: var(--size-3);
  padding: var(--size-3) var(--size-3) var(--size-7);
  border-radius: var(--card-radius);
  background: var(--card);
  box-shadow: var(--card-shadow);

  &::after {
    content: '';
    position: absolute;
    inset-inline: 0;
    inset-block-end: var(--size-3);
    margin-inline: auto;
    inline-size: 0.75rem;
    block-size: 0.75rem;
    border-radius: var(--radius-round);
    background: var(--desk);
    box-shadow: inset 0 1px 2px rgb(0 0 0 / 30%);
  }
}

.index-card__corner {
  justify-self: end;
  color: var(--ink-muted);
  font-size: var(--font-size-0);
  line-height: 1;
}

.index-card__header {
  display: grid;
}

.index-card__title {
  padding-block-end: var(--size-2);
  border-block-end: 2px solid var(--rule-red);
  font-size: var(--font-size-4);
}
```

`apps/web/src/components/organisms/item-card.tsx`:

```tsx
import type { FC } from 'hono/jsx';
import { DetailList, type Detail } from '../molecules/detail-list.tsx';
import { IndexCard } from './index-card.tsx';

export type ItemSummary = {
  href: string;
  kind: 'Book' | 'Record' | 'Game';
  title: string;
  creator?: string;
  details: Detail[];
};

export const ItemCard: FC<{ item: ItemSummary }> = ({ item }) => (
  <IndexCard
    class="item-card"
    corner={item.kind}
    byline={item.creator}
    title={
      <a class="item-card__link" href={item.href}>
        {item.title}
      </a>
    }
  >
    <DetailList details={item.details} />
  </IndexCard>
);
```

`apps/web/public/styles/organisms/item-card.css`:

```css
.item-card {
  &:has(.item-card__link:focus-visible) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  &:active {
    translate: 0 1px;
  }

  @media (prefers-reduced-motion: reduce) {
    &:active {
      translate: none;
    }
  }
}

.item-card__link {
  text-decoration: none;

  /* The whole card is the tap target; the title link stretches over it. */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: var(--card-radius);
  }

  &:focus-visible {
    outline: none;
  }
}
```

`apps/web/src/components/organisms/item-list.tsx`:

```tsx
import type { Child, FC } from 'hono/jsx';
import { ItemCard, type ItemSummary } from './item-card.tsx';

type ItemListProps = { items: ItemSummary[]; empty: Child };

export const ItemList: FC<ItemListProps> = ({ items, empty }) =>
  items.length === 0 ? (
    <p class="item-list__empty">{empty}</p>
  ) : (
    <ul class="item-list">
      {items.map((item) => (
        <li>
          <ItemCard item={item} />
        </li>
      ))}
    </ul>
  );
```

`apps/web/public/styles/organisms/item-list.css`:

```css
.item-list {
  display: grid;
  gap: var(--size-3);
}

.item-list__empty {
  color: var(--ink-muted);
}
```

`apps/web/src/components/organisms/sign-in-form.tsx`:

```tsx
import type { FC } from 'hono/jsx';
import { Button } from '../atoms/button.tsx';
import { Notice } from '../atoms/notice.tsx';
import { Field } from '../molecules/field.tsx';
import { IndexCard } from './index-card.tsx';

type SignInFormProps = { next: string; username: string; error?: string };

export const SignInForm: FC<SignInFormProps> = ({ next, username, error }) => (
  <IndexCard level={1} corner="Staff only" title="Sign in">
    {error && <Notice tone="error">{error}</Notice>}
    <form class="sign-in-form" method="post" action="/login">
      <input type="hidden" name="next" value={next} />
      <Field
        class="sign-in-form__field"
        label="Username"
        name="username"
        value={username}
        autocomplete="username"
        required
      />
      <Field
        class="sign-in-form__field"
        label="Password"
        name="password"
        type="password"
        autocomplete="current-password"
        required
      />
      <Button>Sign in</Button>
    </form>
  </IndexCard>
);
```

`apps/web/public/styles/organisms/sign-in-form.css`:

```css
.sign-in-form {
  display: grid;
  gap: var(--size-4);
  justify-items: start;
}

.sign-in-form__field {
  justify-self: stretch;
}
```

`apps/web/src/components/organisms/site-header.tsx`:

```tsx
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
```

`apps/web/public/styles/organisms/site-header.css`:

```css
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--size-3);
  padding-block: var(--size-3);
}

.site-header__nav {
  font-size: var(--font-size-0);
}

.site-header__link {
  display: inline-flex;
  align-items: center;
  min-block-size: var(--tap);
  padding-inline: var(--size-2);
}
```

`IndexCard` is the shell every card uses; `ItemCard` is the one milestone 2
fills from the database. `ItemSummary` is a view shape, not a database row:
the catalogue queries map rows to it, so the component never imports
`@shelf/db`. The corner shows only the kind.

The title link's `::before` covers the whole card, so a tap anywhere on a
card opens the item, and the card shows the focus ring when its link has
keyboard focus.

## C6. The page template

`apps/web/src/components/templates/page.tsx`:

```tsx
import type { FC, PropsWithChildren } from 'hono/jsx';
import { raw } from 'hono/html';
import type { SessionUser } from '@shelf/auth';
import { SiteHeader } from '../organisms/site-header.tsx';

type PageProps = PropsWithChildren<{ title: string; user: SessionUser | null }>;

const FONTS = ['libre-caslon-text-latin-400-normal', 'courier-prime-latin-400-normal'];

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
  </head>
);

export const Page: FC<PageProps> = ({ title, user, children }) => (
  <>
    {raw('<!doctype html>')}
    <html lang="en-GB">
      <Head title={title} />
      <body class="page">
        <SiteHeader user={user} />
        <main class="page__main">{children}</main>
      </body>
    </html>
  </>
);
```

`apps/web/public/styles/templates/page.css`:

```css
.page {
  display: grid;
  align-content: start;
  gap: var(--size-2);
  max-inline-size: var(--measure);
  margin-inline: auto;
  padding: 0 var(--gutter) var(--size-8);
}

.page__main {
  display: grid;
  gap: var(--size-4);
}
```

The two `theme-color` tags colour Chrome's address bar on Android to match
the desk in each scheme. `align-content: start` stops the body grid
stretching its rows to fill the screen on short pages.

`Page` replaces `Layout`:

```bash
# from apps/web
git rm src/layout.tsx
```

## C7. Pages and the component sheet

`apps/web/src/pages/home.tsx`:

```tsx
import type { SessionUser } from '@shelf/auth';
import { ItemList } from '../components/organisms/item-list.tsx';
import { Page } from '../components/templates/page.tsx';

export const HomePage = ({ user }: { user: SessionUser | null }) => (
  <Page title="Shelf" user={user}>
    <h1>Shelf: A catalogue of books, games and records</h1>
    <ItemList items={[]} empty="Nothing is catalogued yet." />
  </Page>
);
```

`apps/web/src/pages/login.tsx`:

```tsx
import { SignInForm } from '../components/organisms/sign-in-form.tsx';
import { Page } from '../components/templates/page.tsx';

const MESSAGES = {
  invalid: 'Incorrect username or password.',
  locked: 'Too many failed attempts. Try again in 15 minutes.',
};

type LoginPageProps = { next: string; username?: string; error?: keyof typeof MESSAGES };

export const LoginPage = ({ next, username = '', error }: LoginPageProps) => (
  <Page title="Sign in to Shelf" user={null}>
    <SignInForm next={next} username={username} error={error && MESSAGES[error]} />
  </Page>
);
```

`apps/web/src/pages/manage.tsx`:

```tsx
import type { SessionUser } from '@shelf/auth';
import { IndexCard } from '../components/organisms/index-card.tsx';
import { Page } from '../components/templates/page.tsx';

export const ManagePage = ({ user }: { user: SessionUser }) => (
  <Page title="Manage Shelf" user={user}>
    <IndexCard level={1} corner="Staff only" title="Manage">
      <p>Signed in as {user.displayName}.</p>
      <p>
        <a href="/manage/styleguide">Component sheet</a>
      </p>
    </IndexCard>
  </Page>
);
```

`apps/web/src/pages/styleguide.tsx`:

```tsx
import type { SessionUser } from '@shelf/auth';
import { Button } from '../components/atoms/button.tsx';
import { Notice } from '../components/atoms/notice.tsx';
import { Field } from '../components/molecules/field.tsx';
import { ItemList } from '../components/organisms/item-list.tsx';
import type { ItemSummary } from '../components/organisms/item-card.tsx';
import { IndexCard } from '../components/organisms/index-card.tsx';
import { Page } from '../components/templates/page.tsx';

const SAMPLES: ItemSummary[] = [
  {
    href: '#',
    kind: 'Book',
    creator: 'Le Guin, Ursula K.',
    title: 'The Dispossessed: an ambiguous utopia',
    details: [
      ['Published', 'Gollancz, 1974'],
      ['Genre', 'Science fiction'],
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
      ['Format', 'LP'],
      ['Loan', 'With Sam'],
    ],
  },
  {
    href: '#',
    kind: 'Game',
    creator: 'Rosenberg, Uwe',
    title: 'Agricola',
    details: [
      ['Published', 'Lookout, 2007'],
      ['Players', '1 to 4'],
    ],
  },
];

export const StyleguidePage = ({ user }: { user: SessionUser }) => (
  <Page title="Component sheet" user={user}>
    <h1>Component sheet</h1>
    <IndexCard corner="Atoms" title="Buttons and notices">
      <Notice>Saved.</Notice>
      <Notice tone="error">Incorrect username or password.</Notice>
      <Field label="Title" name="title" value="Spirit of Eden" />
      <p>
        <Button>Save item</Button> <Button variant="quiet">Cancel</Button>
      </p>
    </IndexCard>
    <ItemList items={SAMPLES} empty="Nothing is catalogued yet." />
    <ItemList items={[]} empty="Nothing is catalogued yet." />
  </Page>
);
```

`apps/web/src/routes/manage.tsx`:

```tsx
import { Hono } from 'hono';
import { requireUser } from '@shelf/auth';
import type { AppEnv } from '../env.ts';
import { ManagePage } from '../pages/manage.tsx';
import { StyleguidePage } from '../pages/styleguide.tsx';

export const manageRoutes = new Hono<AppEnv>();

manageRoutes.use(requireUser);

manageRoutes.get('/', (c) => c.html(<ManagePage user={c.var.user!} />));
manageRoutes.get('/styleguide', (c) => c.html(<StyleguidePage user={c.var.user!} />));
```

The component sheet at `/manage/styleguide` shows every component with
sample data, behind sign-in. Use it to check a change in both schemes
before it reaches a real page.

The strings the tests and the smoke script look for are unchanged: the
home `<h1>`, `href="/login"`, both sign-in messages, `value="<username>"`,
"Signed in as {name}." and "Sign out".

### Checkpoint C

```bash
# from the repo root
vp run ready
```

Expect `vp check` to pass and 20 tests to pass. Then, with `vp run dev`
running in another terminal:

```bash
# from apps/web
vp exec vpx ./scripts/smoke.ts
```

Expect five `PASS` lines and "All checks passed". Open
<http://localhost:5173> in Chrome, open the device toolbar, choose a 360 by
640 screen and look at each page; then switch DevTools' rendering emulation
to `prefers-color-scheme: dark` and look again.

```bash
# from the repo root
git add -A
git commit -m "feat(web): card catalogue interface with atomic components"
```

## The gate

On your phone, on mobile data, once deployed:

- [ ] The headings are in Caslon and the details in Courier, not Roboto.
- [ ] The sign-in page shows the error notice in red on a wrong password.
- [ ] Switching the phone to dark mode (Settings, Display) switches the
      site, and the address bar matches the background.
- [ ] Nothing scrolls sideways on any page.
- [ ] `/manage/styleguide` shows three item cards with ruled rows lined up.

## Troubleshooting

| Symptom                                                                  | Cause                                                          | Fix                                                                                                            |
| ------------------------------------------------------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Pages unstyled; `app.css` loads                                          | An `@import` after another rule is ignored                     | Keep only the `@layer` statement above the imports (C2)                                                        |
| Text in a system serif or monospace                                      | Fonts missing from `public/vendor/fonts`                       | `vp run vendor`; if `vp run` reports a cache hit and the files are still missing, run `node scripts/vendor.ts` |
| `ERR_UNKNOWN_FILE_EXTENSION ".ts"` from `vp run vendor`                  | Node older than 22.18                                          | Update Node, or run `node --experimental-strip-types scripts/vendor.ts`                                        |
| A style attribute has no effect, and the console reports a CSP violation | `style-src 'self'` blocks inline styles                        | Use a class in the component's stylesheet                                                                      |
| A nested rule such as `&__label { … }` does nothing                      | Native nesting has no Sass-style name concatenation            | Write the part as its own top-level rule, `.field__label`                                                      |
| A nested `h2 { … }` works on desktop but not on the phone                | Bare element nesting needs Chrome 120                          | Write `& h2`, or better, give the element a class                                                              |
| Detail rows out of line with the blue rules                              | A margin or padding on `dt` or `dd`                            | Remove it; keep the rows at one `--line` each (C4)                                                             |
| Bullets or an indent on the item list                                    | `reset.css` missing from `app.css`, or the `ul` lost its class | Check the `reset` import (C2) and `class="item-list"`                                                          |
| A `var(--…)` from Open Props has no effect                               | Its group is not vendored                                      | Add the group to `scripts/vendor.ts`, rerun `vp run vendor`, and import it in `app.css`                        |
| 404s for `/vendor/open-props.min.css` or `normalize.min.css`             | An old link left in a page                                     | Only `/styles/app.css` is linked, from `Page` (C6)                                                             |
| A component rule loses to a base rule                                    | It sits in an earlier layer, or is not imported                | Import it in `app.css` with the layer for its level                                                            |
| Dark mode does not follow the phone                                      | Chrome's own theme is set to Light                             | Chrome, Settings, Theme: System default                                                                        |
| Home test fails on the `<h1>`                                            | A class or attribute was added to the home `h1`                | Keep it bare; style it from `base.css`                                                                         |

## What milestone 2 builds on

- `ItemList` and `ItemCard` render the public catalogue; the queries return
  `ItemSummary` values.
- `Field`, `Button` and `Notice` build the add and edit forms; a select and
  a textarea are the next atoms, styled like `Input`.
- New components get a stylesheet in the matching folder and an `@import`
  in `app.css`, and appear on the component sheet.
