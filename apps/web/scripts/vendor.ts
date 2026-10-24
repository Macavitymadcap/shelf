// Copies third-party CSS and fonts into public/vendor, because the CSP only allows 'self'.
import { copyFileSync, mkdirSync } from 'node:fs';
import { basename } from 'node:path';

const caslon = 'node_modules/@fontsource/libre-caslon-text/files/libre-caslon-text-latin';
const courier = 'node_modules/@fontsource/courier-prime/files/courier-prime-latin';

const assets: Record<string, string[]> = {
  // Only the Open Props groups the stylesheets use; see public/styles/app.css.
  'public/vendor/open-props': ['sizes', 'fonts', 'borders', 'shadows', 'red', 'blue'].map(
    (group) => `node_modules/open-props/${group}.min.css`,
  ),
  'public/vendor/fonts': [
    `${caslon}-400-normal.woff2`,
    `${caslon}-400-italic.woff2`,
    `${caslon}-700-normal.woff2`,
    `${courier}-400-normal.woff2`,
    `${courier}-700-normal.woff2`,
  ],
};

for (const [dir, files] of Object.entries(assets)) {
  mkdirSync(dir, { recursive: true });
  for (const file of files) copyFileSync(file, `${dir}/${basename(file)}`);
}
