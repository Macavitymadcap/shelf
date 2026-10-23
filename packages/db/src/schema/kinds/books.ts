import { sqliteTable, text, integer, index, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { editions } from '../editions.ts';

export const bookEditions = sqliteTable(
  'book_editions',
  {
    editionId: text()
      .primaryKey()
      .references((): AnySQLiteColumn => editions.id, { onDelete: 'cascade' }),
    isbn13: text(),
    isbn10: text(),
    genre: text().notNull(),
    binding: text().notNull(),
    pageCount: integer(),
    language: text().notNull().default('en'),
    editionStatement: text(),
    series: text(),
    seriesNumber: integer(),
  },
  (bookEdition) => [
    index('book_editions_isbn13').on(bookEdition.isbn13),
    index('book_editions_isbn10').on(bookEdition.isbn10),
  ],
);
