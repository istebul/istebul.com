#!/usr/bin/env node
'use strict';

/**
 * P21 — Hiring architecture snapshot.
 * Usage: npm run metrics:hiring:architecture
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'data/ops/hiring-architecture.json');
const outPath = path.join(root, 'dist', 'hiring-architecture-snapshot.json');
const opsCenterPath = path.join(root, 'dist', 'ops-command-center.json');

async function main() {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const { buildHiringArchitectureSnapshot } = await import(
    '../js/features/ops/hiring-architecture.js'
  );

  let liveSignals = {};
  if (fs.existsSync(opsCenterPath)) {
    try {
      const ops = JSON.parse(fs.readFileSync(opsCenterPath, 'utf8'));
      liveSignals = {
        opsHealth: ops.overallHealth,
        analyticsAtCap: Boolean(ops.metrics?.analytics?.eventsAtCap),
        dispatchRatePct: ops.metrics?.partner?.dispatchRatePct ?? ops.partnerOps?.dispatchMonitoring?.successRatePct24h,
        funnelCrDropPct: 0,
        partnerLeads30d: ops.executive?.partnerLeadQuality?.totalLeads ?? 0
      };
    } catch {
      /* ignore */
    }
  }

  const snapshot = buildHiringArchitectureSnapshot({
    config,
    liveSignals,
    generatedAt: new Date().toISOString()
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        path: outPath,
        nextHire: snapshot.nextRecommendedHire?.roleId
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
