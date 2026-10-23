import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema/index.ts';

export type D1 = Parameters<typeof drizzle>[0];

export const createDb = (d1: D1) => drizzle(d1, { schema, casing: 'snake_case' });

export type Db = ReturnType<typeof createDb>;
