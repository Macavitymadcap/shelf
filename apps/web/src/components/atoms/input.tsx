import type { FC, JSX } from 'hono/jsx';

export type InputProps = JSX.IntrinsicElements['input'];

export const Input: FC<InputProps> = (props) => <input class="input" {...props} />;
