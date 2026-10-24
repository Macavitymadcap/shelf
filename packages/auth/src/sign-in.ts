import { eq } from 'drizzle-orm';
import { users, type Db } from '@shelf/db';
import { DUMMY_HASH, verifyPassword } from './password.ts';
import { isLocked, pruneAttempts, recordFailure, throttleKeys } from './throttle.ts';
import { createSession } from './sessions.ts';

export type Credentials = { username: string; password: string; ip: string };

export type SignInResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'invalid' | 'locked' };

const findUser = async (db: Db, username: string) => {
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return user;
};

export const signIn = async (
  db: Db,
  { username, password, ip }: Credentials,
  pepper: string,
  now = new Date(),
): Promise<SignInResult> => {
  const keys = throttleKeys(username, ip);
  await pruneAttempts(db, now);
  if (await isLocked(db, keys, now)) return { ok: false, reason: 'locked' };
  const user = await findUser(db, username);
  const valid = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password, pepper);
  if (!user || !valid) {
    await recordFailure(db, keys, now);
    return { ok: false, reason: 'invalid' };
  }
  return { ok: true, token: await createSession(db, user.id, now) };
};
