import type { SessionUser } from '@shelf/auth';
import type { ItemSummary } from '../components/organisms/item-card.tsx';
import { ItemList } from '../components/organisms/item-list.tsx';
import { Page } from '../components/templates/page.tsx';

type PersonPageProps = { user: SessionUser | null; name: string; works: ItemSummary[] };

export const PersonPage = ({ user, name, works }: PersonPageProps) => (
  <Page title={`${name} - Shelf`} user={user}>
    <h1>{name}</h1>
    <ItemList items={works} empty="Nothing is credited to this name any more." />
  </Page>
);
