import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { createWork, deleteWork, searchWorks, toMatchQuery, updateWork } from '../src/index.ts';
import { createTestDb, spiritOfEden, watchmen } from '../src/testing.ts';

type TestDB = Awaited<ReturnType<typeof createTestDb>>;

const titles = async (test: TestDB, text: string, kind?: 'book' | 'record') =>
  (await searchWorks(test.db, { text, kind })).map((work) => work.title);

describe('search', () => {
  let test: TestDB;

  beforeEach(async () => {
    test = await createTestDb();
  });

  afterEach(async () => {
    await test.dispose();
  });

  it('finds a work by a prefix of a credited name', async () => {
    // Arrange
    await createWork(test.db, watchmen());

    // Act
    const found = await titles(test, 'gibb');

    // Assert
    expect(found).toEqual(['Watchmen']);
  });

  it('finds a work by tag and filters by kind', async () => {
    // Arrange
    await createWork(test.db, watchmen());
    await createWork(test.db, spiritOfEden());

    // Act
    const found = await titles(test, 'rock', 'book');

    // Assert
    expect(found).toEqual([]);
    expect(await titles(test, 'rock')).toEqual(['Spirit of Eden']);
  });

  it('follows a renamed title', async () => {
    // Arrange
    const id = await createWork(test.db, watchmen());

    // Act
    await updateWork(test.db, id, { ...watchmen().work, title: 'Before Watchmen' });

    // Assert
    expect(await titles(test, 'before')).toEqual(['Before Watchmen']);
  });

  it('forgets a deleted work', async () => {
    // Arrange
    const id = await createWork(test.db, watchmen());

    // Act
    await deleteWork(test.db, id);

    // Assert
    expect(await titles(test, 'watchmen')).toEqual([]);
  });

  it('turns typed text into quoted prefix terms', () => {
    // Arrange
    const input = 'le "guin" (dispossessed)';

    // Act
    const query = toMatchQuery(input);

    // Assert
    expect(query).toBe('"le"* "guin"* "dispossessed"*');
  });
});
