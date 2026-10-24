import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { hashPassword, MIN_PASSWORD_LENGTH } from '@shelf/auth';

const target = process.argv.includes('--remote') ? '--remote' : '--local';
if (target === '--local') process.loadEnvFile('.dev.vars');
const pepper = process.env.PASSWORD_PEPPER;
if (!pepper) throw new Error('PASSWORD_PEPPER is not set');

const prompt = createInterface({ input: process.stdin, output: process.stdout, terminal: false });

const askHidden = async (question: string) => {
  const echo = (setting: string) => {
    if (process.stdin.isTTY) execFileSync('stty', [setting], { stdio: 'inherit' });
  };
  echo('-echo');
  const answer = await prompt.question(question);
  echo('echo');
  process.stdout.write('\n');
  return answer;
};

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;

const username = (await prompt.question('Username: ')).trim().toLowerCase();
const displayName = (await prompt.question('Display name: ')).trim();
const password = await askHidden(`Password (${MIN_PASSWORD_LENGTH}+ characters): `);
prompt.close();
if (password.length < MIN_PASSWORD_LENGTH) throw new Error('Password is too short');

const now = Date.now();
const hash = await hashPassword(password, pepper);
const values = [crypto.randomUUID(), username, displayName, hash].map(quote).join(', ');
const sql = `INSERT INTO users (
    id, 
    username, 
    display_name, 
    password_hash, 
    created_at, 
    updated_at
) VALUES (${values}, ${now}, ${now});`;

execFileSync('vp', ['exec', 'wrangler', 'd1', 'execute', 'DB', target, '--command', sql], {
  stdio: 'inherit',
});
