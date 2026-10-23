import { sqliteTable, text, integer, type AnySQLiteColumn, index } from 'drizzle-orm/sqlite-core';
import { KINDS } from '@shelf/catalogue';
import { id, timestamps } from './columns.ts';

export const works = sqliteTable(
  'works',
  {
    ...id,
    kind: text({ enum: KINDS }).notNull(),
    title: text().notNull(),
    sortTitle: text().notNull(),
    subtitle: text(),
    firstYear: integer(),
    description: text(),
    expandsWorkId: text().references((): AnySQLiteColumn => works.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (work) => [
    index('works_expands_work_id').on(work.expandsWorkId),
    index('works_kind_sort_title').on(work.kind, work.sortTitle),
  ],
);
