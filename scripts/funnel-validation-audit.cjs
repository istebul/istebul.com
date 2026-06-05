#!/usr/bin/env node
/**
 * Funnel validation audit — compares event counts across analytics_events,
 * vertical *_events tables, *_leads tables, and dashboard alias expectations.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/funnel-validation-audit.cjs
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/funnel-validation-audit.cjs --days=7
 */
const { createClient } = require('@supabase/supabase-js');

const DAYS = Number(process.argv.find((a) => a.startsWith('--days='))?.split('=')[1] || 7);

const FUNNEL_STEPS = [
  { key: 'page_view', aliases: ['category_page_view', 'page_view'] },
  { key: 'wizard_start', aliases: ['analysis_started'] },
  { key: 'wizard_complete', aliases: ['analysis_completed'] },
  { key: 'results_view', aliases: ['results_viewed'] },
  { key: 'pdf_click', aliases: ['pdf_downloaded'] },
  { key: 'lead_open', aliases: ['lead_form_opened'] },
  { key: 'lead_submit', aliases: ['lead_submitted', 'lead_submit'] }
];

const VERTICALS = [
  {
    id: 'auto',
    label: 'Auto',
    category: 'auto',
    eventsTable: 'auto_events',
    eventsField: 'event_name',
    leadsTable: 'auto_leads',
    legacyEvents: {
      page_view: ['auto_page_view'],
      wizard_start: ['auto_form_started', 'auto_analysis_started'],
      wizard_complete: ['auto_wizard_complete', 'auto_form_submitted'],
      results_view: ['auto_results_rendered', 'auto_results_view'],
      pdf_click: ['decision_report_print_click'],
      lead_open: ['auto_modal_open'],
      lead_submit: ['lead_submit', 'auto_lead_submit']
    },
    unifiedFunnel: {
      visit: ['auto_page_view', 'auto_form_started'],
      results: ['auto_results_rendered', 'auto_form_submitted'],
      lead: ['auto_lead_submit', 'lead_submit']
    }
  },
  {
    id: 'konut',
    label: 'Konut',
    category: 'konut',
    eventsTable: 'housing_events',
    eventsField: 'event_type',
    leadsTable: 'housing_leads',
    legacyEvents: {
      page_view: ['housing_page_view'],
      wizard_start: ['home_analysis_start'],
      wizard_complete: [],
      results_view: ['home_results_view'],
      pdf_click: ['decision_report_print_click'],
      lead_open: [],
      lead_submit: ['home_lead_submit']
    },
    unifiedFunnel: {
      visit: ['housing_page_view', 'home_analysis_start'],
      results: ['home_results_view'],
      lead: ['home_lead_submit']
    }
  },
  {
    id: 'finans',
    label: 'Finansman',
    category: 'finansman',
    eventsTable: 'vertical_events',
    eventsField: 'event_type',
    leadsTable: 'vertical_leads',
    verticalFilter: 'finans',
    legacyEvents: {
      page_view: ['finance_page_view'],
      wizard_start: ['finans_start', 'finance_funnel_start'],
      wizard_complete: ['finance_funnel_complete'],
      results_view: ['finans_results_view', 'finance_results_view'],
      pdf_click: ['finance_report_print_click'],
      lead_open: ['finans_selection_confirmed'],
      lead_submit: ['finans_lead_submit']
    },
    unifiedFunnel: {
      visit: ['finans_start', 'finance_page_view', 'finance_funnel_start', 'category_page_view'],
      results: ['finans_results_view', 'finance_results_view', 'results_viewed'],
      lead: ['finans_lead_submit', 'lead_submitted']
    }
  },
  {
    id: 'tatil',
    label: 'Tatil',
    category: 'tatil',
    eventsTable: 'vacation_events',
    eventsField: 'event_type',
    leadsTable: 'vacation_leads',
    legacyEvents: {
      page_view: ['vacation_page_view'],
      wizard_start: ['vacation_start'],
      wizard_complete: [],
      results_view: ['vacation_results_view'],
      pdf_click: ['travel_report_print_click'],
      lead_open: ['vacation_lead_open'],
      lead_submit: ['vacation_lead_submit']
    },
    unifiedFunnel: {
      visit: ['vacation_start', 'vacation_page_view'],
      results: ['vacation_results_view'],
      lead: ['vacation_lead_submit']
    }
  },
  {
    id: 'sigorta',
    label: 'Sigorta',
    category: 'sigorta',
    eventsTable: 'sigorta_events',
    eventsField: 'event_type',
    leadsTable: 'sigorta_leads',
    legacyEvents: {
      page_view: ['insurance_page_view'],
      wizard_start: ['insurance_analysis_started'],
      wizard_complete: [],
      results_view: ['insurance_results_view'],
      pdf_click: ['decision_report_print_click', 'insurance_pdf_download'],
      lead_open: ['insurance_interest'],
      lead_submit: ['insurance_lead_submit']
    },
    unifiedFunnel: {
      visit: ['insurance_page_view', 'category_page_view'],
      results: ['insurance_results_view', 'results_viewed'],
      lead: ['insurance_lead_submit', 'lead_submitted', 'insurance_interest']
    }
  },
  {
    id: 'kasko',
    label: 'Kasko',
    category: 'kasko',
    eventsTable: 'kasko_events',
    eventsField: 'event_type',
    leadsTable: 'kasko_leads',
    legacyEvents: {
      page_view: ['kasko_page_view'],
      wizard_start: ['kasko_analysis_started'],
      wizard_complete: ['kasko_wizard_complete'],
      results_view: ['kasko_results_view'],
      pdf_click: ['decision_report_print_click', 'kasko_pdf_download'],
      lead_open: [],
      lead_submit: ['kasko_lead_submit']
    },
    unifiedFunnel: {
      visit: ['kasko_page_view', 'category_page_view'],
      results: ['kasko_results_view', 'kasko_wizard_complete', 'results_viewed'],
      lead: ['kasko_lead_submit', 'lead_submitted']
    }
  }
];

