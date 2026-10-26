import type { SessionUser } from '@shelf/auth';
import type { Kind } from '@shelf/catalogue';
import { KindCounts } from '../components/molecules/kind-counts.tsx';
import type { ItemSummary } from '../components/organisms/item-card.tsx';
import { ItemList } from '../components/organisms/item-list.tsx';
import { SearchForm } from '../components/organisms/search-form.tsx';
import { Page } from '../components/templates/page.tsx';

type HomePageProps = {
  user: SessionUser | null;
  counts: Record<Kind, number>;
  recent: ItemSummary[];
};

export const HomePage = ({ user, counts, recent }: HomePageProps) => (
  <Page title="Shelf" user={user}>
    <h1>Shelf: A catalogue of books, games and records</h1>
    <SearchForm />
    <KindCounts counts={counts} />
    <h2>Recently added</h2>
    <ItemList items={recent} empty="Nothing is catalogued yet." />
  </Page>
);
