import { sqliteTable, text, index, integer, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { id, timestamps } from './columns.ts';
import { works } from './works.ts';

export const editions = sqliteTable(
  'editions',
  {
    ...id,
    workId: text()
      .notNull()
      .references((): AnySQLiteColumn => works.id, { onDelete: 'restrict' }),
    publisher: text(),
    year: integer(),
    barcode: text(),
    coverKey: text(),
    source: text().notNull(),
    sourceRef: text(),
    ...timestamps,
  },
  (edition) => [
    index('editions_work_id').on(edition.workId),
    index('editions_barcode').on(edition.barcode),
  ],
);
