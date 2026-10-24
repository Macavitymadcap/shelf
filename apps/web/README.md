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
