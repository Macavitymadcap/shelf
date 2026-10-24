import type { FC, PropsWithChildren } from 'hono/jsx';

type NoticeProps = PropsWithChildren<{ tone?: 'info' | 'error' }>;

export const Notice: FC<NoticeProps> = ({ tone = 'info', children }) => (
  <p class="notice" data-tone={tone} role={tone === 'error' ? 'alert' : 'status'}>
    {children}
  </p>
);
