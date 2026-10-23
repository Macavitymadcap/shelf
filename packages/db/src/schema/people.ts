import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { id, timestamps } from './columns.ts';

export const people = sqliteTable(
  'people',
  {
    ...id,
    name: text().notNull(),
    sortName: text().notNull(),
    createdAt: timestamps.createdAt,
  },
  (person) => [index('people_sort_name').on(person.sortName)],
);
