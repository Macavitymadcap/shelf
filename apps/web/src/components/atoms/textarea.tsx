import type { FC, JSX } from 'hono/jsx';

export type TextareaProps = JSX.IntrinsicElements['textarea'] & { value?: string };

export const Textarea: FC<TextareaProps> = ({ value = '', ...props }) => (
  <textarea class="textarea" rows={4} {...props}>
    {value}
  </textarea>
);
