import { eq, inArray } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { tags } from '../schema/tags.ts';
import { workTags } from '../schema/work-tags.ts';
import type { Statement } from './batch.ts';

// Replaces a work's tags, creating any tag names not seen before.
export const tagStatements = async (db: Db, workId: string, names: string[]) => {
  const found = names.length ? await db.select().from(tags).where(inArray(tags.name, names)) : [];
  const ids = new Map(found.map((tag) => [tag.name, tag.id]));

  const rows = names
    .filter((name) => !ids.has(name))
    .map((name) => ({ id: crypto.randomUUID(), name }));

  rows.forEach((row) => ids.set(row.name, row.id));

  const statements: Statement[] = [db.delete(workTags).where(eq(workTags.workId, workId))];

  if (rows.length) statements.push(db.insert(tags).values(rows));

  const links = names.map((name) => ({ workId, tagId: ids.get(name)! }));

  if (links.length) statements.push(db.insert(workTags).values(links));

  return statements;
};
