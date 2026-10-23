import { integer, text } from 'drizzle-orm/sqlite-core';

const now = () => new Date();

const uuid = () => crypto.randomUUID();

export const timestamps = {
  createdAt: integer({ mode: 'timestamp_ms' }).notNull().$defaultFn(now),
  updatedAt: integer({ mode: 'timestamp_ms' }).notNull().$defaultFn(now).$onUpdateFn(now),
};

export const id = {
  id: text().primaryKey().$defaultFn(uuid),
};
