#!/usr/bin/env node
/**
 * Print infra unit-economics guardrails and sample monthly cost at MAU tiers.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const cfg = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ops/infra-unit-economics.json'), 'utf8')
);

const scaleLimits = fs.readFileSync(path.join(root, 'js/core/scale-limits.js'), 'utf8');

console.log('=== Infra unit economics (P16) ===\n');
console.log('Config version:', cfg.version);
console.log('Groq max_output_tokens:', cfg.vendors?.groq?.maxOutputTokens);
console.log('Analytics retention days:', cfg.vendors?.supabase?.analyticsRetentionDays);
console.log('Lifecycle max sends/run:', cfg.vendors?.resend?.lifecycleCronMaxSendsPerRun);
console.log('Analytics sample (low priority):', cfg.guardrails?.analyticsSampleRateLowPriority);

const mauTiers = [1000, 10000, 100000];
for (const mau of mauTiers) {
  const events = cfg.vendors?.supabase?.analyticsEventsPerMauMonth || 40;
  const aiCalls = 0.4;
  const emails = 0.15;
  const perCall =
    (1200 / 4 / 1000) * (cfg.vendors?.groq?.estimatedUsdPer1kInputTokens || 0) +
    ((cfg.vendors?.groq?.maxOutputTokens || 400) / 1000) *
      (cfg.vendors?.groq?.estimatedUsdPer1kOutputTokens || 0);
  const aiUsd = mau * aiCalls * perCall;
  const emailUsd = mau * emails * (cfg.vendors?.resend?.estimatedUsdPerEmail || 0.001);
  const supabaseBase = mau < 50000 ? 25 : mau < 200000 ? 75 : 199;
  const total = aiUsd + emailUsd + supabaseBase;
  console.log(`\nMAU ${mau}: est. infra ~$${total.toFixed(0)}/mo (ai $${aiUsd.toFixed(2)}, email $${emailUsd.toFixed(2)}, supabase base $${supabaseBase})`);
}

if (!scaleLimits.includes('maxQueue: 40')) {
  console.warn('\nWARN: scale-limits.js may be out of sync with infra-unit-economics.json');
}

console.log('\nRun: node scripts/analytics-retention-purge.cjs --dry-run');
