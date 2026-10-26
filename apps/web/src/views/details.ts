import type { CopyDetail, EditionDetail, WorkDetail } from '@shelf/db';
import type { Detail } from '../components/molecules/detail-list.tsx';
import { languageName, sentence } from './labels.ts';

type Maybe = string | number | null | undefined;

// Pairs whose value is missing are dropped, so cards only show what is known.
const known = (pairs: [string, Maybe][]): Detail[] =>
  pairs
    .filter((pair): pair is [string, string | number] => pair[1] != null && pair[1] !== '')
    .map(([term, value]) => [term, String(value)]);

export const workDetails = (work: WorkDetail) =>
  known([
    ['First year', work.firstYear],
    ['Tags', work.tags.join(', ')],
  ]);

export const editionTitle = (edition: EditionDetail) =>
  [edition.publisher, edition.year].filter((part) => part != null).join(', ') || 'Edition';

const bookDetails = ({ book }: EditionDetail) =>
  book
    ? known([
        ['Genre', sentence(book.genre)],
        ['Binding', sentence(book.binding)],
        ['ISBN', book.isbn13 ?? book.isbn10],
        ['Pages', book.pageCount],
        ['Language', book.language === 'en' ? null : languageName(book.language)],
        ['Edition', book.editionStatement],
        ['Series', book.series && [book.series, book.seriesNumber].filter(Boolean).join(' #')],
      ])
    : [];

const recordDetails = ({ record }: EditionDetail) =>
  record
    ? known([
        ['Format', `${record.format}, ${record.speed} rpm`],
        ['Genre', sentence(record.genre)],
        ['Catalogue', record.catalogueNumber],
        ['Discs', record.discCount > 1 ? record.discCount : null],
        ['Vinyl', record.vinylColour === 'black' ? null : sentence(record.vinylColour)],
        ['Pressed in', record.pressingCountry],
      ])
    : [];

const gameDetails = ({ game }: EditionDetail) =>
  game
    ? known([
        [
          'Players',
          game.minPlayers === game.maxPlayers
            ? game.minPlayers
            : `${game.minPlayers} to ${game.maxPlayers}`,
        ],
        ['Time', `${game.playMinutes} minutes`],
        ['Age', game.minAge && `${game.minAge}+`],
        ['Language', game.language === 'en' ? null : languageName(game.language)],
      ])
    : [];

export const editionDetails = (edition: EditionDetail) => [
  ...bookDetails(edition),
  ...recordDetails(edition),
  ...gameDetails(edition),
  ...known([['Barcode', edition.barcode]]),
];

export const copyDetails = (copy: Omit<CopyDetail, 'workId' | 'kind' | 'title'>) =>
  known([
    ['Where', copy.location],
    ['Condition', copy.condition],
    [
      'Grades',
      copy.record && [copy.record.mediaGrade, copy.record.sleeveGrade].filter(Boolean).join(' / '),
    ],
    ['Complete', copy.game && (copy.game.complete ? 'Yes' : `No: ${copy.game.missingNotes ?? ''}`)],
    ['Acquired', [copy.acquiredOn, copy.acquiredFrom].filter(Boolean).join(', ')],
    ['Notes', copy.notes],
  ]);
