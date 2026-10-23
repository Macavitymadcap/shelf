import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { users } from '@shelf/db';
import { createTestDb } from '@shelf/db';
import { createSession, SESSION_DAYS, findSession, deleteSession } from '../src/sessions.ts';

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

const DAY = 24 * 60 * 60 * 1000;

describe('sessions', () => {
  let test: TestDb;
  let userId: string;

  beforeEach(async () => {
    test = await createTestDb();
    const [user] = await test.db
      .insert(users)
      .values({ username: 'dan', displayName: 'Dan' })
      .returning();
    userId = user!.id;
  });

  afterEach(async () => {
    await test.dispose();
  });

  it('does not find an expired session', async () => {
    // Arrange
    const token = await createSession(
      test.db,
      userId,
      new Date(Date.now() - (SESSION_DAYS + 1) * DAY),
    );

    // Act
    const found = await findSession(test.db, token);

    // Assert
    expect(found).toBeNull();
  });

  it('does not find a deleted session', async () => {
    // Arrange
    const token = await createSession(test.db, userId);
    await deleteSession(test.db, token);

    // Act
    const found = await findSession(test.db, token);

    // Assert
    expect(found).toBeNull();
  });
});
