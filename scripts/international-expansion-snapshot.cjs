#!/usr/bin/env node
'use strict';

/**
 * P22 — International expansion audit snapshot.
 * Usage: npm run metrics:international:audit
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'data/ops/international-expansion-audit.json');
const outPath = path.join(root, 'dist', 'international-expansion-snapshot.json');

async function main() {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const { buildInternationalExpansionSnapshot } = await import(
    '../js/features/ops/international-expansion-audit.js'
  );

  const snapshot = buildInternationalExpansionSnapshot({
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
        globalReadinessPct: snapshot.globalReadinessPct,
        wave1: snapshot.wave1Markets?.map((m) => m.country)
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
