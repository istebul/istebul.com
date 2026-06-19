import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const adminPanelPath = path.join(process.cwd(), 'admin-panel.html');

test('admin-panel.html is readable', () => {
  const html = fs.readFileSync(adminPanelPath, 'utf8');
  assert.ok(html.length > 0, 'admin-panel.html should not be empty');
});

test('auto-leads-toolbar desktop min-width is scoped to min-width 901px', () => {
  const html = fs.readFileSync(adminPanelPath, 'utf8');
  assert.match(
    html,
    /@media\s*\(min-width:\s*901px\)\s*\{[\s\S]*?\.auto-leads-toolbar\s+\.form-input\s*\{[^}]*min-width:\s*240px[^}]*flex:\s*1[^}]*\}/,
    'desktop min-width:240px rule should live inside @media (min-width: 901px)'
  );
});

test('auto-leads-toolbar mobile override prevents overflow expansion', () => {
  const html = fs.readFileSync(adminPanelPath, 'utf8');
  const mobileBlocks = [...html.matchAll(/@media\s*\(max-width:\s*900px\)\s*\{([\s\S]*?)\n\}/g)];
  assert.ok(mobileBlocks.length > 0, 'expected at least one @media (max-width: 900px) block');

  const toolbarMobileBlock = mobileBlocks
    .map((match) => match[1])
    .find((block) =>
      /\.auto-leads-toolbar\s+\.form-input/.test(block) && /\.auto-leads-check/.test(block)
    );
  assert.ok(toolbarMobileBlock, 'expected scoped mobile override for auto-leads toolbar and check');

  const formInputRule =
    toolbarMobileBlock.match(/\.auto-leads-toolbar\s+\.form-input\s*\{[^}]*\}/s)?.[0] ?? '';
  assert.ok(formInputRule.length > 0, 'expected .auto-leads-toolbar .form-input rule in mobile block');
  assert.match(formInputRule, /min-width:\s*0/);
  assert.match(formInputRule, /width:\s*100%/);
  assert.match(formInputRule, /flex:\s*1\s+1\s+100%/);

  const checkRule = toolbarMobileBlock.match(/\.auto-leads-check\s*\{[^}]*\}/s)?.[0] ?? '';
  assert.ok(checkRule.length > 0, 'expected .auto-leads-check rule in mobile block');
  assert.match(checkRule, /white-space:\s*normal/);
});

test('global body/html overflow hack was not added', () => {
  const html = fs.readFileSync(adminPanelPath, 'utf8');
  assert.doesNotMatch(html, /(?:body|html)\s*\{[^}]*overflow-x:\s*(?:hidden|clip)/);
});
