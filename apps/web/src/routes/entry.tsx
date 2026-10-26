import type { Context } from 'hono';
import type { AppEnv } from '../env.ts';
import type { FieldErrors, FormValues } from '../forms/form-data.ts';
import type { FormState } from '../pages/sections.tsx';

export const fresh = (values: FormValues): FormState => ({ values, errors: {} });

// A form with mistakes answers 422, which the form morphs into place.
export const statusOf = (errors: FieldErrors) => (Object.keys(errors).length > 0 ? 422 : 200);

// After a create or a delete, htmx fetches this path and pushes it to the address bar.
export const relocate = (context: Context<AppEnv>, path: string) => {
  context.header('HX-Location', path);
  return context.body(null, 200);
};
