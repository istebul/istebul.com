'use strict';

const { conversionRate, countFunnelStep } = require('./growth-kpis.cjs');

const PAID_PLATFORMS = ['google_search', 'meta', 'tiktok', 'youtube', 'retargeting'];

function paidPlatformFromRow(row) {
  const props = row.properties || row.attribution || {};
  return props.paid_platform || row.attribution?.paid_platform || null;
}

function computePaidPlatformBreakdown(rows) {
  return PAID_PLATFORMS.map((platformId) => {
    const platformRows = rows.filter((row) => paidPlatformFromRow(row) === platformId);
    const leads = platformRows.filter((r) =>
      r.event_name === 'auto_lead_submit' || r.event_name === 'lead_submit'
    ).length;
    const clicks = platformRows.filter((r) => r.event_name === 'paid_click_capture').length;
    const landings = platformRows.filter((r) => r.event_name === 'paid_landing_view').length;
    const checkouts = platformRows.filter((r) =>
      r.event_name === 'checkout_start' || r.event_name === 'checkout_started'
    ).length;
    const paid = platformRows.filter((r) => r.event_name === 'paid_conversion').length;

    return {
      platform: platformId,
      clicks,
      landings,
      leads,
      checkouts,
      paid,
      lead_cr_pct: conversionRate(leads, landings || clicks || 1),
      paid_cr_pct: conversionRate(paid, checkouts || leads || 1)
    };
  }).filter((row) => row.clicks || row.landings || row.leads || row.checkouts || row.paid);
}

function loadPaidSpend(root) {
  const fs = require('fs');
  const path = require('path');
  const spendPath = path.join(root, 'data/growth/paid-spend.json');
  if (!fs.existsSync(spendPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(spendPath, 'utf8'));
  } catch {
    return null;
  }
}

function computeCacByPlatform(platformBreakdown, spendConfig) {
  if (!spendConfig?.platforms) return [];

  return platformBreakdown.map((row) => {
    const spend = Number(spendConfig.platforms[row.platform] || 0);
    const cacLead = row.leads ? Math.round(spend / row.leads) : null;
    const cacPaid = row.paid ? Math.round(spend / row.paid) : null;
    return {
      platform: row.platform,
      spend_try: spend,
      cac_per_lead_try: cacLead,
      cac_per_paid_try: cacPaid,
      leads: row.leads,
      paid: row.paid
    };
  });
}

module.exports = {
  computePaidPlatformBreakdown,
  computeCacByPlatform,
  loadPaidSpend
};
