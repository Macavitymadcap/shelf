import {
  index,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { id, timestamps } from './columns.ts';
import { copies } from './copies.ts';

export const loans = sqliteTable(
  'loans',
  {
    ...id,
    copyId: text()
      .notNull()
      .references((): AnySQLiteColumn => copies.id, { onDelete: 'cascade' }),
    borrower: text().notNull(),
    lentOn: text().notNull(),
    dueOn: text(),
    returnedOn: text(),
    notes: text(),
    createdAt: timestamps.createdAt,
  },
  (loan) => [
    uniqueIndex('loans_one_open_per_copy')
      .on(loan.copyId)
      .where(sql`${loan.returnedOn} is null`),
    index('loans_copy_id').on(loan.copyId),
  ],
);
