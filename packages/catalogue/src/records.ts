// Discogs' top-level genres; finer styles such as ska go in tags.
export const RECORD_GENRES = [
  'rock',
  'electronic',
  'pop',
  'reggae',
  'funk and soul',
  'jazz',
  'hip hop',
  'folk',
  'blues',
  'classical',
  'latin',
  'stage and screen',
] as const;
export type RecordGenre = (typeof RECORD_GENRES)[number];

export const RECORD_FORMATS = [
  'LP',
  '2LP',
  '12-inch single',
  '10-inch',
  '7-inch',
  'box set',
] as const;
export type RecordFormat = (typeof RECORD_FORMATS)[number];

export const SPEEDS = [33, 45, 78] as const;
export type Speed = (typeof SPEEDS)[number];

// Goldmine grades, best first.
export const GRADES = ['M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P'] as const;
export type Grade = (typeof GRADES)[number];
