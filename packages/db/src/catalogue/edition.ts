import { asc, eq, inArray, type SQL } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { copies } from '../schema/copies.ts';
import { editions } from '../schema/editions.ts';
import { bookEditions } from '../schema/kinds/books.ts';
import { gameCopies, gameEditions } from '../schema/kinds/games.ts';
import { recordCopies, recordEditions, tracks } from '../schema/kinds/records.ts';
import { works } from '../schema/works.ts';

const editionRows = (db: Db, where: SQL) =>
  db
    .select({
      edition: editions,
      kind: works.kind,
      book: bookEditions,
      record: recordEditions,
      game: gameEditions,
    })
    .from(editions)
    .innerJoin(works, eq(works.id, editions.workId))
    .leftJoin(bookEditions, eq(bookEditions.editionId, editions.id))
    .leftJoin(recordEditions, eq(recordEditions.editionId, editions.id))
    .leftJoin(gameEditions, eq(gameEditions.editionId, editions.id))
    .where(where)
    .orderBy(asc(editions.createdAt));

const trackRows = (db: Db, editionIds: string[]) =>
  editionIds.length
    ? db
        .select()
        .from(tracks)
        .where(inArray(tracks.editionId, editionIds))
        .orderBy(asc(tracks.side), asc(tracks.position))
    : Promise.resolve([]);

// Editions with whichever detail row they have (the other two are null) and their tracks.
export const readEditions = async (db: Db, where: SQL) => {
  const rows = await editionRows(db, where);
  const tracked = await trackRows(
    db,
    rows.map((row) => row.edition.id),
  );

  return rows.map(({ edition, ...rest }) => ({
    ...edition,
    ...rest,
    tracks: tracked.filter((track) => track.editionId === edition.id),
  }));
};

export const readCopies = (db: Db, where: SQL) =>
  db
    .select({ copy: copies, record: recordCopies, game: gameCopies })
    .from(copies)
    .leftJoin(recordCopies, eq(recordCopies.copyId, copies.id))
    .leftJoin(gameCopies, eq(gameCopies.copyId, copies.id))
    .where(where)
    .orderBy(asc(copies.createdAt))
    .then((rows) => rows.map(({ copy, ...rest }) => ({ ...copy, ...rest })));

export const getEdition = async (db: Db, id: string) =>
  (await readEditions(db, eq(editions.id, id)))[0] ?? null;

// A copy with its details and the kind and work it belongs to.
export const getCopy = async (db: Db, id: string) => {
  const [copy] = await readCopies(db, eq(copies.id, id));

  if (!copy) return null;

  const [owner] = await db
    .select({ workId: works.id, kind: works.kind, title: works.title })
    .from(editions)
    .innerJoin(works, eq(works.id, editions.workId))
    .where(eq(editions.id, copy.editionId));

  return { ...copy, ...owner! };
};

export type EditionDetail = NonNullable<Awaited<ReturnType<typeof getEdition>>>;

export type CopyDetail = NonNullable<Awaited<ReturnType<typeof getCopy>>>;
