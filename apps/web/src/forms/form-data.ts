import type { Context } from 'hono';

// Raw form input: one string per field, or several for repeated names such as credit rows.
export type FormValues = Record<string, string | string[]>;

export type FieldErrors = Record<string, string>;

export const readForm = async (context: Context): Promise<FormValues> => {
  const body = await context.req.parseBody({ all: true });
  const values: FormValues = {};

  for (const [name, value] of Object.entries(body)) {
    const strings = [value].flat().filter((part) => typeof part === 'string');
    values[name] = strings.length === 1 ? strings[0]! : strings;
  }

  return values;
};

export const one = (values: FormValues, name: string) => [values[name] ?? ''].flat()[0] ?? '';

export const many = (values: FormValues, name: string) => [values[name] ?? []].flat();

// The first value of every field, for schemas that expect one string each.
export const single = (values: FormValues) =>
  Object.fromEntries(Object.keys(values).map((name) => [name, one(values, name)]));

const asText = (value: unknown) => {
  if (typeof value === 'boolean') return value ? 'yes' : 'no';

  if (typeof value === 'number') return String(value);

  return typeof value === 'string' ? value : '';
};

// A saved row back into form input: null becomes blank, booleans become yes or no.
export const toValues = (row: object, names: readonly string[]): FormValues => {
  const fields: Record<string, unknown> = { ...row };

  return Object.fromEntries(names.map((name) => [name, asText(fields[name])]));
};
