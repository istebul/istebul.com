#!/usr/bin/env node
'use strict';

/**
 * P11-exit — Acquisition / exit optionality snapshot + founder metrics report.
 * Deploy-safe: runs without Supabase (config-only metrics); enriches when credentials set.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'data/ops/acquisition-exit-optionality.json');
const distJsonPath = path.join(root, 'dist', 'exit-optionality-snapshot.json');
const legacyJsonPath = path.join(root, 'dist', 'acquisition-exit-snapshot.json');
const reportPath = path.join(root, 'docs/exit-optionality-report.md');

async function main() {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const { buildAcquisitionExitSnapshot } = await import(
    '../js/features/ops/acquisition-exit-optionality.js'
  );
  const {
    fetchSupabaseExitInputs,
    computeExitOptionalityMetrics,
    buildExitOptionalityReport,
    renderExitOptionalityMarkdown
  } = await import('../metrics/exit-optionality.js');

  const staticSnapshot = buildAcquisitionExitSnapshot({
    config,
    generatedAt: new Date().toISOString()
  });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let metrics;
  let dataSource = 'config_only';

  if (url && key) {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const inputs = await fetchSupabaseExitInputs(sb);
    metrics = computeExitOptionalityMetrics({
      ...inputs,
      generatedAt: new Date().toISOString(),
      dataSource: 'supabase_live'
    });
    dataSource = inputs.errors?.length ? 'supabase_partial' : 'supabase_live';
    if (inputs.errors?.length) metrics.dataSource = dataSource;
  } else {
    metrics = computeExitOptionalityMetrics({
      leads: [],
      subscriptions: [],
      analyticsEvents: [],
      moatFlywheel: null,
      generatedAt: new Date().toISOString(),
      dataSource: 'config_only',
      errors: [
        'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — founder metrics are zeroed; static P11 config still embedded.'
      ]
    });
  }

  const report = buildExitOptionalityReport({
    metrics,
    configSnapshot: config,
    generatedAt: new Date().toISOString()
  });

  const payload = {
    ...staticSnapshot,
    founderMetrics: metrics,
    acquisitionAttractiveness: metrics.acquisitionAttractiveness,
    exitOptionalityReport: report
  };

  fs.mkdirSync(path.dirname(distJsonPath), { recursive: true });
  fs.writeFileSync(distJsonPath, JSON.stringify(payload, null, 2));
  fs.writeFileSync(legacyJsonPath, JSON.stringify(payload, null, 2));
  fs.writeFileSync(reportPath, renderExitOptionalityMarkdown(report));

  console.log(
    JSON.stringify(
      {
        ok: true,
        dataSource,
        paths: { distJsonPath, legacyJsonPath, reportPath },
        acquisitionAttractiveness: metrics.acquisitionAttractiveness?.score,
        estimatedArrTry: metrics.estimatedArrTry,
        totalLeads: metrics.totalLeads,
        exitReadinessPct: staticSnapshot.executiveVerdict?.exitReadinessPct
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
