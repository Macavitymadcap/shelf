import {
  sqliteTable,
  text,
  blob,
  integer,
  index,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import { users } from './users.ts';
import { id, timestamps } from '../columns.ts';

export const passkeys = sqliteTable(
  'passkeys',
  {
    ...id,
    userId: text()
      .notNull()
      .references((): AnySQLiteColumn => users.id, { onDelete: 'cascade' }),
    publicKey: blob().notNull(),
    signCount: integer().notNull(),
    transports: text(),
    createdAt: timestamps.createdAt,
    lastUsedAt: integer({ mode: 'timestamp_ms' }),
  },
  (passkey) => [index('passkeys_user_id').on(passkey.userId)],
);
