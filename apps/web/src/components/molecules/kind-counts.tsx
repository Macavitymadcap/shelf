import { KINDS, type Kind } from '@shelf/catalogue';
import type { FC } from 'hono/jsx';
import { KIND_PLURALS } from '../../views/labels.ts';

// "12 Books", "4 Records", "2 Games", each a link to browse that kind.
export const KindCounts: FC<{ counts: Record<Kind, number> }> = ({ counts }) => (
  <ul class="kind-counts">
    {KINDS.map((kind) => (
      <li>
        <a class="kind-counts__link" href={`/search?kind=${kind}`}>
          <span class="kind-counts__total">{counts[kind]}</span> {KIND_PLURALS[kind]}
        </a>
      </li>
    ))}
  </ul>
);
