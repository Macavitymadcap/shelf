import { Hono } from 'hono';
import { requireUser } from '@shelf/auth';
import type { AppEnv } from '../env.ts';
import { ManagePage } from '../pages/manage.tsx';
import { StyleguidePage } from '../pages/styleguide.tsx';

export const manageRoutes = new Hono<AppEnv>();

manageRoutes.use(requireUser);

manageRoutes.get('/', (context) => context.html(<ManagePage user={context.var.user!} />));

manageRoutes.get('/styleguide', (context) =>
  context.html(<StyleguidePage user={context.var.user!} />),
);
