import type { Kind } from '@shelf/catalogue';
import type { copies } from '../schema/copies.ts';
import type { editions } from '../schema/editions.ts';
import type { bookEditions } from '../schema/kinds/books.ts';
import type { gameCopies, gameEditions } from '../schema/kinds/games.ts';
import type { recordCopies, recordEditions, tracks } from '../schema/kinds/records.ts';

type Fields<Table extends { $inferInsert: object }, Key extends string> = Omit<
  Table['$inferInsert'],
  Key | 'createdAt' | 'updatedAt'
>;

export type CreditInput = { name: string; role: string };

export type WorkInput = {
  title: string;
  subtitle: string | null;
  firstYear: number | null;
  description: string | null;
  credits: CreditInput[];
  tags: string[];
};

export type TrackInput = Fields<typeof tracks, 'id' | 'editionId'>;

export type EditionDetails =
  | { kind: 'book'; values: Fields<typeof bookEditions, 'editionId'> }
  | { kind: 'record'; values: Fields<typeof recordEditions, 'editionId'>; tracks: TrackInput[] }
  | { kind: 'board_game'; values: Fields<typeof gameEditions, 'editionId'> };

// What a person can edit; where the edition came from is set once, when it is added.
export type EditionInput = Fields<
  typeof editions,
  'id' | 'workId' | 'coverKey' | 'source' | 'sourceRef'
> & {
  details: EditionDetails;
};

export type NewEdition = EditionInput & { source: string; sourceRef: string | null };

export type CopyDetails =
  | { kind: 'book' }
  | { kind: 'record'; values: Fields<typeof recordCopies, 'copyId'> }
  | { kind: 'board_game'; values: Fields<typeof gameCopies, 'copyId'> };

export type CopyInput = Fields<typeof copies, 'id' | 'editionId'> & { details: CopyDetails };

export type NewWork = { kind: Kind; work: WorkInput; edition: NewEdition; copy: CopyInput };
