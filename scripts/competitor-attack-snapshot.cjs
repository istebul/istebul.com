#!/usr/bin/env node
'use strict';

/**
 * P24 — Competitor attack scenario snapshot.
 * Usage: npm run metrics:competitor:attack
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'data/ops/competitor-attack-scenario.json');
const outPath = path.join(root, 'dist', 'competitor-attack-snapshot.json');

async function main() {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const { buildCompetitorAttackSnapshot } = await import(
    '../js/features/ops/competitor-attack-scenario.js'
  );

  const snapshot = buildCompetitorAttackSnapshot({
    config,
    generatedAt: new Date().toISOString()
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        path: outPath,
        defenseReadinessPct: snapshot.defenseReadinessPct,
        topAttack: snapshot.attackScenarios?.[0]?.id
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
