import type { EditionDetail, WorkDetail } from '@shelf/db';
import { IndexCard } from '../components/organisms/index-card.tsx';
import { InPlaceForm } from './in-place-form.tsx';
import { copySection, editionSection, workSection, type FormState } from './sections.tsx';

export const WorkEditPart = ({ work, state }: { work: WorkDetail; state: FormState }) => (
  <IndexCard id="work" level={1} corner="Editing" title={`Edit ${work.title}`}>
    <InPlaceForm
      request={{
        method: 'put',
        url: `/manage/works/${work.id}`,
        target: '#work',
        swap: 'outerHTML',
      }}
      sections={[workSection(work.kind, state)]}
      state={state}
      cancel={`/manage/works/${work.id}`}
    />
  </IndexCard>
);

export const EditionEditPart = ({
  edition,
  state,
}: {
  edition: EditionDetail;
  state: FormState;
}) => (
  <IndexCard id={`edition-${edition.id}`} corner="Editing" title="Edit edition">
    <InPlaceForm
      request={{
        method: 'put',
        url: `/manage/editions/${edition.id}`,
        target: `#edition-${edition.id}`,
        swap: 'outerHTML',
      }}
      sections={[editionSection(edition.kind, state)]}
      state={state}
      cancel={`/manage/editions/${edition.id}`}
    />
  </IndexCard>
);

export const NewEditionForm = ({ work, state }: { work: WorkDetail; state: FormState }) => (
  <IndexCard corner="Adding" title="Another edition">
    <InPlaceForm
      request={{
        method: 'post',
        url: `/manage/works/${work.id}/editions`,
        target: '#editions',
        swap: 'innerHTML',
      }}
      sections={[editionSection(work.kind, state), copySection(work.kind, state)]}
      state={state}
      cancel={`/manage/works/${work.id}/editions`}
    />
  </IndexCard>
);
