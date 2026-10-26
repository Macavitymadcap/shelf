import { Hono } from 'hono';
import { requireUser } from '@shelf/auth';
import type { AppEnv } from '../env.ts';
import { ManagePage } from '../pages/manage.tsx';
import { StyleguidePage } from '../pages/styleguide.tsx';
import { render } from '../render.tsx';

export const manageRoutes = new Hono<AppEnv>();

manageRoutes.use(requireUser);

manageRoutes.get('/', (context) => render(context, <ManagePage user={context.var.user!} />));

manageRoutes.get('/styleguide', (context) =>
  render(context, <StyleguidePage user={context.var.user!} />),
);
