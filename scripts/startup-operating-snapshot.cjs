#!/usr/bin/env node
'use strict';

/**
 * P18 — Startup operating mode JSON export.
 * Usage: npm run metrics:startup:operating
 * Optional: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to enrich with live ops center
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'data/ops/startup-operating-mode.json');
const outPath = path.join(root, 'dist', 'startup-operating-snapshot.json');
const opsCenterPath = path.join(root, 'dist', 'ops-command-center.json');

async function main() {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const { buildStartupOperatingSnapshot } = await import(
    '../js/features/ops/startup-operating-center.js'
  );

  let opsCenter = null;
  if (fs.existsSync(opsCenterPath)) {
    try {
      opsCenter = JSON.parse(fs.readFileSync(opsCenterPath, 'utf8'));
    } catch {
      /* ignore */
    }
  }

  const hasDb = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (hasDb && !opsCenter) {
    const { spawnSync } = await import('child_process');
    const center = spawnSync('node', [path.join(root, 'scripts/ops-command-center.cjs')], {
      cwd: root,
      env: process.env,
      encoding: 'utf8'
    });
    if (center.status === 0 && fs.existsSync(opsCenterPath)) {
      opsCenter = JSON.parse(fs.readFileSync(opsCenterPath, 'utf8'));
    }
  }

  const snapshot = buildStartupOperatingSnapshot({
    config,
    opsCenter,
    generatedAt: new Date().toISOString()
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log(JSON.stringify({ ok: true, path: outPath, scaleStage: snapshot.scaleStage }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
