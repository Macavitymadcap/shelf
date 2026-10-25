import type { Kind } from './kinds.ts';

export const ROLES = {
  book: [
    'author',
    'writer',
    'artist',
    'penciller',
    'inker',
    'colourist',
    'letterer',
    'illustrator',
    'cover artist',
    'translator',
    'editor',
  ],
  record: ['artist', 'featured artist', 'producer', 'engineer', 'composer', 'sleeve designer'],
  board_game: ['designer', 'artist', 'developer'],
} as const satisfies Record<Kind, readonly string[]>;

export type Role = (typeof ROLES)[Kind][number];
