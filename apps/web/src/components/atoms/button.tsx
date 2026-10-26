import type { FC, JSX, PropsWithChildren } from 'hono/jsx';

type Variant = 'primary' | 'quiet' | 'danger';

type ButtonProps = JSX.IntrinsicElements['button'] & { variant?: Variant };

// Extra attributes, such as hx-get, pass straight through to the <button>.
export const Button: FC<ButtonProps> = ({
  variant = 'primary',
  type = 'submit',
  children,
  ...attributes
}) => (
  <button class="button" data-variant={variant} type={type} {...attributes}>
    {children}
  </button>
);

// A link that looks like a button, for actions that only open a page.
export const LinkButton: FC<PropsWithChildren<{ href: string; variant?: Variant }>> = ({
  href,
  variant = 'quiet',
  children,
}) => (
  <a class="button" data-variant={variant} href={href}>
    {children}
  </a>
);
