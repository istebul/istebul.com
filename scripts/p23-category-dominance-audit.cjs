#!/usr/bin/env node
/**
 * P23 — Category dominance strategy audit.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = false;

const fail = (msg) => {
  console.error(msg);
  failed = true;
};

const mustExist = [
  'data/ops/category-dominance-strategy.json',
  'docs/CATEGORY_DOMINANCE_STRATEGY.md',
  'js/features/ops/category-dominance-strategy.js',
  'js/features/ops/category-dominance-views.js',
  'scripts/category-dominance-snapshot.cjs',
  'docs/COMPETITIVE_MOAT_STRATEGY.md',
  'data/investor/moat-story.json'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const config = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ops/category-dominance-strategy.json'), 'utf8')
);
if (config.version !== 'p23.0') fail('category-dominance-strategy.json must be p23.0');
if ((config.competitorLandscape || []).length < 6) fail('need 6 competitor archetypes');
if ((config.moatPlans || []).length !== 6) fail('need exactly 6 moat plans');

const moatIds = [
  'positioning_moat',
  'acquisition_moat',
  'data_moat',
  'partner_moat',
  'brand_moat',
  'product_moat'
];
for (const id of moatIds) {
  if (!config.moatPlans.find((m) => m.id === id)) fail(`missing moat ${id}`);
}

const doc = fs.readFileSync(path.join(root, 'docs/CATEGORY_DOMINANCE_STRATEGY.md'), 'utf8');
for (const token of ['Sahibinden', 'Arabam', 'positioning moat', 'category ownership', 'Decision Platform']) {
  if (!doc.includes(token)) fail(`CATEGORY_DOMINANCE_STRATEGY missing: ${token}`);
}

const adminHtml = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
if (!adminHtml.includes('category-dominance')) fail('admin needs category-dominance page');

const adminJs = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (!adminJs.includes('loadCategoryDominance')) fail('admin needs loadCategoryDominance');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts['metrics:category:dominance']) {
  fail('package.json needs metrics:category:dominance');
}
if (!pkg.scripts.test?.includes('p23-category-dominance-audit')) {
  fail('package.json test must include p23-category-dominance-audit');
}

if (failed) process.exit(1);
console.log('P23 category dominance audit OK');
