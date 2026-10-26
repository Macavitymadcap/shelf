import { users } from '@shelf/db';
import { createTestDb } from '@shelf/db/testing';
import { hashPassword } from '@shelf/auth';
import app from './index.tsx';

export const PEPPER = 'test-pepper';
export const PASSWORD = 'correct horse battery staple';
export const ORIGIN = 'http://localhost';

export const createTestApp = async () => {
  const test = await createTestDb();
  const env = { DB: test.d1, COVERS: {}, PASSWORD_PEPPER: PEPPER } as unknown as Env;
  const request = (path: string, init?: RequestInit) => app.request(path, init, env);
  return { ...test, request };
};

export const addUser = async (test: Awaited<ReturnType<typeof createTestApp>>) => {
  const passwordHash = await hashPassword(PASSWORD, PEPPER, 1_000);
  await test.db.insert(users).values({ username: 'dan', displayName: 'Dan', passwordHash });
};

export const loginForm = (username: string, password: string) =>
  new URLSearchParams({ username, password, next: '/manage' });

type TestApp = Awaited<ReturnType<typeof createTestApp>>;

// Adds the test user, signs in and returns headers that carry the session.
export const signedIn = async (test: TestApp) => {
  await addUser(test);
  const body = loginForm('dan', PASSWORD);
  const response = await test.request('/login', {
    method: 'POST',
    body,
    headers: { origin: ORIGIN },
  });
  const cookie = (response.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
  return { cookie, origin: ORIGIN };
};

// A request as htmx sends it: form-encoded, from this site, marked as htmx.
export const send = (
  test: TestApp,
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  headers: Record<string, string>,
  form: Record<string, string> = {},
) =>
  test.request(path, {
    method,
    body: method === 'DELETE' ? undefined : new URLSearchParams(form),
    headers: { ...headers, 'HX-Request': 'true', 'HX-Request-Type': 'partial' },
  });
