import { users } from '@shelf/db';
import { createTestDb } from '@shelf/db';
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
