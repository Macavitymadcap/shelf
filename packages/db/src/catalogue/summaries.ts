import { KINDS, type Kind } from '@shelf/catalogue';
import { count, desc, sql } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { nested } from './nested.ts';
import { copies } from '../schema/copies.ts';
import { credits } from '../schema/credits.ts';
import { editions } from '../schema/editions.ts';
import { people } from '../schema/people.ts';
import { works } from '../schema/works.ts';

const firstEdition = (column: typeof editions.publisher | typeof editions.year) =>
  sql`(select ${column} from ${editions} where ${editions.workId} = ${works.id}
    order by ${editions.createdAt} limit 1)`;

// One row per work, with the first-credited person and the first edition's imprint.
export const summaryFields = {
  id: works.id,
  kind: works.kind,
  title: works.title,
  creator: nested<string | null>(sql`(select ${people.name} from ${credits}
    join ${people} on ${people.id} = ${credits.personId}
    where ${credits.workId} = ${works.id} order by ${credits.position} limit 1)`),
  publisher: nested<string | null>(firstEdition(editions.publisher)),
  year: nested<number | null>(sql`coalesce(${works.firstYear}, ${firstEdition(editions.year)})`),
  copies: nested<number>(sql`(select count(*) from ${copies}
    join ${editions} on ${editions.id} = ${copies.editionId}
    where ${editions.workId} = ${works.id})`),
};

export type WorkSummary = {
  id: string;
  kind: Kind;
  title: string;
  creator: string | null;
  publisher: string | null;
  year: number | null;
  copies: number;
};

export const listRecent = (db: Db, limit = 12): Promise<WorkSummary[]> =>
  db.select(summaryFields).from(works).orderBy(desc(works.createdAt)).limit(limit);

export const countByKind = async (db: Db) => {
  const rows = await db
    .select({ kind: works.kind, total: count() })
    .from(works)
    .groupBy(works.kind);

  const totals = Object.fromEntries(KINDS.map((kind) => [kind, 0])) as Record<Kind, number>;

  for (const row of rows) totals[row.kind] = row.total;

  return totals;
};
