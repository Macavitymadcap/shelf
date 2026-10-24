import type { FC } from 'hono/jsx';

export type Detail = [term: string, value: string];

export const DetailList: FC<{ details: Detail[] }> = ({ details }) => (
  <dl class="detail-list">
    {details.map(([term, value]) => (
      <>
        <dt class="detail-list__term">{term}</dt>
        <dd>{value}</dd>
      </>
    ))}
  </dl>
);
