import { sqliteTable, text, integer, index, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { users } from './users.ts';
import { id, timestamps } from '../columns.ts';

const DAY = 24 * 60 * 60 * 1000;

export const sessions = sqliteTable(
  'sessions',
  {
    ...id,
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

export const isStale = (lastSeenAt: Date, now: Date) => now.getTime() - lastSeenAt.getTime() > DAY;
