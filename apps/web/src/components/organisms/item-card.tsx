import type { FC } from 'hono/jsx';
import { DetailList, type Detail } from '../molecules/detail-list.tsx';
import { IndexCard } from './index-card.tsx';

export type ItemSummary = {
  href: string;
  kind: 'Book' | 'Record' | 'Game';
  title: string;
  creator?: string;
  details: Detail[];
};

export const ItemCard: FC<{ item: ItemSummary }> = ({ item }) => (
  <IndexCard
    class="item-card"
    corner={item.kind}
    byline={item.creator}
    title={
      <a class="item-card__link" href={item.href}>
        {item.title}
      </a>
    }
  >
    <DetailList details={item.details} />
  </IndexCard>
);
