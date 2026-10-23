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
