import { and, count, gt, inArray, lt } from 'drizzle-orm';
import { loginAttempts, type Db } from '@shelf/db';

const WINDOW = 15 * 60 * 1000;

export const MAX_FAILURES = 5;

const windowStart = (now: Date) => new Date(now.getTime() - WINDOW);

export const throttleKeys = (username: string, ip: string) => [`user:${username}`, `ip:${ip}`];

export const pruneAttempts = (db: Db, now: Date) =>
  db.delete(loginAttempts).where(lt(loginAttempts.attemptedAt, windowStart(now)));

export const isLocked = async (db: Db, keys: string[], now: Date) => {
  const rows = await db
    .select({ key: loginAttempts.key, failures: count() })
    .from(loginAttempts)
    .where(and(inArray(loginAttempts.key, keys), gt(loginAttempts.attemptedAt, windowStart(now))))
    .groupBy(loginAttempts.key);

  return rows.some((row) => row.failures >= MAX_FAILURES);
};

export const recordFailure = (db: Db, keys: string[], now: Date) =>
  db.insert(loginAttempts).values(keys.map((key) => ({ key, attemptedAt: now })));
