import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

const DECISION_OPTIONS_SURFACE_PATHS = ['/secenekler', '/ilanlar', '/decision-options'];

test('decision-options alias parity across router, route-surface, bootstrap, and app routeMap', () => {
  const routerSource = fs.readFileSync(path.join(root, 'js/core/router.js'), 'utf8');
  const surfaceSource = fs.readFileSync(path.join(root, 'js/runtime/route-surface.js'), 'utf8');
  const bootstrapSource = fs.readFileSync(path.join(root, 'js/runtime/route-bootstrap-head.js'), 'utf8');
  const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
  const redirects = fs.readFileSync(path.join(root, '_redirects'), 'utf8');

  for (const routePath of DECISION_OPTIONS_SURFACE_PATHS) {
    assert.match(
      routerSource,
      new RegExp(`\\{ path: '${routePath}', component: 'ilanlar' \\}`)
    );
    assert.match(surfaceSource, new RegExp(`'${routePath}': 'ilanlar'`));
    assert.match(bootstrapSource, new RegExp(`'${routePath}':'ilanlar'`));
    assert.match(appSource, new RegExp(`'${routePath}': 'ilanlar'`));
  }

  assert.match(redirects, /^\/ilanlar \/secenekler\/ 301/m);
  assert.match(redirects, /^\/ilanlar\/ \/secenekler\/ 301/m);
  assert.match(redirects, /^\/decision-options \/secenekler\/ 301/m);
  assert.match(redirects, /^\/decision-options\/ \/secenekler\/ 301/m);
});
