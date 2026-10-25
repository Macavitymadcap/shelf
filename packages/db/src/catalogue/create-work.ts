import type { Db } from '../client.ts';
import { copies } from '../schema/copies.ts';
import { editions } from '../schema/editions.ts';
import { works } from '../schema/works.ts';
import { sortTitle } from '@shelf/catalogue';
import { runBatch, type Statement } from './batch.ts';
import { copyDetailStatements, editionDetailStatements } from './details.ts';
import { creditStatements } from './people.ts';
import { reindexWork } from './search-index.ts';
import { tagStatements } from './tags.ts';
import type { CopyInput, NewEdition, NewWork, WorkInput } from './types.ts';

export const workRow = ({ title, subtitle, firstYear, description }: WorkInput) => ({
  title,
  subtitle,
  firstYear,
  description,
  sortTitle: sortTitle(title),
});

// The statements that add an edition and its first copy to an existing work.
export const editionStatements = (
  db: Db,
  workId: string,
  { details, ...edition }: NewEdition,
  { details: copyDetails, ...copy }: CopyInput,
): Statement[] => {
  const editionId = crypto.randomUUID();
  const copyId = crypto.randomUUID();

  return [
    db.insert(editions).values({ ...edition, id: editionId, workId }),
    ...editionDetailStatements(db, editionId, details),
    db.insert(copies).values({ ...copy, id: copyId, editionId }),
    ...copyDetailStatements(db, copyId, copyDetails),
  ];
};

// Saves a work, its first edition and first copy as one transaction; returns the work id.
export const createWork = async (db: Db, { kind, work, edition, copy }: NewWork) => {
  const id = crypto.randomUUID();

  await runBatch(db, [
    db.insert(works).values({ ...workRow(work), id, kind }),
    ...(await creditStatements(db, id, work.credits)),
    ...(await tagStatements(db, id, work.tags)),
    ...editionStatements(db, id, edition, copy),
    ...reindexWork(db, id),
  ]);

  return id;
};
