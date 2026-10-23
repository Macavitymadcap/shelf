import {
  sqliteTable,
  text,
  index,
  integer,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { id, timestamps } from './columns.ts';
import { works } from './works.ts';
import { editions } from './editions.ts';
import { people } from './people.ts';

export const credits = sqliteTable(
  'credits',
  {
    ...id,
    workId: text()
      .notNull()
      .references((): AnySQLiteColumn => works.id, { onDelete: 'cascade' }),
    editionId: text().references((): AnySQLiteColumn => editions.id, { onDelete: 'cascade' }),
    personId: text()
      .notNull()
      .references((): AnySQLiteColumn => people.id, { onDelete: 'restrict' }),
    role: text().notNull(),
    position: integer().notNull().default(0),
    createdAt: timestamps.createdAt,
  },
  (credit) => [
    index('credits_work_id').on(credit.workId),
    index('credits_person_id').on(credit.personId),
    index('credits_edition_id').on(credit.editionId),
    uniqueIndex('credits_unique_work_credit')
      .on(credit.workId, credit.personId, credit.role)
      .where(sql`${credit.editionId} is null`),
    uniqueIndex('credits_unique_edition_credit')
      .on(credit.editionId, credit.personId, credit.role)
      .where(sql`${credit.editionId} is not null`),
  ],
);
