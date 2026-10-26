import { ROLES, type Kind } from '@shelf/catalogue';
import type { FC } from 'hono/jsx';
import { useHx } from '../../nonce.ts';
import { sentence } from '../../views/labels.ts';
import { Button } from '../atoms/button.tsx';
import { Field, SelectField } from '../molecules/field.tsx';

export type Credit = { name: string; role: string };

type CreditRowProps = { kind: Kind; credit: Credit };

// One person and their role; ids are random so rows added later never clash.
export const CreditRow: FC<CreditRowProps> = ({ kind, credit }) => {
  const id = `credit-${crypto.randomUUID().slice(0, 8)}`;
  const roles = ROLES[kind].map((role) => ({ value: role, label: sentence(role) }));

  return (
    <li class="credit-rows__row">
      <Field label="Person" name="creditName" id={`${id}-name`} value={credit.name} />
      <SelectField
        label="Role"
        name="creditRole"
        id={`${id}-role`}
        options={roles}
        value={credit.role}
      />
    </li>
  );
};

type CreditRowsProps = { kind: Kind; credits: Credit[]; error?: string };

const BLANK: Credit = { name: '', role: '' };

// Saved credits plus two blank rows; "Add a person" fetches another row.
export const CreditRows: FC<CreditRowsProps> = ({ kind, credits, error }) => (
  <div class="credit-rows">
    {error && <p class="credit-rows__error">{error}</p>}
    <ol class="credit-rows__list" id="credit-rows">
      {[...credits, BLANK, BLANK].map((credit) => (
        <CreditRow kind={kind} credit={credit} />
      ))}
    </ol>
    <Button
      variant="quiet"
      type="button"
      hx-get={`/manage/credit-row?kind=${kind}`}
      hx-target="#credit-rows"
      hx-swap="beforeend"
      {...useHx()}
    >
      Add a person
    </Button>
  </div>
);
