import { sortName } from '@shelf/catalogue';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { credits } from '../schema/credits.ts';
import { people } from '../schema/people.ts';
import type { Statement } from './batch.ts';
import type { CreditInput } from './types.ts';

const key = (name: string) => name.trim().toLowerCase();

type Person = { id: string; name: string; sortName: string };

// Gives every name not already in `ids` a new person row.
const planPeople = (names: string[], ids: Map<string, string>) => {
  const rows: Person[] = [];

  for (const name of names) {
    if (ids.has(key(name))) continue;

    const id = crypto.randomUUID();
    ids.set(key(name), id);
    rows.push({ id, name, sortName: sortName(name) });
  }

  return rows;
};

// Reuses a person with the same name, ignoring case.
const resolvePeople = async (db: Db, names: string[]) => {
  const keys = [...new Set(names.map(key))];
  const lowerName = sql<string>`lower(${people.name})`;
  const found = keys.length
    ? await db
        .select({ id: people.id, key: lowerName })
        .from(people)
        .where(inArray(lowerName, keys))
    : [];
  const ids = new Map(found.map((person) => [person.key, person.id]));

  return { ids, rows: planPeople(names, ids) };
};

// Replaces a work's own credits (edition credits are left alone).
export const creditStatements = async (db: Db, workId: string, input: CreditInput[]) => {
  const { ids, rows } = await resolvePeople(
    db,
    input.map((credit) => credit.name),
  );

  const statements: Statement[] = [
    db.delete(credits).where(and(eq(credits.workId, workId), isNull(credits.editionId))),
  ];

  if (rows.length) statements.push(db.insert(people).values(rows));

  const values = input.map((credit, position) => ({
    workId,
    personId: ids.get(key(credit.name))!,
    role: credit.role,
    position,
  }));

  if (values.length) statements.push(db.insert(credits).values(values).onConflictDoNothing());

  return statements;
};
