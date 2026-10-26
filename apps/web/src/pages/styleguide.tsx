import type { SessionUser } from '@shelf/auth';
import { Button, LinkButton } from '../components/atoms/button.tsx';
import { Notice } from '../components/atoms/notice.tsx';
import { ActionBar } from '../components/molecules/action-bar.tsx';
import { Field, SelectField, TextareaField } from '../components/molecules/field.tsx';
import { KindCounts } from '../components/molecules/kind-counts.tsx';
import { CreditRows } from '../components/organisms/credit-rows.tsx';
import { CopyRow } from '../components/organisms/copy-row.tsx';
import { EditionCard } from '../components/organisms/edition-card.tsx';
import { IndexCard } from '../components/organisms/index-card.tsx';
import { ItemList } from '../components/organisms/item-list.tsx';
import { SearchForm } from '../components/organisms/search-form.tsx';
import { Page } from '../components/templates/page.tsx';
import { EDITION, ITEMS } from './styleguide-samples.ts';

const GRADES = ['NM', 'VG+', 'VG'].map((grade) => ({ value: grade, label: grade }));

const Controls = () => (
  <IndexCard corner="Atoms and molecules" title="Controls">
    <Notice>Saved.</Notice>
    <Notice tone="error">Incorrect username or password.</Notice>
    <Field label="Title" name="title" value="Spirit of Eden" />
    <Field label="Year" name="year" value="19888" error="Enter 2100 or less." />
    <SelectField label="Vinyl grade" name="grade" options={GRADES} value="VG+" blank="Not graded" />
    <TextareaField label="Notes" name="notes" value="Gatefold sleeve." hint="Anything else." />
    <ActionBar>
      <Button>Save item</Button>
      <LinkButton href="#">Cancel</LinkButton>
      <Button variant="danger" type="button">
        Delete copy
      </Button>
    </ActionBar>
  </IndexCard>
);

export const StyleguidePage = ({ user }: { user: SessionUser }) => (
  <Page title="Component sheet" user={user}>
    <h1>Component sheet</h1>
    <SearchForm text="moore" />
    <KindCounts counts={{ book: 12, record: 4, board_game: 2 }} />
    <Controls />
    <IndexCard corner="Organisms" title="Credit rows">
      <CreditRows kind="book" credits={[{ name: 'Alan Moore', role: 'writer' }]} />
    </IndexCard>
    <EditionCard edition={EDITION} copyRow={(copy) => <CopyRow copy={copy} />} />
    <ItemList items={ITEMS} empty="Nothing is catalogued yet." />
    <ItemList items={[]} empty="Nothing is catalogued yet." />
  </Page>
);
