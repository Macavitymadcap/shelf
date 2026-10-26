import type { FC } from 'hono/jsx';
import type { FieldErrors, FormValues } from '../../forms/form-data.ts';
import { one } from '../../forms/form-data.ts';
import type { FieldSpec } from '../../forms/spec.ts';
import { sentence } from '../../views/labels.ts';
import { Field, SelectField, TextareaField } from '../molecules/field.tsx';

type FieldListProps = { fields: FieldSpec[]; values: FormValues; errors: FieldErrors };

const options = (spec: FieldSpec) =>
  (spec.options ?? []).map((option) => ({
    value: String(option),
    label: sentence(String(option)),
  }));

// Draws each spec as the right kind of field. No stylesheet: it adds no element of its own.
export const FieldList: FC<FieldListProps> = ({ fields, values, errors }) => (
  <>
    {fields.map((spec) => {
      const common = {
        label: spec.label,
        name: spec.name,
        hint: spec.hint,
        error: errors[spec.name],
      };
      const value = one(values, spec.name);

      if (spec.control === 'select') {
        const blank = spec.required ? undefined : (spec.blank ?? 'Not recorded');
        return (
          <SelectField
            {...common}
            options={options(spec)}
            value={value}
            blank={blank}
            required={spec.required}
          />
        );
      }

      if (spec.control === 'textarea') return <TextareaField {...common} value={value} />;

      return (
        <Field
          {...common}
          value={value}
          type={spec.type}
          inputmode={spec.inputmode}
          required={spec.required}
        />
      );
    })}
  </>
);
