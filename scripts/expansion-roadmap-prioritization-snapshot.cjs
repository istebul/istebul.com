#!/usr/bin/env node
'use strict';

/**
 * P25 — Expansion roadmap prioritization snapshot.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'data/ops/expansion-roadmap-prioritization.json');
const outPath = path.join(root, 'dist', 'expansion-roadmap-prioritization-snapshot.json');

async function main() {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const { buildExpansionPrioritizationSnapshot } = await import(
    '../js/features/ops/expansion-roadmap-prioritization.js'
  );

  const snapshot = buildExpansionPrioritizationSnapshot({
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
        firstCategory: snapshot.firstCategory?.id,
        compositeScore: snapshot.firstCategory?.compositeScore
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
