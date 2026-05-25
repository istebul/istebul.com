#!/usr/bin/env node
'use strict';

/**
 * P19 — Scale architecture execution report JSON.
 * Usage: npm run metrics:scale:architecture
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'data/ops/scale-architecture-scenarios.json');
const outPath = path.join(root, 'dist', 'scale-architecture-report.json');
const opsCenterPath = path.join(root, 'dist', 'ops-command-center.json');

async function main() {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const { buildScaleArchitectureReport } = await import(
    '../js/features/ops/scale-architecture-matrix.js'
  );

  let liveSignals = null;
  if (fs.existsSync(opsCenterPath)) {
    try {
      const ops = JSON.parse(fs.readFileSync(opsCenterPath, 'utf8'));
      liveSignals = {
        analyticsAtCap: Boolean(ops.metrics?.analytics?.eventsAtCap),
        triggeredAlerts: ops.alerts?.triggeredCount ?? 0,
        opsHealth: ops.overallHealth
      };
    } catch {
      /* ignore */
    }
  }

  const report = buildScaleArchitectureReport({
    config,
    liveSignals,
    generatedAt: new Date().toISOString()
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        path: outPath,
        tierConfidence: report.tierConfidence
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
