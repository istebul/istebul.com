#!/usr/bin/env node
/**
 * Static page health checks (GÖREV 2/4).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = false;

const fail = (msg) => {
  console.error(msg);
  failed = true;
};

const unsub = fs.readFileSync(path.join(root, 'abonelik-iptal.html'), 'utf8');
if (unsub.includes('/css/main.css')) fail('abonelik-iptal must not reference missing main.css');
if (unsub.includes('/dist/env.js')) fail('abonelik-iptal must use /env.js not /dist/env.js');
if (!unsub.includes('/env.js')) fail('abonelik-iptal needs /env.js');

for (const file of ['css/design-tokens.css', 'css/layout-guard.css', 'js/runtime/ui-toast.js', 'js/runtime/env-config.js']) {
  if (!fs.existsSync(path.join(root, file))) fail(`MISSING: ${file}`);
}

const style = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
if (!style.includes("design-tokens.css")) fail('style.css must import design-tokens.css');
if (!style.includes('final-enterprise-release.css') && !style.includes("award-polish.css")) {
  fail('style.css must import final-enterprise-release.css or award-polish.css');
}
if (!style.includes('DUPLICATE_REMOVED')) fail('style.css should mark deduped blocks');

const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const envCount = (index.match(/env\.js/g) || []).length;
if (envCount > 2) fail('index.html has duplicate env.js references');

if (failed) process.exit(1);
console.log('Page health audit OK');
