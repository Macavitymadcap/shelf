import { and, eq, gt } from 'drizzle-orm';
import { sessions, users, type Db } from '@shelf/db';
import { hashToken, newToken } from './token.ts';

const DAY = 24 * 60 * 60 * 1000;

export const SESSION_DAYS = 30;

const expiryFrom = (now: Date) => new Date(now.getTime() + SESSION_DAYS * DAY);

export const isStale = (lastSeenAt: Date, now: Date) => now.getTime() - lastSeenAt.getTime() > DAY;

export const createSession = async (db: Db, userId: string, now = new Date()) => {
  const token = newToken();
  const id = await hashToken(token);
  await db.insert(sessions).values({ id, userId, expiresAt: expiryFrom(now), lastSeenAt: now });
  return token;
};

export const findSession = async (db: Db, token: string, now = new Date()) => {
  const [row] = await db
    .select({
      session: sessions,
      user: { id: users.id, username: users.username, displayName: users.displayName },
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, await hashToken(token)), gt(sessions.expiresAt, now)));
  return row ?? null;
};

export const touchSession = (db: Db, id: string, now = new Date()) =>
  db
    .update(sessions)
    .set({ lastSeenAt: now, expiresAt: expiryFrom(now) })
    .where(eq(sessions.id, id));

export const deleteSession = async (db: Db, token: string) =>
  db.delete(sessions).where(eq(sessions.id, await hashToken(token)));
