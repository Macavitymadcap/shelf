import { Hono } from 'hono';
import {
  clearSessionCookie,
  deleteSession,
  readSessionCookie,
  safeNext,
  signIn,
  writeSessionCookie,
} from '@shelf/auth';
import type { AppEnv } from '../env.ts';
import { LoginPage } from '../pages/login.tsx';
import { render } from '../render.tsx';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

const text = (value: unknown) => (typeof value === 'string' ? value : '');

export const authRoutes = new Hono<AppEnv>();

authRoutes.get('/login', (context) => {
  const next = safeNext(context.req.query('next'));

  return context.var.user
    ? context.redirect(next, 303)
    : render(context, <LoginPage next={next} />);
});

authRoutes.post('/login', async (context) => {
  const form = await context.req.parseBody();
  const username = text(form.username).trim().toLowerCase();
  const password = text(form.password);
  const ip = context.req.header('cf-connecting-ip') ?? 'unknown';
  const next = safeNext(form.next);
  const result = await signIn(
    context.var.db,
    { username, password, ip },
    context.env.PASSWORD_PEPPER,
  );

  if (result.ok) {
    writeSessionCookie(context, result.token);
    return context.redirect(next, 303);
  }

  const page = <LoginPage next={next} username={username} error={result.reason} />;
  const status = { status: (result.reason === 'locked' ? 429 : 401) as ContentfulStatusCode };

  return render(context, page, status);
});

authRoutes.post('/logout', async (context) => {
  const token = readSessionCookie(context);
  if (token) await deleteSession(context.var.db, token);
  clearSessionCookie(context);

  return context.redirect('/', 303);
});
