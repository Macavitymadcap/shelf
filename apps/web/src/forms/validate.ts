import * as v from 'valibot';
import type { FieldErrors } from './form-data.ts';

export type Validated<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

// The first message for each field that failed, keyed by the field's name.
export const validate = <Schema extends v.GenericSchema>(
  schema: Schema,
  input: unknown,
): Validated<v.InferOutput<Schema>> => {
  const result = v.safeParse(schema, input);

  if (result.success) return { ok: true, value: result.output };

  const nested: Record<string, string[] | undefined> = v.flatten(result.issues).nested ?? {};
  const errors = Object.entries(nested).map(([name, messages]) => [name, messages?.[0] ?? '']);

  return { ok: false, errors: Object.fromEntries(errors) };
};

export const errorsOf = (...results: Validated<unknown>[]): FieldErrors =>
  Object.assign({}, ...results.map((result) => (result.ok ? {} : result.errors)));
