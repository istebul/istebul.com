#!/usr/bin/env node
'use strict';

/**
 * P11-exit — Acquisition / exit optionality snapshot.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'data/ops/acquisition-exit-optionality.json');
const outPath = path.join(root, 'dist', 'acquisition-exit-snapshot.json');

async function main() {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const { buildAcquisitionExitSnapshot } = await import(
    '../js/features/ops/acquisition-exit-optionality.js'
  );

  const snapshot = buildAcquisitionExitSnapshot({
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
        recommendedPath: snapshot.executiveVerdict?.recommendedPath,
        exitReadinessPct: snapshot.executiveVerdict?.exitReadinessPct
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
