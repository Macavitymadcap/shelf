import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/d1/migrator';
import { getPlatformProxy } from 'wrangler';
import { createDb, type D1 } from './client.ts';

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

export const createTestDb = async () => {
  const proxy = await getPlatformProxy<{ DB: D1 }>({
    configPath: path('../wrangler.test.jsonc'),
    persist: false,
  });
  const db = createDb(proxy.env.DB);
  await migrate(db, { migrationsFolder: path('../migrations') });

  return { d1: proxy.env.DB, db, dispose: proxy.dispose };
};
