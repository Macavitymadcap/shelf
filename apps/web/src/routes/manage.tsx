import { Hono } from 'hono';
import { requireUser } from '@shelf/auth';
import type { AppEnv } from '../env.ts';
import { ManagePage } from '../pages/manage.tsx';

export const manageRoutes = new Hono<AppEnv>();

manageRoutes.use(requireUser);

manageRoutes.get('/', (context) => context.html(<ManagePage user={context.var.user!} />));
