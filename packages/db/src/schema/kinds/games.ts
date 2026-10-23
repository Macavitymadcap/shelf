import { sqliteTable, text, integer, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { editions } from '../editions.ts';
import { copies } from '../copies.ts';

export const gameEditions = sqliteTable('game_editions', {
  editionId: text()
    .primaryKey()
    .references((): AnySQLiteColumn => editions.id, { onDelete: 'cascade' }),
  minPlayers: integer().notNull(),
  maxPlayers: integer().notNull(),
  playMinutes: integer().notNull(),
  minAge: integer(),
  language: text().notNull().default('en'),
  bggId: integer(),
});

export const gameCopies = sqliteTable('game_copies', {
  copyId: text()
    .primaryKey()
    .references((): AnySQLiteColumn => copies.id, { onDelete: 'cascade' }),
  complete: integer({ mode: 'boolean' }).notNull().default(true),
  sleeved: integer({ mode: 'boolean' }).notNull().default(false),
  missingNotes: text(),
});
