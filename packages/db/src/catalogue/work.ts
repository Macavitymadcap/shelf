import { asc, eq, inArray } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { copies } from '../schema/copies.ts';
import { credits } from '../schema/credits.ts';
import { editions } from '../schema/editions.ts';
import { people } from '../schema/people.ts';
import { tags } from '../schema/tags.ts';
import { workTags } from '../schema/work-tags.ts';
import { works } from '../schema/works.ts';
import { readCopies, readEditions } from './edition.ts';

const readCredits = (db: Db, workId: string) =>
  db
    .select({
      personId: people.id,
      name: people.name,
      role: credits.role,
      editionId: credits.editionId,
    })
    .from(credits)
    .innerJoin(people, eq(people.id, credits.personId))
    .where(eq(credits.workId, workId))
    .orderBy(asc(credits.position));

const readTags = (db: Db, workId: string) =>
  db
    .select({ name: tags.name })
    .from(workTags)
    .innerJoin(tags, eq(tags.id, workTags.tagId))
    .where(eq(workTags.workId, workId))
    .orderBy(asc(tags.name));

// A work with its credits, tags, editions (with details) and copies, or null.
export const getWork = async (db: Db, id: string) => {
  const [work] = await db.select().from(works).where(eq(works.id, id));

  if (!work) return null;

  const [credited, tagged, editionRows] = await Promise.all([
    readCredits(db, id),
    readTags(db, id),
    readEditions(db, eq(editions.workId, id)),
  ]);

  const copyRows = await readCopies(
    db,
    inArray(
      copies.editionId,
      editionRows.map((e) => e.id),
    ),
  );

  const withCopies = editionRows.map((edition) => ({
    ...edition,
    copies: copyRows.filter((copy) => copy.editionId === edition.id),
  }));

  return { ...work, credits: credited, tags: tagged.map((tag) => tag.name), editions: withCopies };
};

export type WorkDetail = NonNullable<Awaited<ReturnType<typeof getWork>>>;
