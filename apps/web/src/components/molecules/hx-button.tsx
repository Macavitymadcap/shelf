import type { FC, PropsWithChildren } from 'hono/jsx';
import { useHx } from '../../nonce.ts';
import { Button } from '../atoms/button.tsx';

export type Swap = { target: string; swap: 'outerHTML' | 'innerHTML' | 'delete' };

type HxButtonProps = PropsWithChildren<
  Swap & {
    method: 'get' | 'delete';
    url: string;
    variant?: 'quiet' | 'danger';
    confirm?: string;
  }
>;

// A button that fetches or deletes a resource and swaps the answer into the page.
export const HxButton: FC<HxButtonProps> = (props) => (
  <Button
    variant={props.variant ?? 'quiet'}
    type="button"
    {...{ [`hx-${props.method}`]: props.url }}
    hx-target={props.target}
    hx-swap={props.swap}
    hx-confirm={props.confirm}
    {...useHx()}
  >
    {props.children}
  </Button>
);
