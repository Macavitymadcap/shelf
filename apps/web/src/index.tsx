import { Hono } from 'hono';
import { csrf } from 'hono/csrf';
import { loadUser } from '@shelf/auth';
import { createDb } from '@shelf/db';
import type { AppEnv } from './env.ts';
import { HomePage } from './pages/home.tsx';
import { authRoutes } from './routes/auth.tsx';
import { manageRoutes } from './routes/manage.tsx';
import { securityHeaders } from './security.ts';
import { render } from './render.tsx';

const app = new Hono<AppEnv>();

app.use(securityHeaders);
app.use(csrf());
app.use(async (context, next) => {
  context.set('db', createDb(context.env.DB));
  await next();
});
app.use(loadUser);

app.get('/', (context) => render(context, <HomePage user={context.var.user} />));
app.route('/', authRoutes);
app.route('/manage', manageRoutes);

export default app;
