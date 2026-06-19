#!/usr/bin/env node
'use strict';

/**
 * P20 — Company operating system snapshot.
 * Usage: npm run metrics:company:operating
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'data/ops/company-operating-system.json');
const logPath = path.join(root, 'data/ops/decision-log.json');
const outPath = path.join(root, 'dist', 'company-operating-snapshot.json');

async function main() {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const decisionLog = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  const { buildCompanyOperatingSnapshot } = await import(
    '../js/features/ops/company-operating-system.js'
  );

  const artifactStatus = {
    opsAutomation: fs.existsSync(path.join(root, 'dist', 'ops-automation-report.json')),
    executive: fs.existsSync(path.join(root, 'dist', 'executive-kpi-snapshot.json')),
    growth: fs.existsSync(path.join(root, 'dist', 'growth-weekly-report.json'))
  };

  const snapshot = buildCompanyOperatingSnapshot({
    config,
    decisionLog,
    artifactStatus,
    generatedAt: new Date().toISOString()
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        path: outPath,
        independenceScore: snapshot.independenceScore,
        roadmapNow: snapshot.roadmapNow?.map((q) => q.id)
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
