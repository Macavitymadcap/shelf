import type { SessionUser } from '@shelf/auth';
import { ItemList } from '../components/organisms/item-list.tsx';
import { Page } from '../components/templates/page.tsx';

export const HomePage = ({ user }: { user: SessionUser | null }) => (
  <Page title="Shelf" user={user}>
    <h1>Shelf: A catalogue of books, games and records</h1>
    <ItemList items={[]} empty="Nothing is catalogued yet." />
  </Page>
);
