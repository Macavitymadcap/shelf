import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { users } from '@shelf/db';
import { createTestDb } from '@shelf/db';
import { hashPassword } from '../src/password.ts';
import { signIn } from '../src/sign-in.ts';
import { MAX_FAILURES } from '../src/throttle.ts';
import { findSession } from '../src/session.ts';

const PEPPER = 'test-pepper';
const PASSWORD = 'correct horse battery staple';

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

describe('signIn', () => {
  let test: TestDb;

  beforeEach(async () => {
    test = await createTestDb();
    const passwordHash = await hashPassword(PASSWORD, PEPPER, 1_000);
    await test.db.insert(users).values({ username: 'dan', displayName: 'Dan', passwordHash });
  });

  afterEach(async () => {
    await test.dispose();
  });

  it('returns a token for a session that finds the user', async () => {
    // Arrange
    const credentials = { username: 'dan', password: PASSWORD, ip: '127.0.0.1' };

    // Act
    const result = await signIn(test.db, credentials, PEPPER);

    // Assert
    expect(result.ok).toBe(true);
    const found = result.ok ? await findSession(test.db, result.token) : null;
    expect(found?.user.username).toBe('dan');
  });

  it('rejects an unknown username the same way as a wrong password', async () => {
    // Arrange
    const credentials = { username: 'nobody', password: PASSWORD, ip: '127.0.0.1' };

    // Act
    const result = await signIn(test.db, credentials, PEPPER);

    // Assert
    expect(result).toEqual({ ok: false, reason: 'invalid' });
  });

  it('locks the username after repeated failures', async () => {
    // Arrange
    const wrong = { username: 'dan', password: 'wrong', ip: '127.0.0.1' };
    for (let i = 0; i < MAX_FAILURES; i++) await signIn(test.db, wrong, PEPPER);

    // Act
    const result = await signIn(test.db, { ...wrong, password: PASSWORD }, PEPPER);

    // Assert
    expect(result).toEqual({ ok: false, reason: 'locked' });
  });

  it('unlocks once the failures are older than the window', async () => {
    // Arrange
    const wrong = { username: 'dan', password: 'wrong', ip: '127.0.0.1' };
    const earlier = new Date(Date.now() - 16 * 60 * 1000);
    for (let i = 0; i < MAX_FAILURES; i++) await signIn(test.db, wrong, PEPPER, earlier);

    // Act
    const result = await signIn(test.db, { ...wrong, password: PASSWORD }, PEPPER);

    // Assert
    expect(result.ok).toBe(true);
  });
});
