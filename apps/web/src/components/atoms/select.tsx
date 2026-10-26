import type { FC, JSX } from 'hono/jsx';

export type Option = { value: string; label: string };

export type SelectProps = JSX.IntrinsicElements['select'] & {
  options: Option[];
  value?: string;
  // The label of an empty first option, for a choice that may be left unset.
  blank?: string;
};

export const Select: FC<SelectProps> = ({ options, value = '', blank, ...props }) => (
  <select class="select" {...props}>
    {blank !== undefined && <option value="">{blank}</option>}
    {options.map((option) => (
      <option value={option.value} selected={option.value === value}>
        {option.label}
      </option>
    ))}
  </select>
);
