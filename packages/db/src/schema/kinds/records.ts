import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import { id } from '../columns.ts';
import { editions } from '../editions.ts';
import { copies } from '../copies.ts';

export const recordEditions = sqliteTable('record_editions', {
  editionId: text()
    .primaryKey()
    .references((): AnySQLiteColumn => editions.id, { onDelete: 'cascade' }),
  catalogueNumber: text(),
  format: text().notNull(),
  speed: integer().notNull().default(33),
  discCount: integer().notNull().default(1),
  vinylColour: text().notNull().default('black'),
  pressingCountry: text(),
  musicbrainzReleaseId: text(),
  discogsReleaseId: text(),
  genre: text().notNull(),
});

export const recordCopies = sqliteTable('record_copies', {
  copyId: text()
    .primaryKey()
    .references((): AnySQLiteColumn => copies.id, { onDelete: 'cascade' }),
  mediaGrade: text(),
  sleeveGrade: text(),
});

export const tracks = sqliteTable(
  'tracks',
  {
    ...id,
    editionId: text()
      .notNull()
      .references((): AnySQLiteColumn => editions.id, { onDelete: 'cascade' }),
    side: text().notNull(),
    position: integer().notNull(),
    title: text().notNull(),
    durationSeconds: integer(),
  },
  (track) => [
    uniqueIndex('tracks_edition_side_position').on(track.editionId, track.side, track.position),
  ],
);
