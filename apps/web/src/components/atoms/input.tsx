import type { FC, JSX } from 'hono/jsx';
import { joinClassNames } from '../join-class-names';
export type InputProps = JSX.IntrinsicElements['input'];

export const Input: FC<InputProps> = ({ class: className, ...props }) => (
  <input class={joinClassNames('input', className as string | undefined)} {...props} />
);
