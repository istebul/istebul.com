#!/usr/bin/env node
/**
 * Decision Center audit — Karar Merkezi validation.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

let failed = 0;

function fail(msg) {
  console.error('FAIL:', msg);
  failed += 1;
}

function pass(msg) {
  console.log('PASS:', msg);
}

const mustExist = [
  'admin/ai-listings.html',
  'js/admin/ai-listings-admin.js',
  'js/admin/ai-listings-decision-workspace.js',
  'js/admin/ai-listings-admin-drawer-state.js',
  'css/admin-ai-listings.css'
];

for (const rel of mustExist) {
  if (!exists(rel)) fail(`Missing: ${rel}`);
  else pass(`Present: ${rel}`);
}

const html = read('admin/ai-listings.html');
if (!html.includes('Karar Merkezi') && !html.includes('ai-listings-admin')) {
  fail('Admin HTML missing decision center markers');
} else {
  pass('Decision center HTML markers present');
}

const workspace = read('js/admin/ai-listings-decision-workspace.js');
const requiredActions = ['purchase', 'explain', 'report', 'compare', 'scenario'];
for (const action of requiredActions) {
  if (!workspace.includes(`'${action}'`)) fail(`Workspace missing action: ${action}`);
  else pass(`Workspace action: ${action}`);
}

const drawer = read('js/admin/ai-listings-admin-drawer-state.js');
if (!drawer.includes('drawer')) {
  fail('Drawer state module incomplete');
} else {
  pass('Drawer state module present');
}

console.log(`\nDecision Center audit errors: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
