import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const cssPath = path.join(process.cwd(), 'css/admin-premium-polish.css');

test('admin-premium-polish.css is readable', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.ok(css.length > 0, 'css/admin-premium-polish.css should not be empty');
});

test('admin page container clips horizontal overflow instead of scrolling', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  const pageRules = [...css.matchAll(/#app\s+\.page\s*\{[^}]*\}/gs)].map((match) => match[0]);
  assert.ok(pageRules.length > 0, 'expected at least one #app .page rule');
  const overflowPageRule = pageRules.find((block) => /overflow-x:\s*clip/.test(block));
  assert.ok(overflowPageRule, 'expected #app .page overflow clip rule');
  assert.doesNotMatch(overflowPageRule, /overflow-x:\s*auto/, 'page container should not use overflow-x: auto');
  assert.match(overflowPageRule, /max-width:\s*100%/, 'page container should set max-width: 100%');
  assert.match(overflowPageRule, /min-width:\s*0/, 'page container should set min-width: 0');
});

test('admin table-wrap keeps inner horizontal scroll', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  const tableWrapRule = /#app\s+\.table-wrap\s*\{[^}]*\}/s;
  assert.match(css, tableWrapRule, 'expected #app .table-wrap rule');
  const tableWrapBlock = css.match(tableWrapRule)[0];
  assert.match(tableWrapBlock, /overflow-x:\s*auto/, 'table-wrap should keep overflow-x: auto');
  assert.match(tableWrapBlock, /-webkit-overflow-scrolling:\s*touch/);
});

test('page and table-wrap overflow rules are split', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.doesNotMatch(
    css,
    /#app\s+\.table-wrap,\s*\n#app\s+\.page\s*\{[^}]*overflow-x:\s*auto/
  );
});

test('global body/html overflow hack was not added to admin-premium-polish.css', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.doesNotMatch(css, /(?:body|html)\s*\{[^}]*overflow-x:\s*(?:hidden|clip)/);
});
