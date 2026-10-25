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