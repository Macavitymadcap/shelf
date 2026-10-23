import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { id, timestamps } from '../columns.ts';

export const users = sqliteTable('users', {
  ...id,
  username: text().notNull().unique(),
  displayName: text().notNull(),
  passwordHash: text(),
  ...timestamps,
});
