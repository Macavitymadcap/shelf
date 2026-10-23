import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { applyEdits, modify } from 'jsonc-parser';

const path = 'apps/web/wrangler.jsonc';
const args = ['stack', 'output', '--json', '--stack', 'prod', '--cwd', 'infra'];
const outputs = JSON.parse(execFileSync('pulumi', args, { encoding: 'utf8' }));
const format = { formattingOptions: { tabs: 2, insertSpaces: true } };

const set = (text: string, at: (string | number)[], value: unknown) =>
  applyEdits(text, modify(text, at, value, format));

let text = readFileSync(path, 'utf8');
text = set(text, ['d1_databases', 0, 'database_id'], outputs.databaseId);
text = set(text, ['r2_buckets', 0, 'bucket_name'], outputs.bucketName);

writeFileSync(path, text);
