import { eq, inArray } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { copies } from '../schema/copies.ts';
import { editions } from '../schema/editions.ts';
import { works } from '../schema/works.ts';
import { runBatch } from './batch.ts';
import { workRow } from './create-work.ts';
import { creditStatements } from './people.ts';
import { reindexWork, searchIndex } from './search-index.ts';
import { tagStatements } from './tags.ts';
import type { WorkInput } from './types.ts';

export const updateWork = async (db: Db, id: string, work: WorkInput) =>
  runBatch(db, [
    db.update(works).set(workRow(work)).where(eq(works.id, id)),
    ...(await creditStatements(db, id, work.credits)),
    ...(await tagStatements(db, id, work.tags)),
    ...reindexWork(db, id),
  ]);

const editionIds = (db: Db, workId: string) =>
  db.select({ id: editions.id }).from(editions).where(eq(editions.workId, workId));

// Copies, then editions, then the work: the order the restrict rules demand.
export const deleteWork = async (db: Db, id: string) =>
  runBatch(db, [
    db.delete(copies).where(inArray(copies.editionId, editionIds(db, id))),
    db.delete(editions).where(eq(editions.workId, id)),
    db.delete(works).where(eq(works.id, id)),
    db.delete(searchIndex).where(eq(searchIndex.workId, id)),
  ]);
