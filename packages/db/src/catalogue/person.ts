import { asc, eq } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { credits } from '../schema/credits.ts';
import { people } from '../schema/people.ts';
import { works } from '../schema/works.ts';
import { summaryFields } from './summaries.ts';

// A person and every work credited to them, with the role, A to Z by title.
export const getPerson = async (db: Db, id: string) => {
  const [person] = await db.select().from(people).where(eq(people.id, id));

  if (!person) return null;

  const credited = await db
    .selectDistinct({ ...summaryFields, role: credits.role })
    .from(credits)
    .innerJoin(works, eq(works.id, credits.workId))
    .where(eq(credits.personId, id))
    .orderBy(asc(works.sortTitle), asc(credits.role));

  return { ...person, works: credited };
};

export type PersonDetail = NonNullable<Awaited<ReturnType<typeof getPerson>>>;
