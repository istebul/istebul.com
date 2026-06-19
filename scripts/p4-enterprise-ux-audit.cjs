#!/usr/bin/env node
/**
 * P4.2 enterprise UX audit — forms, auth, empty states, admin.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const mustExist = [
  'css/enterprise-ux-system.css',
  'js/runtime/enterprise-form-ux.js',
  'docs/P4_2_ENTERPRISE_UX.md'
];

const mustContain = [
  ['css/style.css', 'final-enterprise-release.css'],
  ['js/features/auth/auth.js', 'bindAuthModalA11y'],
  ['js/features/auth/auth.js', 'showForgotPasswordForm(prefillEmail'],
  ['js/features/auth/auth.js', 'showInlineFormBanner'],
  ['js/features/account/account.js', 'role="tabpanel"'],
  ['js/runtime/p4-product-polish.js', 'data-enterprise-form'],
  ['js/ui/ui.js', 'messages-empty-state'],
  ['admin-panel.html', 'role="alert"'],
  ['js/corporate/partner-basvuru.js', 'partnerFunnelError'],
  ['js/auto/auto-app.js', 'ib-lead-field'],
  ['index.html', 'aria-label="Pencereyi kapat"']
];

let failed = false;

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error('MISSING:', rel);
    failed = true;
  }
}

const partner = read('js/corporate/partner-basvuru.js');
if (partner.includes('alert(')) {
  console.error('ASSERT FAILED: partner-basvuru should not use alert()');
  failed = true;
}

for (const [rel, needle] of mustContain) {
  if (!read(rel).includes(needle)) {
    console.error('ASSERT FAILED:', rel, 'must contain', needle);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('P4.2 enterprise UX audit passed.');
