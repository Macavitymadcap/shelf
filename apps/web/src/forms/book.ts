import { BINDINGS, BOOK_GENRES } from '@shelf/catalogue';
import * as v from 'valibot';
import { choice, language, optionalCode, optionalText, optionalWhole } from './fields.ts';
import type { FieldSpec } from './spec.ts';

export const bookEditionFields: FieldSpec[] = [
  { name: 'genre', label: 'Genre', control: 'select', options: BOOK_GENRES, required: true },
  { name: 'binding', label: 'Binding', control: 'select', options: BINDINGS, required: true },
  { name: 'isbn13', label: 'ISBN-13', inputmode: 'numeric' },
  { name: 'isbn10', label: 'ISBN-10' },
  { name: 'pageCount', label: 'Pages', type: 'number', inputmode: 'numeric' },
  { name: 'language', label: 'Language', hint: 'A language code: en, la, grc.' },
  { name: 'editionStatement', label: 'Edition statement', hint: 'As printed: First edition.' },
  { name: 'series', label: 'Series' },
  { name: 'seriesNumber', label: 'Number in series', type: 'number', inputmode: 'numeric' },
];

export const bookEditionSchema = v.object({
  genre: choice(BOOK_GENRES, 'Choose a genre.'),
  binding: choice(BINDINGS, 'Choose a binding.'),
  isbn13: optionalCode(/^97[89]\d{10}$/, 'An ISBN-13 is 13 digits starting 978 or 979.'),
  isbn10: optionalCode(/^\d{9}[\dX]$/, 'An ISBN-10 is 9 digits then a digit or X.'),
  pageCount: optionalWhole(1, 20000),
  language: language(),
  editionStatement: optionalText(),
  series: optionalText(),
  seriesNumber: optionalWhole(0, 10000),
});

export const bookDefaults = { language: 'en' };
