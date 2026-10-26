import type { CopyDetail, EditionDetail } from '@shelf/db';
import { CopyRow } from '../components/organisms/copy-row.tsx';
import type { Request } from '../components/organisms/entry-form.tsx';
import { toCopyView } from '../views/work.ts';
import { InPlaceForm } from './in-place-form.tsx';
import { copySection, type FormState } from './sections.tsx';

export const NewCopyForm = ({ edition, state }: { edition: EditionDetail; state: FormState }) => (
  <InPlaceForm
    request={{
      method: 'post',
      url: `/manage/editions/${edition.id}/copies`,
      target: `#edition-${edition.id}`,
      swap: 'outerHTML',
    }}
    sections={[copySection(edition.kind, state)]}
    state={state}
    cancel={`/manage/editions/${edition.id}`}
  />
);

export const CopyEditPart = ({ copy, state }: { copy: CopyDetail; state: FormState }) => {
  const request: Request = {
    method: 'put',
    url: `/manage/copies/${copy.id}`,
    target: `#copy-${copy.id}`,
    swap: 'outerHTML',
  };
  const form = (
    <InPlaceForm
      request={request}
      sections={[copySection(copy.kind, state)]}
      state={state}
      cancel={`/manage/copies/${copy.id}`}
    />
  );
  return <CopyRow copy={toCopyView(copy)} form={form} />;
};
