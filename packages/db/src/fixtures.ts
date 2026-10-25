// Sample works for tests in this package and the web app.
import type { CopyInput, NewEdition, NewWork } from './index.ts';

const copy: CopyInput = {
  condition: 'Good',
  location: 'Second shelf',
  acquiredOn: null,
  acquiredFrom: null,
  notes: null,
  details: { kind: 'book' },
};

export const bookEdition = (overrides: Partial<NewEdition> = {}): NewEdition => ({
  publisher: 'DC Comics',
  year: 1987,
  barcode: null,
  source: 'manual',
  sourceRef: null,
  details: {
    kind: 'book',
    values: { isbn13: '9780930289232', genre: 'graphic novel', binding: 'paperback' },
  },
  ...overrides,
});

export const watchmen = (): NewWork => ({
  kind: 'book',
  work: {
    title: 'Watchmen',
    subtitle: null,
    firstYear: 1986,
    description: null,
    credits: [
      { name: 'Alan Moore', role: 'writer' },
      { name: 'Dave Gibbons', role: 'artist' },
    ],
    tags: ['superheroes', 'dc'],
  },
  edition: bookEdition(),
  copy,
});

export const spiritOfEden = (): NewWork => ({
  kind: 'record',
  work: {
    title: 'Spirit of Eden',
    subtitle: null,
    firstYear: 1988,
    description: null,
    credits: [{ name: 'Talk Talk', role: 'artist' }],
    tags: ['art rock'],
  },
  edition: {
    publisher: 'Parlophone',
    year: 1988,
    barcode: null,
    source: 'manual',
    sourceRef: null,
    details: {
      kind: 'record',
      values: { format: 'LP', genre: 'rock' },
      tracks: [{ side: 'A', position: 1, title: 'The Rainbow', durationSeconds: 546 }],
    },
  },
  copy: { ...copy, details: { kind: 'record', values: { mediaGrade: 'VG+', sleeveGrade: 'VG' } } },
});
