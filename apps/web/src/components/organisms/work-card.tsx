import type { FC, PropsWithChildren } from 'hono/jsx';
import type { WorkView } from '../../views/work.ts';
import { DetailList } from '../molecules/detail-list.tsx';
import { IndexCard } from './index-card.tsx';

type WorkCardProps = PropsWithChildren<{ work: WorkView }>;

// The work's own card; children are the signed-in actions, if any.
export const WorkCard: FC<WorkCardProps> = ({ work, children }) => (
  <IndexCard
    id="work"
    level={1}
    corner={work.kind}
    byline={work.subtitle ?? undefined}
    title={work.title}
  >
    {work.credits.length > 0 && (
      <ul class="work-card__credits">
        {work.credits.map((credit) => (
          <li>
            <a href={credit.href}>{credit.name}</a>, {credit.role.toLowerCase()}
          </li>
        ))}
      </ul>
    )}
    {work.details.length > 0 && <DetailList details={work.details} />}
    {work.description && <p class="work-card__description">{work.description}</p>}
    {children}
  </IndexCard>
);
