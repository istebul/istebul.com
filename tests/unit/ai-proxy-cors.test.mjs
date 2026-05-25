import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const src = readFileSync(join(root, 'functions/ai-proxy.js'), 'utf8');

describe('ai-proxy CORS', () => {
  it('allowlists https://istebul.com and rejects wildcard', () => {
    assert.match(src, /PRIMARY_ORIGIN\s*=\s*'https:\/\/istebul\.com'/);
    assert.match(src, /ALLOWED_ORIGINS\s*=\s*new Set\(\[[\s\S]*PRIMARY_ORIGIN/);
    assert.doesNotMatch(src, /Access-Control-Allow-Origin['"]\s*:\s*['"]\*['"]/);
  });

  it('preflight returns 403 for unknown origins', () => {
    assert.match(src, /if\s*\(\s*!isAllowedOrigin\(origin\)\s*\)/);
    assert.match(src, /status:\s*403/);
  });
});
