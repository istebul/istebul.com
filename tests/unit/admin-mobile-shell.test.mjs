import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const cssPath = path.join(process.cwd(), 'css/admin-premium-polish.css');

test('admin-premium-polish.css is readable', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.ok(css.length > 0, 'css/admin-premium-polish.css should not be empty');
});

test('admin mobile shell main column guards overflow expansion', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  const mainRule = /(?:body\.admin-enterprise\s+#app\s+\.main|#app\s+\.main)\s*\{[^}]*\}/s;
  assert.match(css, mainRule, 'expected #app .main or body.admin-enterprise #app .main rule');
  const mainBlock = css.match(mainRule)[0];
  assert.match(mainBlock, /min-width:\s*0/, 'main column should set min-width: 0');
  assert.match(mainBlock, /max-width:\s*100%/, 'main column should set max-width: 100%');
});

test('admin mobile shell restores enterprise drawer at 900px', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  const mobileBlock = css.match(/@media\s*\(max-width:\s*900px\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.ok(mobileBlock.length > 0, 'expected @media (max-width: 900px) block');

  const sidebarRule =
    /body\.admin-enterprise\s+#app\s+\.sidebar\s*\{[^}]*\}/s;
  assert.match(mobileBlock, sidebarRule, 'expected body.admin-enterprise #app .sidebar in mobile block');
  const sidebarBlock = mobileBlock.match(sidebarRule)[0];
  assert.match(sidebarBlock, /position:\s*fixed/, 'mobile sidebar should be position: fixed');
  assert.match(sidebarBlock, /width:\s*min\(88vw,\s*290px\)/, 'mobile sidebar should use min(88vw, 290px) width');
  assert.match(sidebarBlock, /transform:\s*translateX\(-100%\)/, 'closed drawer should translate off-screen');

  const openRule =
    /body\.admin-enterprise\.admin-sidebar-open\s+#app\s+\.sidebar\s*\{[^}]*\}/s;
  assert.match(mobileBlock, openRule, 'expected open-state sidebar rule in mobile block');
  const openBlock = mobileBlock.match(openRule)[0];
  assert.match(openBlock, /transform:\s*translateX\(0\)/, 'open drawer should translate into view');
});
