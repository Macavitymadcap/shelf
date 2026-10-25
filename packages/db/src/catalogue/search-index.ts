import { eq, sql } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { Db } from '../client.ts';
import { credits } from '../schema/credits.ts';
import { people } from '../schema/people.ts';
import { tags } from '../schema/tags.ts';
import { workTags } from '../schema/work-tags.ts';
import { works } from '../schema/works.ts';
import type { Statement } from './batch.ts';
import { nested } from './nested.ts';

// The FTS5 table from migration 0001, kept out of src/schema so drizzle-kit never
// sees it. FTS5's hidden `rank` column is left out: inserting into it changes settings.
export const searchIndex = sqliteTable('search', {
  workId: text().notNull(),
  title: text().notNull(),
  people: text().notNull(),
  tags: text().notNull(),
});

const namesOf = (workId: string) =>
  nested<string>(sql`coalesce((select group_concat(${people.name}, ' ') from ${credits}
    join ${people} on ${people.id} = ${credits.personId}
    where ${credits.workId} = ${workId}), '')`);

const tagsOf = (workId: string) =>
  nested<string>(sql`coalesce((select group_concat(${tags.name}, ' ') from ${workTags}
    join ${tags} on ${tags.id} = ${workTags.tagId}
    where ${workTags.workId} = ${workId}), '')`);

const titleOf = sql<string>`${works.title} || ' ' || coalesce(${works.subtitle}, '')`;

// Rebuilds one work's row from the tables; put it last in the batch that changed them.
export const reindexWork = (db: Db, workId: string): Statement[] => [
  db.delete(searchIndex).where(eq(searchIndex.workId, workId)),
  db.insert(searchIndex).select(
    db
      .select({
        workId: works.id,
        title: titleOf.as('title'),
        people: namesOf(workId).as('people'),
        tags: tagsOf(workId).as('tags'),
      })
      .from(works)
      .where(eq(works.id, workId)),
  ),
];

// "le guin" becomes "le"* "guin"*: every word must match, as a prefix.
export const toMatchQuery = (input: string) =>
  input
    .replace(/["*^:()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `"${word}"*`)
    .join(' ');
