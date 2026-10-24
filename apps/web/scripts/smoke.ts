import { execFileSync } from 'node:child_process';
import { hashPassword } from '@shelf/auth';
import { checks, DISPLAY_NAME, PASSWORD, USERNAME } from './smoke-check.ts';

process.loadEnvFile('.dev.vars');
const pepper = process.env.PASSWORD_PEPPER;
if (!pepper) throw new Error('PASSWORD_PEPPER is not set in .dev.vars');

const sql = (command: string) =>
  execFileSync('vp', ['exec', 'wrangler', 'd1', 'execute', 'DB', '--local', '--command', command], {
    stdio: 'pipe',
  });

const clearAuthTables = () =>
  sql('DELETE FROM login_attempts; DELETE FROM sessions; DELETE FROM passkeys; DELETE FROM users;');

const createSmokeUser = async () => {
  const hash = await hashPassword(PASSWORD, pepper);
  const now = Date.now();
  sql(
    `INSERT INTO users (id, username, display_name, password_hash, created_at, updated_at) VALUES ('${crypto.randomUUID()}', '${USERNAME}', '${DISPLAY_NAME}', '${hash}', ${now}, ${now});`,
  );
};

const runChecks = async () => {
  let failures = 0;
  for (const [name, check] of checks) {
    const passed = await check().catch(() => false);
    if (!passed) failures++;
    console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}`);
  }
  return failures;
};

clearAuthTables();
await createSmokeUser();
const failures = await runChecks();
clearAuthTables();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exitCode = failures ? 1 : 0;
