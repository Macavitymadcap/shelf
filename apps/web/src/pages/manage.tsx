import type { SessionUser } from '@shelf/auth';
import { IndexCard } from '../components/organisms/index-card.tsx';
import { Page } from '../components/templates/page.tsx';

export const ManagePage = ({ user }: { user: SessionUser }) => (
  <Page title="Manage Shelf" user={user}>
    <IndexCard level={1} corner="Staff only" title="Manage">
      <p>Signed in as {user.displayName}.</p>
      <p>
        <a href="/manage/styleguide">Component sheet</a>
      </p>
    </IndexCard>
  </Page>
);
