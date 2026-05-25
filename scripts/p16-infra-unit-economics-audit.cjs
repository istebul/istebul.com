#!/usr/bin/env node
/**
 * P16 — Infra & AI unit economics audit.
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
  'data/ops/infra-unit-economics.json',
  'docs/INFRA_UNIT_ECONOMICS.md',
  'js/core/unit-economics.js',
  'js/core/scale-limits.js',
  'scripts/infra-unit-economics-snapshot.cjs',
  'scripts/analytics-retention-purge.cjs'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const cfg = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ops/infra-unit-economics.json'), 'utf8')
);
if (cfg.vendors?.groq?.maxOutputTokens !== 400) {
  fail('infra config groq.maxOutputTokens must be 400');
}

const aiProxy = fs.readFileSync(path.join(root, 'functions/ai-proxy.js'), 'utf8');
if (!aiProxy.includes('AI_MAX_OUTPUT_TOKENS = 400')) {
  fail('ai-proxy must set AI_MAX_OUTPUT_TOKENS = 400');
}
if (!aiProxy.includes('readPromptCache')) fail('ai-proxy needs prompt cache');
if (!aiProxy.includes('AI_RATE_LIMIT_PER_MIN = 20')) {
  fail('ai-proxy rate limit must be 20/min');
}

const scale = fs.readFileSync(path.join(root, 'js/core/scale-limits.js'), 'utf8');
if (!scale.includes('maxQueue: 40')) fail('scale-limits analytics maxQueue must be 40');
if (!scale.includes('maxOutputTokens: 400')) fail('scale-limits aiProxy maxOutputTokens 400');

const analytics = fs.readFileSync(path.join(root, 'js/core/analytics.js'), 'utf8');
if (!analytics.includes('shouldSampleAnalyticsEvent')) {
  fail('analytics.js must use shouldSampleAnalyticsEvent');
}

const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
if (!app.includes('canCallAiNarration()')) {
  fail('app.js karar asistanı must gate AI with canCallAiNarration');
}

const lifecycle = fs.readFileSync(
  path.join(root, 'supabase/functions/lifecycle-cron/index.ts'),
  'utf8'
);
if (!lifecycle.includes('processDueMessages(sb, 50)')) {
  fail('lifecycle-cron send cap must be 50');
}

const ingest = fs.readFileSync(
  path.join(root, 'supabase/functions/analytics-ingest/index.ts'),
  'utf8'
);
if (!/analytics_ingest:\$\{clientIp\}[\s\S]*?\b100\b/.test(ingest)) {
  fail('analytics-ingest rate limit must be 100/min');
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts.test?.includes('p16-infra-unit-economics-audit')) {
  fail('package.json test must include p16-infra-unit-economics-audit');
}

if (failed) process.exit(1);
console.log('P16 infra unit economics audit OK');
