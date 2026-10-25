import { eq } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { bookEditions } from '../schema/kinds/books.ts';
import { gameCopies, gameEditions } from '../schema/kinds/games.ts';
import { recordCopies, recordEditions, tracks } from '../schema/kinds/records.ts';
import type { Statement } from './batch.ts';
import type { CopyDetails, EditionDetails } from './types.ts';

const recordStatements = (
  db: Db,
  editionId: string,
  details: EditionDetails & { kind: 'record' },
) => {
  const statements: Statement[] = [
    db.delete(recordEditions).where(eq(recordEditions.editionId, editionId)),
    db.insert(recordEditions).values({ ...details.values, editionId }),
    db.delete(tracks).where(eq(tracks.editionId, editionId)),
  ];

  const rows = details.tracks.map((track) => ({ ...track, editionId }));

  if (rows.length) statements.push(db.insert(tracks).values(rows));

  return statements;
};

// Replaces an edition's detail row (and, for records, its tracklist).
export const editionDetailStatements = (
  db: Db,
  editionId: string,
  details: EditionDetails,
): Statement[] => {
  if (details.kind === 'record') return recordStatements(db, editionId, details);

  const table = details.kind === 'book' ? bookEditions : gameEditions;

  return [
    db.delete(table).where(eq(table.editionId, editionId)),
    details.kind === 'book'
      ? db.insert(bookEditions).values({ ...details.values, editionId })
      : db.insert(gameEditions).values({ ...details.values, editionId }),
  ];
};

// Replaces a copy's detail row; books have none.
export const copyDetailStatements = (db: Db, copyId: string, details: CopyDetails): Statement[] => {
  if (details.kind === 'book') return [];

  if (details.kind === 'record') {
    return [
      db.delete(recordCopies).where(eq(recordCopies.copyId, copyId)),
      db.insert(recordCopies).values({ ...details.values, copyId }),
    ];
  }

  return [
    db.delete(gameCopies).where(eq(gameCopies.copyId, copyId)),
    db.insert(gameCopies).values({ ...details.values, copyId }),
  ];
};
