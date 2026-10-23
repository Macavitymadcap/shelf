import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { SESSION_DAYS } from './sessions.ts';

const NAME = 'session';

const options = {
  prefix: 'host',
  path: '/',
  secure: true,
  httpOnly: true,
  sameSite: 'Lax',
  maxAge: SESSION_DAYS * 24 * 60 * 60,
} as const;

export const readSessionCookie = (context: Context) => getCookie(context, NAME, 'host');

export const writeSessionCookie = (context: Context, token: string) =>
  setCookie(context, NAME, token, options);

export const clearSessionCookie = (context: Context) => deleteCookie(context, NAME, options);
