import type { FC, PropsWithChildren } from 'hono/jsx';

// A row of buttons and links that wraps on a narrow screen.
export const ActionBar: FC<PropsWithChildren> = ({ children }) => (
  <div class="action-bar">{children}</div>
);
