import { GRADES, RECORD_FORMATS, RECORD_GENRES, SPEEDS } from '@shelf/catalogue';
import * as v from 'valibot';
import { choice, optionalChoice, optionalText, requiredWhole, textOr } from './fields.ts';
import type { FieldSpec } from './spec.ts';

const speeds = SPEEDS.map(String);

export const recordEditionFields: FieldSpec[] = [
  { name: 'format', label: 'Format', control: 'select', options: RECORD_FORMATS, required: true },
  { name: 'speed', label: 'Speed (rpm)', control: 'select', options: SPEEDS, required: true },
  { name: 'genre', label: 'Genre', control: 'select', options: RECORD_GENRES, required: true },
  { name: 'catalogueNumber', label: 'Catalogue number' },
  { name: 'discCount', label: 'Discs', type: 'number', inputmode: 'numeric', required: true },
  { name: 'vinylColour', label: 'Vinyl colour' },
  { name: 'pressingCountry', label: 'Pressed in' },
  {
    name: 'tracklist',
    label: 'Tracklist',
    control: 'textarea',
    hint: 'One track a line: A1 Title 4:05. The time is optional.',
  },
];

export const recordEditionSchema = v.object({
  format: choice(RECORD_FORMATS, 'Choose a format.'),
  speed: v.pipe(choice(speeds, 'Choose a speed.'), v.transform(Number)),
  genre: choice(RECORD_GENRES, 'Choose a genre.'),
  catalogueNumber: optionalText(),
  discCount: requiredWhole(1, 20, 'Enter the number of discs.'),
  vinylColour: textOr('black'),
  pressingCountry: optionalText(),
});

export const recordCopyFields: FieldSpec[] = [
  {
    name: 'mediaGrade',
    label: 'Vinyl grade',
    control: 'select',
    options: GRADES,
    blank: 'Not graded',
  },
  {
    name: 'sleeveGrade',
    label: 'Sleeve grade',
    control: 'select',
    options: GRADES,
    blank: 'Not graded',
  },
];

export const recordCopySchema = v.object({
  mediaGrade: optionalChoice(GRADES),
  sleeveGrade: optionalChoice(GRADES),
});

export const recordDefaults = { speed: '33', discCount: '1', vinylColour: 'black' };
