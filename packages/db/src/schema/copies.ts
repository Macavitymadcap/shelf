import { sqliteTable, index, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { editions } from './editions.ts';
import { id, timestamps } from './columns.ts';

export const copies = sqliteTable(
  'copies',
  {
    ...id,
    editionId: text()
      .notNull()
      .references((): AnySQLiteColumn => editions.id, { onDelete: 'restrict' }),
    condition: text(),
    location: text(),
    acquiredOn: text(),
    acquiredFrom: text(),
    notes: text(),
    ...timestamps,
  },
  (copy) => [index('copies_edition_id').on(copy.editionId)],
);
