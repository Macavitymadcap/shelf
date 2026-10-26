import type { ItemSummary } from '../components/organisms/item-card.tsx';
import type { EditionView } from '../views/work.ts';

export const ITEMS: ItemSummary[] = [
  {
    href: '#',
    kind: 'Book',
    creator: 'Le Guin, Ursula K.',
    title: 'The Dispossessed: an ambiguous utopia',
    details: [
      ['Published', 'Gollancz, 1974'],
      ['Copies', '2'],
    ],
  },
  {
    href: '#',
    kind: 'Record',
    creator: 'Talk Talk',
    title: 'Spirit of Eden',
    details: [
      ['Released', 'Parlophone, 1988'],
      ['Copies', '1'],
    ],
  },
  {
    href: '#',
    kind: 'Game',
    creator: 'Uwe Rosenberg',
    title: 'Agricola',
    details: [
      ['Published', 'Lookout, 2007'],
      ['Copies', '1'],
    ],
  },
];

export const EDITION: EditionView = {
  id: 'sample',
  title: 'Parlophone, 1988',
  details: [
    ['Format', 'LP, 33 rpm'],
    ['Genre', 'Rock'],
  ],
  tracks: [
    { side: 'A', position: 1, title: 'The Rainbow', durationSeconds: 546 },
    { side: 'A', position: 2, title: 'Eden', durationSeconds: 457 },
    { side: 'B', position: 1, title: 'Desire', durationSeconds: 428 },
  ],
  copies: [
    {
      id: 'one',
      details: [
        ['Where', 'Record shelf'],
        ['Grades', 'VG+ / VG'],
      ],
    },
  ],
};
