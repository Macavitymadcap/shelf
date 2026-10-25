import { sql, type SQL } from 'drizzle-orm';

// In a select from one table, Drizzle drops table names from columns written
// directly in its fields, so `people.id = credits.person_id` would become an
// ambiguous `id = person_id`. A fragment nested one level down keeps them.
export const nested = <T>(fragment: SQL) => sql<T>`${fragment}`;
