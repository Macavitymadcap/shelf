import type { Kind } from '@shelf/catalogue';
import type { WorkDetail, WorkInput } from '@shelf/db';
import * as v from 'valibot';
import { parseCredits } from './credits.ts';
import { optionalText, optionalWhole, requiredText } from './fields.ts';
import { single, toValues, type FormValues } from './form-data.ts';
import type { FieldSpec } from './spec.ts';
import { errorsOf, validate, type Validated } from './validate.ts';

export const WORK_FIELDS: FieldSpec[] = [
  { name: 'title', label: 'Title', required: true },
  { name: 'subtitle', label: 'Subtitle' },
  { name: 'firstYear', label: 'First year', type: 'number', inputmode: 'numeric' },
  { name: 'description', label: 'Description', control: 'textarea' },
  { name: 'tags', label: 'Tags', hint: 'Separate tags with commas: ska, 2 tone.' },
];

// Lower-case, trimmed and without repeats.
const splitTags = (text: string) => [
  ...new Set(
    text
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
  ),
];

const workSchema = v.object({
  title: requiredText('Enter the title.'),
  subtitle: optionalText(),
  firstYear: optionalWhole(1000, 2100),
  description: optionalText(2000),
  tags: v.pipe(v.optional(v.string(), ''), v.transform(splitTags)),
});

export const parseWork = (values: FormValues, kind: Kind): Validated<WorkInput> => {
  const fields = validate(workSchema, single(values));
  const credits = parseCredits(values, kind);

  if (fields.ok && credits.ok)
    return { ok: true, value: { ...fields.value, credits: credits.value } };

  return { ok: false, errors: errorsOf(fields, credits) };
};

export const workValues = (work: WorkDetail): FormValues => ({
  ...toValues(work, ['title', 'subtitle', 'firstYear', 'description']),
  tags: work.tags.join(', '),
  creditName: work.credits.map((credit) => credit.name),
  creditRole: work.credits.map((credit) => credit.role),
});
