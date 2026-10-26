import { eq } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { copies } from '../schema/copies.ts';
import { editions } from '../schema/editions.ts';
import { runBatch } from './batch.ts';
import { editionStatements } from './create-work.ts';
import { editionDetailStatements } from './details.ts';
import type { CopyInput, EditionInput, NewEdition } from './types.ts';

export const addEdition = (db: Db, workId: string, edition: NewEdition, copy: CopyInput) =>
  runBatch(db, editionStatements(db, workId, edition, copy));

export const updateEdition = (db: Db, id: string, { details, ...edition }: EditionInput) =>
  runBatch(db, [
    db.update(editions).set(edition).where(eq(editions.id, id)),
    ...editionDetailStatements(db, id, details),
  ]);

// Its copies go first; details, tracks and edition credits cascade.
export const deleteEdition = (db: Db, id: string) =>
  runBatch(db, [
    db.delete(copies).where(eq(copies.editionId, id)),
    db.delete(editions).where(eq(editions.id, id)),
  ]);
