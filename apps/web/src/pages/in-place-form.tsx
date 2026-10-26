import { HxButton } from '../components/molecules/hx-button.tsx';
import { EntryForm, type Request, type Section } from '../components/organisms/entry-form.tsx';
import type { FormState } from './sections.tsx';

type FormProps = { request: Request; sections: Section[]; state: FormState; cancel: string };

// Every in-place form: Cancel fetches the resource back into the same place.
export const InPlaceForm = ({ request, sections, state, cancel }: FormProps) => (
  <EntryForm
    request={request}
    sections={sections}
    submit="Save"
    invalid={Object.keys(state.errors).length > 0}
    cancel={
      <HxButton method="get" url={cancel} target={request.target} swap={request.swap}>
        Cancel
      </HxButton>
    }
  />
);
