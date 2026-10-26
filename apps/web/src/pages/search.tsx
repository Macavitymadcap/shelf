import type { SessionUser } from '@shelf/auth';
import type { Kind } from '@shelf/catalogue';
import { Notice } from '../components/atoms/notice.tsx';
import type { ItemSummary } from '../components/organisms/item-card.tsx';
import { ItemList } from '../components/organisms/item-list.tsx';
import { SearchForm } from '../components/organisms/search-form.tsx';
import { Page } from '../components/templates/page.tsx';

type SearchProps = { text: string; kind?: Kind; results: ItemSummary[] };

const summary = ({ text, kind, results }: SearchProps) => {
  if (!text && !kind) return 'Type a title, a name or a tag.';
  return results.length === 1 ? 'One match.' : `${results.length} matches.`;
};

// The part htmx swaps as you type; the notice is announced to screen readers.
export const SearchResults = (props: SearchProps) => (
  <>
    <Notice>{summary(props)}</Notice>
    {props.results.length > 0 && <ItemList items={props.results} empty="" />}
  </>
);

export const SearchPage = (props: SearchProps & { user: SessionUser | null }) => (
  <Page title={props.text ? `${props.text} - Shelf search` : 'Search - Shelf'} user={props.user}>
    <h1>Search</h1>
    <SearchForm text={props.text} kind={props.kind} live />
    <div id="search-results">
      <SearchResults {...props} />
    </div>
  </Page>
);
