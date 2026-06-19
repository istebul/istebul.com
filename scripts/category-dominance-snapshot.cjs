#!/usr/bin/env node
'use strict';

/**
 * P23 — Category dominance strategy snapshot.
 * Usage: npm run metrics:category:dominance
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'data/ops/category-dominance-strategy.json');
const outPath = path.join(root, 'dist', 'category-dominance-snapshot.json');

async function main() {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const { buildCategoryDominanceSnapshot } = await import(
    '../js/features/ops/category-dominance-strategy.js'
  );

  const snapshot = buildCategoryDominanceSnapshot({
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
        categoryOwnershipPct: snapshot.categoryOwnershipPct,
        topThreat: snapshot.competitorLandscape?.[0]?.name,
        strongestMoat: snapshot.moatPlans?.[0]?.name
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
