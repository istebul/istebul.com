#!/usr/bin/env node
'use strict';

/**
 * P9 — Daily ops automation runner: command center + optional Telegram digest.
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run ops:automation:run
 * Optional: OPS_ALERT_DIGEST_URL, OPS_ALERT_WEBHOOK_SECRET, TELEGRAM_* (via edge function)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const reportPath = path.join(root, 'dist', 'ops-automation-report.json');
const manifestPath = path.join(root, 'data/ops/automation-manifest.json');

async function postAlertDigest(triggered) {
  const url = process.env.OPS_ALERT_DIGEST_URL;
  const secret = process.env.OPS_ALERT_WEBHOOK_SECRET;
  if (!url || !secret || !triggered.length) return { skipped: true, reason: 'no_url_or_no_alerts' };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
      'x-webhook-secret': secret
    },
    body: JSON.stringify({ alerts: triggered })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ops-alert-digest ${res.status}: ${text}`);
  }
  return { ok: true };
}

async function main() {
  const hasDb = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const report = {
    version: 'p9.0',
    generatedAt: new Date().toISOString(),
    hasDb,
    steps: []
  };

  if (hasDb) {
    const center = spawnSync('node', [path.join(root, 'scripts/ops-command-center.cjs')], {
      cwd: root,
      env: process.env,
      encoding: 'utf8'
    });
    report.steps.push({
      id: 'ops_command_center',
      ok: center.status === 0,
      stderr: center.stderr?.slice(0, 500) || null
    });
    if (center.status !== 0) {
      console.error(center.stderr || center.stdout);
      process.exit(center.status || 1);
    }

    const snapshotPath = path.join(root, 'dist', 'ops-command-center.json');
    if (fs.existsSync(snapshotPath)) {
      const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
      report.overallHealth = snapshot.overallHealth;
      report.triggeredAlerts = snapshot.alerts?.triggered || [];

      try {
        report.digest = await postAlertDigest(report.triggeredAlerts);
      } catch (err) {
        report.digest = { ok: false, error: String(err.message || err) };
      }
    }

    const startup = spawnSync('node', [path.join(root, 'scripts/startup-operating-snapshot.cjs')], {
      cwd: root,
      env: process.env,
      encoding: 'utf8'
    });
    report.steps.push({
      id: 'startup_operating_snapshot',
      ok: startup.status === 0,
      stderr: startup.stderr?.slice(0, 500) || null
    });
    const startupPath = path.join(root, 'dist', 'startup-operating-snapshot.json');
    if (fs.existsSync(startupPath)) {
      report.startupOperating = JSON.parse(fs.readFileSync(startupPath, 'utf8'));
    }

    const retention = spawnSync(
      'node',
      [path.join(root, 'scripts/analytics-retention-purge.cjs'), '--dry-run'],
      { cwd: root, env: process.env, encoding: 'utf8' }
    );
    report.steps.push({
      id: 'analytics_retention_purge_dry_run',
      ok: retention.status === 0,
      skipped: retention.status !== 0,
      stderr: retention.stderr?.slice(0, 500) || null
    });

    const ceo = spawnSync('node', [path.join(root, 'scripts/ceo-alert-run.cjs')], {
      cwd: root,
      env: process.env,
      encoding: 'utf8'
    });
    report.steps.push({
      id: 'ceo_alerts',
      ok: ceo.status === 0,
      stderr: ceo.stderr?.slice(0, 500) || null
    });
    const ceoReportPath = path.join(root, 'dist', 'ceo-alerts-report.json');
    if (fs.existsSync(ceoReportPath)) {
      report.ceoAlerts = JSON.parse(fs.readFileSync(ceoReportPath, 'utf8'));
    }
  } else {
    report.steps.push({
      id: 'ops_command_center',
      ok: false,
      skipped: true,
      reason: 'missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    });
    report.overallHealth = 'unknown';
    report.triggeredAlerts = [];
  }

  report.manifest = {
    version: manifest.version,
    scheduledJobs: manifest.scheduledJobs?.map((j) => j.id)
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
