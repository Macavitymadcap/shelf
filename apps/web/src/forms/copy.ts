import type { Kind } from '@shelf/catalogue';
import type { CopyDetail, CopyDetails, CopyInput } from '@shelf/db';
import * as v from 'valibot';
import { isoDate, optionalText } from './fields.ts';
import { single, toValues, type FormValues } from './form-data.ts';
import { gameCopyFields, gameCopySchema } from './game.ts';
import { recordCopyFields, recordCopySchema } from './record.ts';
import type { FieldSpec } from './spec.ts';
import { errorsOf, validate, type Validated } from './validate.ts';

const COMMON_FIELDS: FieldSpec[] = [
  { name: 'condition', label: 'Condition', hint: 'In your own words: fine, worn spine.' },
  { name: 'location', label: 'Where it lives' },
  { name: 'acquiredOn', label: 'Acquired on', type: 'date' },
  { name: 'acquiredFrom', label: 'Acquired from' },
  { name: 'notes', label: 'Notes', control: 'textarea' },
];

const commonSchema = v.object({
  condition: optionalText(),
  location: optionalText(),
  acquiredOn: isoDate(),
  acquiredFrom: optionalText(),
  notes: optionalText(2000),
});

const KIND_FIELDS = { book: [], record: recordCopyFields, board_game: gameCopyFields };

export const copyFields = (kind: Kind) => [...COMMON_FIELDS, ...KIND_FIELDS[kind]];

const parseDetails = (values: FormValues, kind: Kind): Validated<CopyDetails> => {
  if (kind === 'book') return { ok: true, value: { kind } };

  const result =
    kind === 'record'
      ? validate(recordCopySchema, single(values))
      : validate(gameCopySchema, single(values));

  return result.ok ? { ok: true, value: { kind, values: result.value } as CopyDetails } : result;
};

export const parseCopy = (values: FormValues, kind: Kind): Validated<CopyInput> => {
  const common = validate(commonSchema, single(values));
  const details = parseDetails(values, kind);

  if (common.ok && details.ok)
    return { ok: true, value: { ...common.value, details: details.value } };

  return { ok: false, errors: errorsOf(common, details) };
};

export const copyValues = (copy: CopyDetail): FormValues => ({
  ...toValues(copy, ['condition', 'location', 'acquiredOn', 'acquiredFrom', 'notes']),
  ...toValues(
    copy.record ?? copy.game ?? {},
    KIND_FIELDS[copy.kind].map((field) => field.name),
  ),
});
