import type { Child, FC } from 'hono/jsx';
import { useHx } from '../../nonce.ts';
import { Button } from '../atoms/button.tsx';
import { Notice } from '../atoms/notice.tsx';
import type { Swap } from '../molecules/hx-button.tsx';

export type Section = { legend: string; content: Child };

export type Request = Swap & { method: 'post' | 'put'; url: string };

type EntryFormProps = {
  request: Request;
  sections: Section[];
  submit: string;
  cancel: Child;
  invalid?: boolean;
};

const MORPH = { outerHTML: 'outerMorph', innerHTML: 'innerMorph', delete: 'delete' };

// A 422 answer is morphed into place, so focus and typed input survive. The
// attributes are spread because JSX names cannot contain ":422".
const attributes = ({ method, url, target, swap }: Request) => ({
  [`hx-${method}`]: url,
  'hx-target': target,
  'hx-swap': swap,
  'hx-status:422': `swap:${MORPH[swap]}`,
});

export const EntryForm: FC<EntryFormProps> = ({ request, sections, submit, cancel, invalid }) => (
  <form class="entry-form" {...attributes(request)} {...useHx()}>
    {invalid && <Notice tone="error">Some fields need another look.</Notice>}
    {sections.map((section) => (
      <fieldset class="entry-form__section">
        <legend class="entry-form__legend">{section.legend}</legend>
        {section.content}
      </fieldset>
    ))}
    <p class="entry-form__actions">
      <Button>{submit}</Button>
      {cancel}
    </p>
  </form>
);
