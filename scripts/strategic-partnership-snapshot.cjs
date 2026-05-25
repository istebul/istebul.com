#!/usr/bin/env node
'use strict';

/**
 * P26 — Strategic partnership roadmap snapshot.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'data/ops/strategic-partnership-roadmap.json');
const outPath = path.join(root, 'dist', 'strategic-partnership-snapshot.json');

async function main() {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const { buildStrategicPartnershipSnapshot } = await import(
    '../js/features/ops/strategic-partnership-roadmap.js'
  );

  const snapshot = buildStrategicPartnershipSnapshot({
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
        wave1: snapshot.accelerationVerdict?.wave1Focus,
        firstMotion: snapshot.firstPartnerType?.id
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
