import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { countByKind, createWork, getWork, listRecent, people, updateWork } from '../src/index.ts';
import { createTestDb, spiritOfEden, watchmen } from '../src/testing.ts';

type TestDB = Awaited<ReturnType<typeof createTestDb>>;

describe('saving a work', () => {
  let test: TestDB;

  beforeEach(async () => {
    test = await createTestDb();
  });

  afterEach(async () => {
    await test.dispose();
  });

  it('saves the work, its credits, tags, edition, details and copy together', async () => {
    // Arrange
    const input = spiritOfEden();

    // Act
    const work = await getWork(test.db, await createWork(test.db, input));

    // Assert
    expect(work?.credits.map((credit) => credit.name)).toEqual(['Talk Talk']);
    expect(work?.tags).toEqual(['art rock']);
    expect(work?.editions[0]?.record?.format).toBe('LP');
    expect(work?.editions[0]?.tracks[0]?.title).toBe('The Rainbow');
    expect(work?.editions[0]?.copies[0]?.record?.mediaGrade).toBe('VG+');
  });

  it('reuses a person whose name differs only in case', async () => {
    // Arrange
    await createWork(test.db, watchmen());
    const vendetta = watchmen();
    vendetta.work = {
      ...vendetta.work,
      title: 'V for Vendetta',
      credits: [{ name: 'alan moore', role: 'writer' }],
    };

    // Act
    await createWork(test.db, vendetta);

    // Assert
    expect(await test.db.select().from(people)).toHaveLength(2);
  });

  it('replaces credits and tags on update', async () => {
    // Arrange
    const id = await createWork(test.db, watchmen());
    const work = {
      ...watchmen().work,
      credits: [{ name: 'Alan Moore', role: 'writer' }],
      tags: [],
    };

    // Act
    await updateWork(test.db, id, work);

    // Assert
    const saved = await getWork(test.db, id);
    expect(saved?.credits).toHaveLength(1);
    expect(saved?.tags).toEqual([]);
  });

  it('lists recent works with their first creator and copy count', async () => {
    // Arrange
    await createWork(test.db, watchmen());

    // Act
    const [summary] = await listRecent(test.db);

    // Assert
    expect(summary).toMatchObject({
      title: 'Watchmen',
      creator: 'Alan Moore',
      publisher: 'DC Comics',
      year: 1986,
      copies: 1,
    });
  });

  it('counts works by kind', async () => {
    // Arrange
    await createWork(test.db, watchmen());
    await createWork(test.db, spiritOfEden());

    // Act
    const counts = await countByKind(test.db);

    // Assert
    expect(counts).toEqual({ book: 1, record: 1, board_game: 0 });
  });
});
