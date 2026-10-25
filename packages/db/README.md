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
