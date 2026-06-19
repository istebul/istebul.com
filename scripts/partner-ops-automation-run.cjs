#!/usr/bin/env node
'use strict';

/**
 * P12 — Partner ops automation: snapshot + failure alerting (Telegram via ops-alert-digest).
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run partner:ops:run
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const reportPath = path.join(root, 'dist', 'partner-ops-automation-report.json');

async function postAlertDigest(triggered) {
  const url = process.env.OPS_ALERT_DIGEST_URL;
  const secret = process.env.OPS_ALERT_WEBHOOK_SECRET;
  if (!url || !secret || !triggered.length) {
    return { skipped: true, reason: 'no_url_or_no_alerts' };
  }

  const partnerAlerts = triggered.filter((a) => a.domain === 'partner');
  if (!partnerAlerts.length) {
    return { skipped: true, reason: 'no_partner_alerts' };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
      'x-webhook-secret': secret
    },
    body: JSON.stringify({
      alerts: partnerAlerts,
      source: 'partner_ops_monitor'
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ops-alert-digest ${res.status}: ${text}`);
  }
  return { ok: true, count: partnerAlerts.length };
}

async function main() {
  const hasDb = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const report = {
    version: 'p12.0',
    generatedAt: new Date().toISOString(),
    hasDb,
    steps: []
  };

  if (hasDb) {
    const snap = spawnSync('node', [path.join(root, 'scripts/partner-ops-snapshot.cjs')], {
      cwd: root,
      env: process.env,
      encoding: 'utf8'
    });
    report.steps.push({
      id: 'partner_ops_snapshot',
      ok: snap.status === 0,
      stderr: snap.stderr?.slice(0, 500) || null
    });
    if (snap.status !== 0) {
      console.error(snap.stderr || snap.stdout);
      process.exit(snap.status || 1);
    }

    const snapshotPath = path.join(root, 'dist', 'partner-ops-snapshot.json');
    if (fs.existsSync(snapshotPath)) {
      const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
      report.overallHealth = snapshot.overallHealth;
      report.triggeredAlerts = snapshot.alerts?.triggered || [];
      report.sla = snapshot.sla;
      report.retryBacklog = snapshot.retryAutomation?.retryDueNow;

      try {
        report.digest = await postAlertDigest(report.triggeredAlerts);
      } catch (err) {
        report.digest = { ok: false, error: String(err.message || err) };
      }
    }
  } else {
    report.steps.push({
      id: 'partner_ops_snapshot',
      ok: false,
      skipped: true,
      reason: 'missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    });
    report.overallHealth = 'unknown';
    report.triggeredAlerts = [];
  }

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
