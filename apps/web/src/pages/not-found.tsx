import type { SessionUser } from '@shelf/auth';
import { IndexCard } from '../components/organisms/index-card.tsx';
import { Page } from '../components/templates/page.tsx';

export const NotFoundPage = ({ user }: { user: SessionUser | null }) => (
  <Page title="Not found - Shelf" user={user}>
    <IndexCard level={1} corner="404" title="Not on the shelf">
      <p>
        Nothing is catalogued at this address. <a href="/">Back to the catalogue</a>.
      </p>
    </IndexCard>
  </Page>
);
