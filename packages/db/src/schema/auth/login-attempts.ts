import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const loginAttempts = sqliteTable(
  'login_attempts',
  {
    key: text().notNull(),
    attemptedAt: integer({ mode: 'timestamp_ms' }).notNull(),
  },
  (loginAttempt) => [
    index('login_attempts_key_attempted_at').on(loginAttempt.key, loginAttempt.attemptedAt),
  ],
);
