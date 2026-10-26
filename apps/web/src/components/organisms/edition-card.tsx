import type { Child, FC } from 'hono/jsx';
import type { CopyView, EditionView } from '../../views/work.ts';
import { DetailList } from '../molecules/detail-list.tsx';
import { TrackList } from '../molecules/track-list.tsx';
import { IndexCard } from './index-card.tsx';

type EditionCardProps = {
  edition: EditionView;
  actions?: Child;
  // One copy row each; the page decides whether a row shows its controls or a form.
  copyRow: (copy: CopyView) => Child;
  // A form for another copy, shown under the list while it is being added.
  adding?: Child;
};

const heading = (count: number) => (count === 1 ? 'One copy' : `${count} copies`);

export const EditionCard: FC<EditionCardProps> = ({ edition, actions, copyRow, adding }) => (
  <IndexCard id={`edition-${edition.id}`} corner="Edition" title={edition.title}>
    {edition.details.length > 0 && <DetailList details={edition.details} />}
    {edition.tracks.length > 0 && <TrackList tracks={edition.tracks} />}
    <h3 class="edition-card__heading">{heading(edition.copies.length)}</h3>
    <ol class="edition-card__copies">{edition.copies.map(copyRow)}</ol>
    {adding}
    {actions}
  </IndexCard>
);
