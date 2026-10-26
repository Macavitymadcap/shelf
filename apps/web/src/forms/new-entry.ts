import type { Kind } from '@shelf/catalogue';
import type { CopyInput, NewEdition, NewWork } from '@shelf/db';
import { parseCopy } from './copy.ts';
import { parseEdition } from './edition.ts';
import type { FormValues } from './form-data.ts';
import { errorsOf, type Validated } from './validate.ts';
import { parseWork } from './work.ts';

// Typed in by hand; milestone 3 records the provider instead.
const MANUAL = { source: 'manual', sourceRef: null };

export const parseNewEdition = (
  values: FormValues,
  kind: Kind,
): Validated<{ edition: NewEdition; copy: CopyInput }> => {
  const edition = parseEdition(values, kind);
  const copy = parseCopy(values, kind);

  if (edition.ok && copy.ok)
    return { ok: true, value: { edition: { ...edition.value, ...MANUAL }, copy: copy.value } };

  return { ok: false, errors: errorsOf(edition, copy) };
};

export const parseNewWork = (values: FormValues, kind: Kind): Validated<NewWork> => {
  const work = parseWork(values, kind);
  const rest = parseNewEdition(values, kind);

  if (work.ok && rest.ok) return { ok: true, value: { kind, work: work.value, ...rest.value } };

  return { ok: false, errors: errorsOf(work, rest) };
};
