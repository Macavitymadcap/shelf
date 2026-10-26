import type { SessionUser } from '@shelf/auth';
import { EditionList } from '../components/organisms/edition-list.tsx';
import { Page } from '../components/templates/page.tsx';
import type { WorkView } from '../views/work.ts';
import { EditionsPart, WorkPart } from './work-parts.tsx';

// Editing controls appear only for a signed-in user, and edit in place.
export const WorkPage = ({ user, work }: { user: SessionUser | null; work: WorkView }) => (
  <Page title={`${work.title} - Shelf`} user={user}>
    <WorkPart work={work} signedIn={user !== null} />
    <EditionList>
      <EditionsPart work={work} signedIn={user !== null} />
    </EditionList>
  </Page>
);
