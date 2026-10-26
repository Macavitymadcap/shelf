import type { Child } from 'hono/jsx';
import { ActionBar } from '../components/molecules/action-bar.tsx';
import { HxButton } from '../components/molecules/hx-button.tsx';
import { WorkCard } from '../components/organisms/work-card.tsx';
import type { WorkView } from '../views/work.ts';
import { EditionPart } from './edition-part.tsx';

// The pieces of a work page that htmx swaps. Each answers to a fixed id:
// #work, #editions, #edition-<id> and #copy-<id>.

const WorkActions = ({ work }: { work: WorkView }) => (
  <ActionBar>
    <HxButton method="get" url={`/manage/works/${work.id}/edit`} target="#work" swap="outerHTML">
      Edit work
    </HxButton>
    <HxButton
      method="get"
      url={`/manage/works/${work.id}/editions/new`}
      target="#editions"
      swap="innerHTML"
    >
      Add an edition
    </HxButton>
    <HxButton
      method="delete"
      url={`/manage/works/${work.id}`}
      target="#work"
      swap="outerHTML"
      variant="danger"
      confirm={`Delete ${work.title}, every edition and every copy?`}
    >
      Delete work
    </HxButton>
  </ActionBar>
);

export const WorkPart = ({ work, signedIn }: { work: WorkView; signedIn: boolean }) => (
  <WorkCard work={work}>{signedIn && <WorkActions work={work} />}</WorkCard>
);

type EditionsPartProps = { work: WorkView; signedIn: boolean; adding?: Child };

// The contents of #editions: every edition, then a new-edition form while one is being added.
export const EditionsPart = ({ work, signedIn, adding }: EditionsPartProps) => (
  <>
    {work.editions.map((edition) => (
      <EditionPart edition={edition} signedIn={signedIn} />
    ))}
    {adding}
  </>
);
