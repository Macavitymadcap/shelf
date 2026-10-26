import { Hono } from 'hono';
import { csrf } from 'hono/csrf';
import { loadUser } from '@shelf/auth';
import { createDb } from '@shelf/db';
import type { AppEnv } from './env.ts';
import { NotFoundPage } from './pages/not-found.tsx';
import { render } from './render.tsx';
import { authRoutes } from './routes/auth.tsx';
import { catalogueRoutes } from './routes/catalogue.tsx';
import { manageRoutes } from './routes/manage.tsx';
import { securityHeaders } from './security.ts';

const app = new Hono<AppEnv>();

app.use(securityHeaders);
app.use(csrf());
app.use(async (context, next) => {
  context.set('db', createDb(context.env.DB));
  await next();
});
app.use(loadUser);

app.route('/', catalogueRoutes);
app.route('/', authRoutes);
app.route('/manage', manageRoutes);

app.notFound((context) => {
  const page = <NotFoundPage user={context.var.user ?? null} />;
  return render(context, page, { status: 404 });
});

export default app;
