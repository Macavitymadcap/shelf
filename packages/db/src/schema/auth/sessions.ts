import { sqliteTable, text, integer, index, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { users } from './users.ts';
import { timestamps } from '../columns.ts';

export const sessions = sqliteTable(
  'sessions',
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references((): AnySQLiteColumn => users.id, { onDelete: 'cascade' }),
    expiresAt: integer({ mode: 'timestamp_ms' }).notNull(),
    lastSeenAt: integer({ mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('sessions_user_id').on(t.userId)],
);
