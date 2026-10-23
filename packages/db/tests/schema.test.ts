import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { eq } from 'drizzle-orm';
import { createTestDb } from '../src/testing.ts';
import { copies, editions, works } from '../src/index.ts';

type TestDB = Awaited<ReturnType<typeof createTestDb>>;

describe('catalogue schema', () => {
  let test: TestDB;

  beforeEach(async () => {
    test = await createTestDb();
  });

  afterEach(async () => {
    await test.dispose();
  });

  it('refuses to delete an edition that still has copies', async () => {
    // Arrange
    const [work] = await test.db
      .insert(works)
      .values({ kind: 'book', title: 'Watchmen', sortTitle: 'watchmen' })
      .returning();

    const [edition] = await test.db
      .insert(editions)
      .values({ workId: work!.id, source: 'manual' })
      .returning();

    await test.db.insert(copies).values({ editionId: edition!.id });

    // Act
    const attempt = test.db.delete(editions).where(eq(editions.id, edition!.id));

    // Assert
    await expect(attempt).rejects.toThrow();
  });
});
