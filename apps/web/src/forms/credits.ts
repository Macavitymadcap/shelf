import { ROLES, type Kind } from '@shelf/catalogue';
import type { CreditInput } from '@shelf/db';
import { many, type FormValues } from './form-data.ts';
import type { Validated } from './validate.ts';

// Credit rows arrive as two repeated fields, creditName and creditRole, in row order.
export const parseCredits = (values: FormValues, kind: Kind): Validated<CreditInput[]> => {
  const roles: readonly string[] = ROLES[kind];
  const names = many(values, 'creditName');
  const chosen = many(values, 'creditRole');
  const credits = names
    .map((name, row) => ({ name: name.trim(), role: chosen[row] ?? '' }))
    .filter((credit) => credit.name !== '');

  if (credits.some((credit) => !roles.includes(credit.role))) {
    return { ok: false, errors: { credits: 'Choose a role for each person.' } };
  }

  return { ok: true, value: credits };
};
