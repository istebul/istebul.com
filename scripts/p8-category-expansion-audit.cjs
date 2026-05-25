#!/usr/bin/env node
/**
 * P8 — Category expansion strategist audit (ev, tatil, finans, sigorta, education).
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
  'data/platform/expansion-roadmap.json',
  'docs/EXPANSION_STRATEGY_ROADMAP.md',
  'docs/P8_CATEGORY_EXPANSION.md',
  'docs/PLATFORM_EXPANSION_ROADMAP.md'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const roadmap = JSON.parse(
  fs.readFileSync(path.join(root, 'data/platform/expansion-roadmap.json'), 'utf8')
);

if (roadmap.version !== 'p8.0') fail('expansion-roadmap.json must be version p8.0');

const requiredScope = ['ev', 'tatil', 'finans', 'sigorta', 'education'];
for (const id of requiredScope) {
  if (!roadmap.scope?.includes(id)) fail(`scope must include ${id}`);
  const cat = roadmap.categories?.find((c) => c.id === id);
  if (!cat) fail(`categories missing ${id}`);
}

if (!roadmap.phases?.length || roadmap.phases.length < 4) {
  fail('expansion-roadmap needs at least 4 phases');
}

const strategyMd = fs.readFileSync(
  path.join(root, 'docs/EXPANSION_STRATEGY_ROADMAP.md'),
  'utf8'
);
for (const token of ['Faz 0', 'ev', 'tatil', 'finans', 'sigorta', 'education', 'decision_leads']) {
  if (!strategyMd.includes(token)) fail(`EXPANSION_STRATEGY_ROADMAP.md missing: ${token}`);
}

const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
if (!appJs.includes('createDecisionAssistantConfig')) {
  fail('js/app.js should define createDecisionAssistantConfig');
}
if (!appJs.includes('ev') || !appJs.includes('tatil')) {
  fail('js/app.js should reference ev and tatil assistant categories');
}
if (!appJs.includes('createFinanceComparisons')) {
  fail('js/app.js should define createFinanceComparisons (finans embed)');
}

const growth = JSON.parse(
  fs.readFileSync(path.join(root, 'data/investor/growth-story.json'), 'utf8')
);
const phase2 = growth.phases?.find((p) => p.id === 'phase_2');
if (!phase2) fail('growth-story.json needs phase_2');
const phase2Text = JSON.stringify(phase2.goals || []);
if (!/konut|tatil|kredi|sigorta/i.test(phase2Text)) {
  fail('growth-story phase_2 should mention konut/tatil/kredi/sigorta expansion');
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts.test?.includes('p8-category-expansion-audit')) {
  fail('package.json test script must include p8-category-expansion-audit');
}

if (failed) process.exit(1);
console.log('P8 category expansion audit OK');
