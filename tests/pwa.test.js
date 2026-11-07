import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

function files(dir) {
  return readdirSync(join(root, dir)).flatMap((f) => {
    const p = join(dir, f);
    return statSync(join(root, p)).isDirectory() ? files(p) : [p];
  });
}

test('the service worker caches every app file', () => {
  const sw = readFileSync(join(root, 'sw.js'), 'utf8');
  for (const f of [...files('js'), ...files('icons'), 'css/style.css', 'images/wood.svg']) {
    assert.ok(sw.includes(`'./${f}'`), `sw.js is missing ${f}`);
  }
});
