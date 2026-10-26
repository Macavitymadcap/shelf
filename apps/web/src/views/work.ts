import type { Track } from '@shelf/catalogue';
import type { WorkDetail } from '@shelf/db';
import type { Detail } from '../components/molecules/detail-list.tsx';
import { copyDetails, editionDetails, editionTitle, workDetails } from './details.ts';
import { KIND_LABELS, sentence } from './labels.ts';

type EditionRow = WorkDetail['editions'][number];
type CopyRow = EditionRow['copies'][number];

export type CopyView = { id: string; details: Detail[] };

export type EditionView = {
  id: string;
  title: string;
  details: Detail[];
  tracks: Track[];
  copies: CopyView[];
};

export type CreditView = { href: string; name: string; role: string };

export type WorkView = {
  id: string;
  kind: string;
  title: string;
  subtitle: string | null;
  credits: CreditView[];
  details: Detail[];
  description: string | null;
  editions: EditionView[];
};

export const toCopyView = (copy: CopyRow): CopyView => ({
  id: copy.id,
  details: copyDetails(copy),
});

export const toEditionView = (edition: EditionRow): EditionView => ({
  id: edition.id,
  title: editionTitle(edition),
  details: editionDetails(edition),
  tracks: edition.tracks,
  copies: edition.copies.map(toCopyView),
});

export const toWorkView = (work: WorkDetail): WorkView => ({
  id: work.id,
  kind: KIND_LABELS[work.kind],
  title: work.title,
  subtitle: work.subtitle,
  credits: work.credits.map((credit) => ({
    href: `/people/${credit.personId}`,
    name: credit.name,
    role: sentence(credit.role),
  })),
  details: workDetails(work),
  description: work.description,
  editions: work.editions.map(toEditionView),
});
