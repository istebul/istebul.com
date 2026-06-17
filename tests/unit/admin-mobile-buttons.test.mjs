import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const premiumCssPath = path.join(process.cwd(), 'css/admin-premium-polish.css');
const enterpriseCssPath = path.join(process.cwd(), 'css/final-enterprise-release.css');
const linkedInCssPath = path.join(process.cwd(), 'css/admin-linkedin-ops.css');

test('final-enterprise keeps global mobile admin button full-width rule', () => {
  const css = fs.readFileSync(enterpriseCssPath, 'utf8');
  assert.match(
    css,
    /@media\s*\(max-width:\s*640px\)[\s\S]*body\.admin-enterprise\s+\.btn\s*\{[^}]*width:\s*100%/,
    'global mobile admin buttons should remain full width'
  );
  assert.match(
    css,
    /body\.admin-enterprise\s+\.btn\s*\{[^}]*justify-content:\s*center/
  );
});

test('admin-premium-polish defines mobile table action button carve-out', () => {
  const css = fs.readFileSync(premiumCssPath, 'utf8');
  assert.match(css, /@media\s*\(max-width:\s*640px\)/, 'expected @media (max-width: 640px) block');

  const tableBtnSelector =
    /body\.admin-enterprise\s+#app\s+\.table-actions:not\(\.crm-drawer-actions\)\s+\.btn/;
  assert.match(css, tableBtnSelector, 'expected scoped table-actions button carve-out');

  const actionBtnBlock =
    css.match(
      /body\.admin-enterprise\s+#app\s+\.table-actions:not\(\.crm-drawer-actions\)\s+\.btn,[\s\S]*?\{[^}]*\}/s
    )?.[0] ?? '';
  assert.ok(actionBtnBlock.length > 0, 'expected combined action button rule block');
  assert.match(actionBtnBlock, /width:\s*auto/);
  assert.match(actionBtnBlock, /min-height:\s*44px/);
  assert.match(actionBtnBlock, /white-space:\s*nowrap/);
  assert.match(actionBtnBlock, /word-break:\s*normal/);
  assert.match(actionBtnBlock, /overflow-wrap:\s*normal/);

  assert.match(
    css,
    /body\.admin-enterprise\s+#partner-applications-list\s+\.partner-applications-actions\s+\.btn/,
    'expected partner-applications-actions button carve-out'
  );
});

test('linkedin comment card styles remain untouched in admin-linkedin-ops.css', () => {
  const css = fs.readFileSync(linkedInCssPath, 'utf8');
  assert.match(css, /\.linkedin-comment-copy-btn\b/);
  assert.match(css, /#page-linkedin-ops-assistant\s+\.linkedin-comment-card-actions/);
});
