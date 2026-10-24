import type { FC, PropsWithChildren } from 'hono/jsx';

type ButtonProps = PropsWithChildren<{
  variant?: 'primary' | 'quiet';
  type?: 'submit' | 'button';
}>;

export const Button: FC<ButtonProps> = ({ variant = 'primary', type = 'submit', children }) => (
  <button class="button" data-variant={variant} type={type}>
    {children}
  </button>
);
