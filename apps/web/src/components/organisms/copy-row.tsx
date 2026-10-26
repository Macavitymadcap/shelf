import type { Child, FC } from 'hono/jsx';
import type { CopyView } from '../../views/work.ts';
import { DetailList } from '../molecules/detail-list.tsx';

// One copy, or its edit form; either way it answers to #copy-<id>.
export const CopyRow: FC<{ copy: CopyView; actions?: Child; form?: Child }> = ({
  copy,
  actions,
  form,
}) => (
  <li class="copy-row" id={`copy-${copy.id}`}>
    {form ?? (
      <>
        <DetailList details={copy.details} />
        {actions}
      </>
    )}
  </li>
);
