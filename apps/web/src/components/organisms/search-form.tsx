import { KINDS, type Kind } from '@shelf/catalogue';
import type { FC } from 'hono/jsx';
import { useHx } from '../../nonce.ts';
import { KIND_PLURALS } from '../../views/labels.ts';
import { Button } from '../atoms/button.tsx';
import { Input } from '../atoms/input.tsx';
import { Select } from '../atoms/select.tsx';

type SearchFormProps = { text?: string; kind?: Kind; live?: boolean };

const KIND_OPTIONS = KINDS.map((kind) => ({ value: kind, label: KIND_PLURALS[kind] }));

// Live search swaps only the results as you type and keeps the address bar in step.
const useLive = () => ({
  'hx-get': '/search',
  'hx-trigger': 'input delay:300ms, submit',
  'hx-target': '#search-results',
  'hx-push-url': 'true',
  ...useHx(),
});

export const SearchForm: FC<SearchFormProps> = ({ text = '', kind = '', live = false }) => (
  <form
    class="search-form"
    role="search"
    method="get"
    action="/search"
    {...(live ? useLive() : {})}
  >
    <label class="visually-hidden" for="search-text">
      Search the catalogue
    </label>
    <Input
      class="search-form__text"
      id="search-text"
      type="search"
      name="q"
      value={text}
      placeholder="Title, person or tag"
    />
    <label class="visually-hidden" for="search-kind">
      Kind
    </label>
    <Select id="search-kind" name="kind" options={KIND_OPTIONS} value={kind} blank="Everything" />
    <Button>Search</Button>
  </form>
);
