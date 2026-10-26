import type { SessionUser } from '@shelf/auth';
import type { Kind } from '@shelf/catalogue';
import { LinkButton } from '../components/atoms/button.tsx';
import { EntryForm } from '../components/organisms/entry-form.tsx';
import { IndexCard } from '../components/organisms/index-card.tsx';
import { Page } from '../components/templates/page.tsx';
import { KIND_LABELS } from '../views/labels.ts';
import { copySection, editionSection, workSection, type FormState } from './sections.tsx';

// The form alone is what a 422 answer sends back; it replaces itself.
export const NewWorkForm = ({ kind, state }: { kind: Kind; state: FormState }) => (
  <EntryForm
    request={{
      method: 'post',
      url: `/manage/works?kind=${kind}`,
      target: 'this',
      swap: 'outerHTML',
    }}
    sections={[workSection(kind, state), editionSection(kind, state), copySection(kind, state)]}
    submit="Save"
    cancel={<LinkButton href="/manage">Cancel</LinkButton>}
    invalid={Object.keys(state.errors).length > 0}
  />
);

export const NewWorkPage = ({
  user,
  kind,
  state,
}: {
  user: SessionUser;
  kind: Kind;
  state: FormState;
}) => (
  <Page title="Add to Shelf" user={user}>
    <IndexCard level={1} corner="Staff only" title={`Add a ${KIND_LABELS[kind].toLowerCase()}`}>
      <NewWorkForm kind={kind} state={state} />
    </IndexCard>
  </Page>
);
