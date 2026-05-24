#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = false;

const fail = (msg) => {
  console.error(msg);
  failed = true;
};

const mustExist = [
  'docs/P5_1_PAID_ACQUISITION_READINESS.md',
  'data/growth/paid-channels.json',
  'data/growth/remarketing-audiences.json',
  'data/growth/paid-spend.template.json',
  'js/features/growth/paid-acquisition.js',
  'js/features/growth/paid-capi-bridge.js',
  'functions/api/paid-conversion-ingest.js',
  'functions/api/_shared/paid-capi-payloads.js',
  'scripts/paid-cac-report.cjs',
  'scripts/lib/paid-acquisition.cjs'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const paidChannels = JSON.parse(
  fs.readFileSync(path.join(root, 'data/growth/paid-channels.json'), 'utf8')
);
const requiredPlatforms = ['google_search', 'meta', 'tiktok', 'youtube', 'retargeting'];
for (const id of requiredPlatforms) {
  if (!paidChannels.platforms?.some((p) => p.id === id)) {
    fail(`paid-channels.json missing platform: ${id}`);
  }
}

const analytics = fs.readFileSync(path.join(root, 'js/core/analytics.js'), 'utf8');
if (!analytics.includes('gbraid') || !analytics.includes('paid_platform')) {
  fail('analytics must capture gbraid and paid_platform');
}

const platform = fs.readFileSync(
  path.join(root, 'supabase/functions/_shared/platform-analytics.ts'),
  'utf8'
);
if (!platform.includes('paid_landing_view') || !platform.includes('paid_capi_dispatch')) {
  fail('platform-analytics must allow paid P5.1 events');
}

const admin = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (!admin.includes('Paid platforms (P5.1)')) fail('admin needs paid platform table');

if (failed) process.exit(1);
console.log('P5.1 paid acquisition audit passed.');
