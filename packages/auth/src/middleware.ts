import { createMiddleware } from 'hono/factory';
import type { Db } from '@shelf/db';
import { readSessionCookie, writeSessionCookie } from './cookie.ts';
import { findSession, isStale, touchSession } from './sessions.ts';

export type SessionUser = { id: string; username: string; displayName: string };

export type AuthVariables = { db: Db; user: SessionUser | null };

export const loadUser = createMiddleware<{ Variables: AuthVariables }>(async (context, next) => {
  const token = readSessionCookie(context);
  const found = token ? await findSession(context.var.db, token) : null;

  context.set('user', found?.user ?? null);
  if (token && found && isStale(found.session.lastSeenAt, new Date())) {
    await touchSession(context.var.db, found.session.id);
    writeSessionCookie(context, token);
  }

  await next();
});

export const requireUser = createMiddleware<{ Variables: AuthVariables }>(async (context, next) => {
  if (context.var.user) return next();

  const { pathname, search } = new URL(context.req.url);
  const target = `/login?next=${encodeURIComponent(pathname + search)}`;

  if (!context.req.header('HX-Request')) return context.redirect(target, 303);

  context.header('HX-Redirect', target);

  return context.body(null, 401);
});

export const safeNext = (value: unknown, fallback = '/manage') =>
  typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : fallback;
