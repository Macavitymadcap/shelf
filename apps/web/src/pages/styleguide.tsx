import type { SessionUser } from '@shelf/auth';
import { Button } from '../components/atoms/button.tsx';
import { Notice } from '../components/atoms/notice.tsx';
import { Field } from '../components/molecules/field.tsx';
import { ItemList } from '../components/organisms/item-list.tsx';
import type { ItemSummary } from '../components/organisms/item-card.tsx';
import { IndexCard } from '../components/organisms/index-card.tsx';
import { Page } from '../components/templates/page.tsx';

const SAMPLES: ItemSummary[] = [
  {
    href: '#',
    kind: 'Book',
    creator: 'Le Guin, Ursula K.',
    title: 'The Dispossessed: an ambiguous utopia',
    details: [
      ['Published', 'Gollancz, 1974'],
      ['Genre', 'Science fiction'],
      ['Copies', '2'],
    ],
  },
  {
    href: '#',
    kind: 'Record',
    creator: 'Talk Talk',
    title: 'Spirit of Eden',
    details: [
      ['Released', 'Parlophone, 1988'],
      ['Format', 'LP'],
      ['Loan', 'With Sam'],
    ],
  },
  {
    href: '#',
    kind: 'Game',
    creator: 'Rosenberg, Uwe',
    title: 'Agricola',
    details: [
      ['Published', 'Lookout, 2007'],
      ['Players', '1 to 4'],
    ],
  },
];

export const StyleguidePage = ({ user }: { user: SessionUser }) => (
  <Page title="Component sheet" user={user}>
    <h1>Component sheet</h1>
    <IndexCard corner="Atoms" title="Buttons and notices">
      <Notice>Saved.</Notice>
      <Notice tone="error">Incorrect username or password.</Notice>
      <Field label="Title" name="title" value="Spirit of Eden" />
      <p>
        <Button>Save item</Button> <Button variant="quiet">Cancel</Button>
      </p>
    </IndexCard>
    <ItemList items={SAMPLES} empty="Nothing is catalogued yet." />
    <ItemList items={[]} empty="Nothing is catalogued yet." />
  </Page>
);