const UNIFIED_SOURCES = new Set(['analytics_events', 'housing_events', 'vacation_events', 'kasko_events', 'sigorta_events']);
const PLATFORM_SOURCES = new Set(['analytics_events']);

function sinceIso(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function countRows(client, table, since, { field, names, category, verticalFilter } = {}) {
  if (!names?.length) return 0;
  let query = client.from(table).select('*', { count: 'exact', head: true }).gte('created_at', since);
  if (field && names.length === 1) {
    query = query.eq(field, names[0]);
  } else if (field) {
    query = query.in(field, names);
  }
  if (verticalFilter && table === 'vertical_events') {
    query = query.eq('vertical', verticalFilter);
  }
  const { count, error } = await query;
  if (error) {
    return { error: error.message };
  }
  return count || 0;
}

async function countLeads(client, table, since) {
  const { count, error } = await client
    .from(table)
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since);
  if (error) return { error: error.message };
  return count || 0;
}

async function countAnalyticsCanonical(client, since, canonicalNames, category) {
  const results = {};
  for (const name of canonicalNames) {
    let query = client
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since)
      .eq('event_name', name);
    const { count, error } = await query;
    if (error) {
      results[name] = { error: error.message };
      continue;
    }
    results[name] = count || 0;
  }
  return results;
}

function fmt(val) {
  if (val && typeof val === 'object' && val.error) return `ERR:${val.error}`;
  return String(val ?? 0);
}

function status(analytics, intake, expected) {
  if (expected === 0 && analytics === 0 && intake === 0) return 'MISSING';
  if (analytics > 0 && intake > 0 && Math.abs(analytics - intake) > Math.max(analytics, intake) * 0.5) {
    return 'MISMATCH';
  }
  if (analytics > 0 || intake > 0) return 'PRESENT';
  return 'MISSING';
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const client = createClient(url, key);
  const since = sinceIso(DAYS);
  console.log(`\n=== Funnel Validation Audit (last ${DAYS} days, since ${since}) ===\n`);

  const issues = [];

  for (const v of VERTICALS) {
    console.log(`\n## ${v.label} (${v.id})`);
    const leadCount = await countLeads(client, v.leadsTable, since);
    console.log(`  leads (${v.leadsTable}): ${fmt(leadCount)}`);

    for (const step of FUNNEL_STEPS) {
      const legacy = v.legacyEvents[step.key] || [];
      const canonical = step.aliases;

      const analyticsCount = legacy.length
        ? await countRows(client, 'analytics_events', since, { field: 'event_name', names: [...legacy, ...canonical] })
        : await countRows(client, 'analytics_events', since, { field: 'event_name', names: canonical });

      const intakeCount = legacy.length
        ? await countRows(client, v.eventsTable, since, {
            field: v.eventsField,
            names: legacy,
            verticalFilter: v.verticalFilter
          })
        : 0;

      const st = status(
        typeof analyticsCount === 'number' ? analyticsCount : 0,
        typeof intakeCount === 'number' ? intakeCount : 0,
        legacy.length
      );

      console.log(
        `  ${step.key.padEnd(16)} analytics=${fmt(analyticsCount).padStart(5)}  intake=${fmt(intakeCount).padStart(5)}  [${st}]`
      );

      if (st === 'MISSING' && legacy.length) {
        issues.push(`${v.label}.${step.key}: no events in last ${DAYS}d`);
      }
      if (st === 'MISMATCH') {
        issues.push(`${v.label}.${step.key}: analytics/intake count divergence >50%`);
      }

      if (!UNIFIED_SOURCES.has(v.eventsTable) && intakeCount > 0 && step.key !== 'lead_submit') {
        issues.push(`${v.label}: ${v.eventsTable} not loaded by Unified Funnel dashboard`);
      }
      if (!PLATFORM_SOURCES.has(v.eventsTable) && intakeCount > 0) {
        /* intake-only events invisible to Platform Analytics unless mirrored to canonical */
      }
    }
  }

  console.log('\n=== Dashboard source coverage ===');
  console.log('Platform Analytics: analytics_events only');
  console.log('Unified Funnel: analytics_events + housing_events + vacation_events + kasko_events + sigorta_events');
  console.log('Missing from Unified Funnel loaders: vertical_events (finans), auto_events');

  if (issues.length) {
    console.log('\n=== Issues ===');
    [...new Set(issues)].forEach((i) => console.log(`  - ${i}`));
  } else {
    console.log('\nNo critical count mismatches detected in queried window.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
