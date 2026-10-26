import { formatTracklist, parseTracklist, type Kind } from '@shelf/catalogue';
import type { EditionDetail, EditionDetails, EditionInput } from '@shelf/db';
import * as v from 'valibot';
import { bookEditionFields, bookEditionSchema } from './book.ts';
import { optionalCode, optionalText, optionalWhole } from './fields.ts';
import { one, single, toValues, type FormValues } from './form-data.ts';
import { gameEditionFields, gameEditionSchema } from './game.ts';
import { recordEditionFields, recordEditionSchema } from './record.ts';
import type { FieldSpec } from './spec.ts';
import { errorsOf, validate, type Validated } from './validate.ts';

const COMMON_FIELDS: FieldSpec[] = [
  { name: 'publisher', label: 'Publisher or label' },
  { name: 'year', label: 'Year of this edition', type: 'number', inputmode: 'numeric' },
  { name: 'barcode', label: 'Barcode', inputmode: 'numeric' },
];

const commonSchema = v.object({
  publisher: optionalText(),
  year: optionalWhole(1000, 2100),
  barcode: optionalCode(/^\d{8,14}$/, 'A barcode is 8 to 14 digits.'),
});

const KIND_FIELDS = {
  book: bookEditionFields,
  record: recordEditionFields,
  board_game: gameEditionFields,
};

export const editionFields = (kind: Kind) => [...COMMON_FIELDS, ...KIND_FIELDS[kind]];

const parseRecord = (values: FormValues): Validated<EditionDetails> => {
  const fields = validate(recordEditionSchema, single(values));
  const { tracks, errors } = parseTracklist(one(values, 'tracklist'));

  if (fields.ok && !errors.length)
    return { ok: true, value: { kind: 'record', values: fields.value, tracks } };

  return {
    ok: false,
    errors: { ...errorsOf(fields), ...(errors.length ? { tracklist: errors[0]! } : {}) },
  };
};

const parseDetails = (values: FormValues, kind: Kind): Validated<EditionDetails> => {
  if (kind === 'record') return parseRecord(values);

  const result =
    kind === 'book'
      ? validate(bookEditionSchema, single(values))
      : validate(gameEditionSchema, single(values));

  return result.ok ? { ok: true, value: { kind, values: result.value } as EditionDetails } : result;
};

export const parseEdition = (values: FormValues, kind: Kind): Validated<EditionInput> => {
  const common = validate(commonSchema, single(values));
  const details = parseDetails(values, kind);

  if (common.ok && details.ok)
    return { ok: true, value: { ...common.value, details: details.value } };

  return { ok: false, errors: errorsOf(common, details) };
};

const DETAIL_NAMES = Object.fromEntries(
  Object.entries(KIND_FIELDS).map(([kind, fields]) => [kind, fields.map((field) => field.name)]),
) as Record<Kind, string[]>;

export const editionValues = (edition: EditionDetail): FormValues => ({
  ...toValues(edition, ['publisher', 'year', 'barcode']),
  ...toValues(edition.book ?? edition.record ?? edition.game ?? {}, DETAIL_NAMES[edition.kind]),
  tracklist: formatTracklist(edition.tracks),
});
