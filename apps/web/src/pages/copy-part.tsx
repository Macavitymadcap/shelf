import { ActionBar } from '../components/molecules/action-bar.tsx';
import { HxButton } from '../components/molecules/hx-button.tsx';
import { CopyRow } from '../components/organisms/copy-row.tsx';
import type { CopyView } from '../views/work.ts';

// A copy and its controls; Delete answers with the whole edition card, so the
// copy count stays right.
type CopyPartProps = { copy: CopyView; editionId: string; signedIn: boolean };

export const CopyPart = ({ copy, editionId, signedIn }: CopyPartProps) => {
  const actions = signedIn && (
    <ActionBar>
      <HxButton
        method="get"
        url={`/manage/copies/${copy.id}/edit`}
        target={`#copy-${copy.id}`}
        swap="outerHTML"
      >
        Edit copy
      </HxButton>
      <HxButton
        method="delete"
        url={`/manage/copies/${copy.id}`}
        target={`#edition-${editionId}`}
        swap="outerHTML"
        variant="danger"
        confirm="Delete this copy?"
      >
        Delete copy
      </HxButton>
    </ActionBar>
  );
  return <CopyRow copy={copy} actions={actions} />;
};
