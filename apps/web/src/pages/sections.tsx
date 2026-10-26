import type { Kind } from '@shelf/catalogue';
import type { Section } from '../components/organisms/entry-form.tsx';
import { CreditRows } from '../components/organisms/credit-rows.tsx';
import { FieldList } from '../components/organisms/field-list.tsx';
import { copyFields } from '../forms/copy.ts';
import { editionFields } from '../forms/edition.ts';
import { many, type FieldErrors, type FormValues } from '../forms/form-data.ts';
import { WORK_FIELDS } from '../forms/work.ts';

export type FormState = { values: FormValues; errors: FieldErrors };

// Typed rows back from the form, without the blank ones.
const typedCredits = (values: FormValues) => {
  const roles = many(values, 'creditRole');
  return many(values, 'creditName')
    .map((name, row) => ({ name, role: roles[row] ?? '' }))
    .filter((credit) => credit.name.trim() !== '');
};

export const workSection = (kind: Kind, { values, errors }: FormState): Section => ({
  legend: 'Work',
  content: (
    <>
      <FieldList fields={WORK_FIELDS} values={values} errors={errors} />
      <CreditRows kind={kind} credits={typedCredits(values)} error={errors.credits} />
    </>
  ),
});

export const editionSection = (kind: Kind, { values, errors }: FormState): Section => ({
  legend: 'Edition',
  content: <FieldList fields={editionFields(kind)} values={values} errors={errors} />,
});

export const copySection = (kind: Kind, { values, errors }: FormState): Section => ({
  legend: 'Your copy',
  content: <FieldList fields={copyFields(kind)} values={values} errors={errors} />,
});
