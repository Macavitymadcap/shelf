import type { FC, PropsWithChildren } from 'hono/jsx';

// The editions of a work; htmx replaces its contents when one is added.
export const EditionList: FC<PropsWithChildren> = ({ children }) => (
  <div class="edition-list" id="editions">
    {children}
  </div>
);
