import type { SessionUser } from '@shelf/auth';
import { KINDS } from '@shelf/catalogue';
import { LinkButton } from '../components/atoms/button.tsx';
import { ActionBar } from '../components/molecules/action-bar.tsx';
import { IndexCard } from '../components/organisms/index-card.tsx';
import { Page } from '../components/templates/page.tsx';
import { KIND_LABELS } from '../views/labels.ts';

export const AddLinks = () => (
  <ActionBar>
    {KINDS.map((kind) => (
      <LinkButton href={`/manage/add?kind=${kind}`} variant="primary">
        {`Add a ${KIND_LABELS[kind].toLowerCase()}`}
      </LinkButton>
    ))}
  </ActionBar>
);

export const ManagePage = ({ user }: { user: SessionUser }) => (
  <Page title="Manage Shelf" user={user}>
    <IndexCard level={1} corner="Staff only" title="Manage">
      <p>Signed in as {user.displayName}.</p>
      <AddLinks />
      <p>
        <a href="/manage/styleguide">Component sheet</a>
      </p>
    </IndexCard>
  </Page>
);

export const ChooseKindPage = ({ user }: { user: SessionUser }) => (
  <Page title="Add to Shelf" user={user}>
    <IndexCard level={1} corner="Staff only" title="What are you adding?">
      <AddLinks />
    </IndexCard>
  </Page>
);
