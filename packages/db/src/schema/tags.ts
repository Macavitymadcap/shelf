import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { id, timestamps } from './columns.ts';

export const tags = sqliteTable('tags', {
  ...id,
  name: text().notNull().unique(),
  createdAt: timestamps.createdAt,
});
