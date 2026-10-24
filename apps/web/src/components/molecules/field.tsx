import type { FC } from 'hono/jsx';
import { Input, type InputProps } from '../atoms/input.tsx';

type FieldProps = InputProps & { label: string; name: string };

export const Field: FC<FieldProps> = ({ label, name, ...input }) => (
  <div class="field">
    <label class="field__label" for={`field-${name}`}>
      {label}
    </label>
    <Input id={`field-${name}`} name={name} {...input} />
  </div>
);
