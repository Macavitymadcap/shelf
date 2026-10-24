import type { Child, FC } from 'hono/jsx';
import { ItemCard, type ItemSummary } from './item-card.tsx';

type ItemListProps = { items: ItemSummary[]; empty: Child };

export const ItemList: FC<ItemListProps> = ({ items, empty }) =>
  items.length === 0 ? (
    <p class="item-list__empty">{empty}</p>
  ) : (
    <ul class="item-list">
      {items.map((item) => (
        <li>
          <ItemCard item={item} />
        </li>
      ))}
    </ul>
  );
