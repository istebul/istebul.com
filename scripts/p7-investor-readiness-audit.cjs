#!/usr/bin/env node
/**
 * P7.2 — Investor / fundraising readiness audit.
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
  'docs/investor/investor-deck.md',
  'docs/investor/cap-table.csv',
  'docs/investor/loi-template.md',
  'docs/investor/STRIPE_MRR_EVIDENCE.md',
  'docs/investor/financial-model-template/monthly_model_36m.csv',
  'docs/investor/financial-model-template/assumptions.csv',
  'data/investor/market-research.json',
  'data/investor/fundraising-readiness.json',
  'data/investor/market-sizing.json',
  'data/investor/financial-model-36m.json',
  'scripts/generate-financial-model-csv.cjs',
  'docs/investor/FUNDRAISING_READINESS.md',
  'docs/investor/MARKET_SIZING.md',
  'docs/investor/INVESTOR_NARRATIVE.md',
  'docs/investor/KPI_STORY.md',
  'data/investor/investor-readiness.json',
  'js/features/investor/investor-narrative.js',
  'js/features/investor/investor-readiness.js',
  'scripts/investor-readiness-pack.cjs'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'data/investor/investor-readiness.json'), 'utf8')
);
if (manifest.version !== 'p7.2') fail('investor-readiness.json must be p7.2');

const sizing = JSON.parse(
  fs.readFileSync(path.join(root, 'data/investor/market-sizing.json'), 'utf8')
);
if (JSON.stringify(sizing).includes('FOUNDER_VERIFY')) {
  fail('market-sizing.json must not contain FOUNDER_VERIFY');
}
if (!sizing.verifiedAt) fail('market-sizing needs verifiedAt');

const research = JSON.parse(
  fs.readFileSync(path.join(root, 'data/investor/market-research.json'), 'utf8')
);
if (!research.markets?.used_car_tr?.volumeUnits2024) fail('market-research missing used car volume');

const fundraising = JSON.parse(
  fs.readFileSync(path.join(root, 'data/investor/fundraising-readiness.json'), 'utf8')
);
const deck = fundraising.assetManifest?.find((a) => a.id === 'investor_deck');
if (!deck || deck.status !== 'ready') fail('fundraising manifest needs investor_deck ready');

const deckMd = fs.readFileSync(path.join(root, 'docs/investor/investor-deck.md'), 'utf8');
for (const section of [
  'Problem',
  'TAM',
  'İş modeli',
  'Rakip',
  'Traction',
  'Go-to-market',
  'Finansal',
  'Takım',
  'Yatırım',
  'Fon kullanım'
]) {
  if (!deckMd.toLowerCase().includes(section.toLowerCase().slice(0, 5))) {
    fail(`investor-deck.md missing section near: ${section}`);
  }
}

const loi = fs.readFileSync(path.join(root, 'docs/investor/loi-template.md'), 'utf8');
if (!loi.includes('TR —') || !loi.includes('EN —')) fail('loi-template needs TR and EN');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts['metrics:investor:pack']) fail('package.json missing metrics:investor:pack');

if (failed) process.exit(1);
console.log('P7.2 investor readiness audit OK');
