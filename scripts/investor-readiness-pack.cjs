#!/usr/bin/env node
'use strict';

/**
 * P7 — Export investor readiness pack (narrative JSON + optional live snapshot).
 * Usage: node scripts/investor-readiness-pack.cjs
 * With live metrics: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run metrics:investor:pack
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data', 'investor');
const outPath = path.join(root, 'dist', 'investor-readiness-pack.json');
const snapshotPath = path.join(root, 'dist', 'investor-metrics-snapshot.json');

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
}

async function loadLiveSnapshot() {
  if (fs.existsSync(snapshotPath)) {
    return JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const [subs, leads, events] = await Promise.all([
    sb.from('subscriptions').select('status, current_period_start, current_period_end, cancel_at_period_end').limit(5000),
    sb.from('auto_leads').select('estimated_revenue, actual_revenue, partner_status').limit(10000),
    sb.from('analytics_events').select('event_name').order('created_at', { ascending: false }).limit(5000)
  ]);

  if (subs.error && subs.error.code !== '42P01') throw subs.error;
  if (leads.error) throw leads.error;
  if (events.error) throw events.error;

  const { buildInvestorSnapshot } = await import('../js/features/metrics/investor-kpis.js');
  return buildInvestorSnapshot({
    subscriptions: subs.data || [],
    leads: leads.data || [],
    analyticsEvents: events.data || []
  });
}

async function main() {
  const manifest = readJson('investor-readiness.json');
  const assets = {
    manifest,
    investorNarrative: readJson('investor-narrative.json'),
    kpiStory: readJson('kpi-story.json'),
    metricsStory: readJson('metrics-story.json'),
    moatStory: readJson('moat-story.json'),
    marketSizing: readJson('market-sizing.json'),
    monetizationStory: readJson('monetization-story.json'),
    financialModel: readJson('financial-model.json'),
    growthStory: readJson('growth-story.json'),
    gtmNarrative: readJson('gtm-narrative.json'),
    deckReadiness: readJson('deck-readiness.json'),
    fundraisingReadiness: readJson('fundraising-readiness.json')
  };

  const snapshot = await loadLiveSnapshot();

  const { buildPackFromAssets } = await import('../js/features/investor/investor-narrative.js');
  const { scoreInvestorReadiness, summarizeDeckGaps, summarizeFundraisingGaps } = await import(
    '../js/features/investor/investor-readiness.js'
  );

  const pack = buildPackFromAssets(assets, snapshot);
  const readiness = scoreInvestorReadiness(pack);
  const deckGaps = summarizeDeckGaps(pack);
  const fundraisingGaps = summarizeFundraisingGaps(pack);

  const output = {
    ...pack,
    readiness,
    deckGaps,
    fundraisingGaps,
    snapshotSource: snapshot
      ? fs.existsSync(snapshotPath)
        ? 'dist/investor-metrics-snapshot.json'
        : 'supabase_live'
      : 'empty_baseline'
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log('Wrote', outPath);
  console.log('Readiness:', readiness.verdict, readiness.overallPct + '%');
  if (snapshot) {
    console.log('MRR TRY:', snapshot.subscription?.mrrTry, '| Blended ARR:', snapshot.blendedArrTry);
  } else {
    console.log('Tip: run metrics:investor first or set Supabase env for live traction.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
