import type { BatchItem } from 'drizzle-orm/batch';
import type { Db } from '../client.ts';

export type Statement = BatchItem<'sqlite'>;

// D1 runs a batch as one transaction: every statement lands, or none do.
export const runBatch = async (db: Db, statements: Statement[]) => {
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);
};
