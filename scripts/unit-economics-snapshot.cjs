#!/usr/bin/env node
'use strict';

/**
 * Export investor unit economics snapshot (CAC, LTV, ARPU, payback, margins).
 * Live: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * Planning-only: node scripts/unit-economics-snapshot.cjs --planning
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const planningOnly = process.argv.includes('--planning');
const outPath = path.join(root, 'dist', 'unit-economics-snapshot.json');

async function loadPaidSpend() {
  const spendPath = path.join(root, 'data/growth/paid-spend.json');
  if (!fs.existsSync(spendPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(spendPath, 'utf8'));
  } catch {
    return null;
  }
}

async function loadAssumptions() {
  const p = path.join(root, 'data/investor/unit-economics-model.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function main() {
  const assumptionsFile = await loadAssumptions();
  const { buildUnitEconomicsModel, mergeAssumptions } = await import(
    '../js/features/investor/unit-economics-model.js'
  );
  const { buildExecutiveDashboard } = await import(
    '../js/features/metrics/executive-dashboard.js'
  );
  const { buildInvestorSnapshot } = await import('../js/features/metrics/investor-kpis.js');

  let executive = null;
  let investor = null;
  let supportTickets = 0;

  if (!planningOnly) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or use --planning');
      process.exit(1);
    }

    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const windowDays = 30;
    const since = new Date(Date.now() - windowDays * 86400000).toISOString();

    const [subs, leads, events, supportEvents] = await Promise.all([
      sb.from('subscriptions').select('status, current_period_start, current_period_end, cancel_at_period_end').limit(2000),
      sb.from('auto_leads').select('lead_score, partner_status, estimated_revenue, actual_revenue, created_at').gte('created_at', since).limit(5000),
      sb.from('analytics_events').select('event_name, session_id, attribution, properties, revenue_cents, funnel, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(2500),
      sb.from('analytics_events').select('event_name').gte('created_at', since).in('event_name', ['support_ticket_submitted', 'support_escalation']).limit(500)
    ]);

    if (subs.error && subs.error.code !== '42P01') throw subs.error;
    if (leads.error) throw leads.error;
    if (events.error) throw events.error;

    const eventsData = events.data || [];
    investor = buildInvestorSnapshot({
      subscriptions: subs.data || [],
      leads: leads.data || [],
      analyticsEvents: eventsData
    });
    executive = buildExecutiveDashboard({
      analyticsEvents: eventsData,
      subscriptions: subs.data || [],
      autoLeads: leads.data || [],
      windowDays
    });
    supportTickets = (supportEvents.data || []).length;
  }

  const paidSpend = await loadPaidSpend();
  const assumptions = mergeAssumptions({
    ...assumptionsFile,
    pricing: { ...assumptionsFile.pricing },
    targets: { ...assumptionsFile.targets },
    variableCosts: { ...assumptionsFile.variableCosts },
    partnerEconomics: { ...assumptionsFile.partnerEconomics },
    fx: { ...assumptionsFile.fx }
  });

  const model = buildUnitEconomicsModel({
    windowDays: executive?.windowDays ?? 30,
    assumptions,
    executive,
    investor,
    paidSpend,
    supportTicketsInWindow: supportTickets
  });

  const payload = {
    mode: planningOnly ? 'planning' : 'live',
    investor,
    executive: executive
      ? {
          revenue: executive.revenue,
          churn: executive.churn,
          conversions: executive.conversions,
          pipeline: executive.pipeline,
          partnerLeadQuality: executive.partnerLeadQuality
        }
      : null,
    unitEconomics: model
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log('Wrote', outPath);
  console.log(JSON.stringify(model, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
