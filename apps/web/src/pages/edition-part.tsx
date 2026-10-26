import type { Child } from 'hono/jsx';
import { ActionBar } from '../components/molecules/action-bar.tsx';
import { HxButton } from '../components/molecules/hx-button.tsx';
import { EditionCard } from '../components/organisms/edition-card.tsx';
import type { EditionView } from '../views/work.ts';
import { CopyPart } from './copy-part.tsx';

const EditionActions = ({ edition }: { edition: EditionView }) => {
  const card = `#edition-${edition.id}`;
  return (
    <ActionBar>
      <HxButton
        method="get"
        url={`/manage/editions/${edition.id}/edit`}
        target={card}
        swap="outerHTML"
      >
        Edit edition
      </HxButton>
      <HxButton
        method="get"
        url={`/manage/editions/${edition.id}/copies/new`}
        target={card}
        swap="outerHTML"
      >
        Add a copy
      </HxButton>
      <HxButton
        method="delete"
        url={`/manage/editions/${edition.id}`}
        target={card}
        swap="delete"
        variant="danger"
        confirm="Delete this edition and its copies?"
      >
        Delete edition
      </HxButton>
    </ActionBar>
  );
};

type EditionPartProps = { edition: EditionView; signedIn: boolean; adding?: Child };

export const EditionPart = ({ edition, signedIn, adding }: EditionPartProps) => (
  <EditionCard
    edition={edition}
    actions={signedIn && !adding && <EditionActions edition={edition} />}
    copyRow={(copy) => <CopyPart copy={copy} editionId={edition.id} signedIn={signedIn} />}
    adding={adding}
  />
);
