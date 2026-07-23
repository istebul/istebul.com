import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const { CSP_PUBLIC, CSP_ADMIN, WORKER_SRC } = require(join(root, 'scripts/lib/csp-policy.cjs'));

assert.match(CSP_PUBLIC, /script-src 'self'/);
assert.match(CSP_PUBLIC, /https:\/\/www\.istebul\.com/);
assert.match(CSP_PUBLIC, /worker-src/);
assert.doesNotMatch(CSP_PUBLIC, /script-src[^;]*'unsafe-inline'/);
assert.match(CSP_ADMIN, /'unsafe-inline'/);

const headers = readFileSync(join(root, '_headers'), 'utf8');
const globalCsp = headers.split('\n').find((l) => l.includes('Content-Security-Policy:')) || '';
assert.ok(globalCsp.includes(WORKER_SRC.split(' ')[0]), '_headers must include worker-src');
assert.ok(globalCsp.includes('https://www.istebul.com'), '_headers must allow www origin');

assert.match(CSP_PUBLIC, /script-src[^;]*https:\/\/pagead2\.googlesyndication\.com/, 'CSP must allow AdSense script host');
assert.match(CSP_PUBLIC, /connect-src[^;]*https:\/\/pagead2\.googlesyndication\.com/, 'CSP must allow AdSense connect host');
assert.match(CSP_PUBLIC, /frame-src[^;]*https:\/\/googleads\.g\.doubleclick\.net/, 'CSP must allow AdSense frame host');
assert.match(globalCsp, /pagead2\.googlesyndication\.com/, '_headers CSP must include AdSense script host');

const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');
const productionBuild = readFileSync(join(root, 'scripts/production-build.cjs'), 'utf8');
assert.ok(!indexHtml.includes('onload="this.media'), 'index.html must not use font onload handlers');
assert.ok(!productionBuild.includes('onload="this.media'), 'production-build must not inject font onload handlers');
assert.ok(productionBuild.includes('perf-fonts-async.js'), 'production-build must use perf-fonts-async.js');
assert.ok(indexHtml.includes('site-social-deferred-boot.js'), 'index.html must use external social boot');
assert.ok(indexHtml.includes('platform-graph.json'), 'index.html must use external JSON-LD (platform-graph)');

console.log('csp-policy.test.mjs: OK');
