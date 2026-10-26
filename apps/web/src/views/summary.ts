import type { WorkSummary } from '@shelf/db';
import type { ItemSummary } from '../components/organisms/item-card.tsx';
import type { Detail } from '../components/molecules/detail-list.tsx';
import { KIND_LABELS } from './labels.ts';

const imprint = ({ kind, publisher, year }: WorkSummary): Detail | null => {
  const value = [publisher, year].filter((part) => part !== null).join(', ');
  return value ? [kind === 'record' ? 'Released' : 'Published', value] : null;
};

// The card shape the item list renders, from one summary row.
export const toItemSummary = (work: WorkSummary): ItemSummary => ({
  href: `/works/${work.id}`,
  kind: KIND_LABELS[work.kind],
  title: work.title,
  creator: work.creator ?? undefined,
  details: [imprint(work), ['Copies', String(work.copies)] as Detail].filter(
    (detail): detail is Detail => detail !== null,
  ),
});
