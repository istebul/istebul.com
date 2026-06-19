import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { rewriteCssImports } from '../../scripts/lib/css-build.cjs';

test('rewriteCssImports keeps parent path for bundle @import', () => {
  const root = process.cwd();
  const refs = new Map([
    ['css/home-mockup-final-v1.css', 'css/home-mockup-final-v1.deadbeef01.css']
  ]);
  const css = "@import '../home-mockup-final-v1.css';";
  const out = rewriteCssImports(css, refs, 'css/bundles/homepage.bundle.css', root);
  assert.equal(out, "@import '../home-mockup-final-v1.deadbeef01.css';");
});
