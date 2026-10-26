import type { Kind } from '@shelf/catalogue';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { works } from '../schema/works.ts';
import { searchIndex, toMatchQuery } from './search-index.ts';
import { summaryFields, type WorkSummary } from './summaries.ts';

export type SearchQuery = { text: string; kind?: Kind };

// Every work of one kind, A to Z: what a search with only a kind chosen shows.
const browseKind = (db: Db, kind: Kind) =>
  db
    .select(summaryFields)
    .from(works)
    .where(eq(works.kind, kind))
    .orderBy(asc(works.sortTitle))
    .limit(200);

// Best matches first. With no words, a chosen kind is listed A to Z; otherwise nothing.
export const searchWorks = async (db: Db, { text, kind }: SearchQuery): Promise<WorkSummary[]> => {
  const match = toMatchQuery(text);

  if (!match) return kind ? browseKind(db, kind) : [];

  return db
    .select(summaryFields)
    .from(searchIndex)
    .innerJoin(works, eq(works.id, searchIndex.workId))
    .where(and(sql`${searchIndex} match ${match}`, kind ? eq(works.kind, kind) : undefined))
    .orderBy(sql`rank`)
    .limit(50);
};
