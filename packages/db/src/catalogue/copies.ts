import { eq } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { copies } from '../schema/copies.ts';
import { runBatch } from './batch.ts';
import { copyDetailStatements } from './details.ts';
import type { CopyInput } from './types.ts';

export const addCopy = async (db: Db, editionId: string, { details, ...copy }: CopyInput) => {
  const id = crypto.randomUUID();
  await runBatch(db, [
    db.insert(copies).values({ ...copy, id, editionId }),
    ...copyDetailStatements(db, id, details),
  ]);
  return id;
};

export const updateCopy = (db: Db, id: string, { details, ...copy }: CopyInput) =>
  runBatch(db, [
    db.update(copies).set(copy).where(eq(copies.id, id)),
    ...copyDetailStatements(db, id, details),
  ]);

export const deleteCopy = (db: Db, id: string) => db.delete(copies).where(eq(copies.id, id));
