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
