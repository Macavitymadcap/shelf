// How one form field is drawn; the matching schema decides what it accepts.
export type FieldSpec = {
  name: string;
  label: string;
  control?: 'input' | 'select' | 'textarea';
  type?: 'text' | 'number' | 'date';
  inputmode?: 'numeric';
  options?: readonly (string | number)[];
  // The label of the empty first option of an optional select.
  blank?: string;
  required?: boolean;
  hint?: string;
};
