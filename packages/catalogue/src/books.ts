export const BOOK_GENRES = [
  'novel',
  'graphic novel',
  'poetry',
  'short stories',
  'non-fiction',
  'anthology',
] as const;
export type BookGenre = (typeof BOOK_GENRES)[number];

export const BINDINGS = ['hardback', 'paperback', 'omnibus', 'absolute'] as const;
export type Binding = (typeof BINDINGS)[number];
