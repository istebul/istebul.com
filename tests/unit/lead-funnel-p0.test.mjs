import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const { buildUnifiedFunnelMetrics } = await import('../../js/admin/unified-funnel-dashboard.js');
const { LEGACY_TO_SITE_EVENT } = await import('../../js/platform/site-analytics.js');
const { createVerticalTracker } = await import('../../js/vertical/vertical-intake.js');

test('buildUnifiedFunnelMetrics includes kasko results and leads', () => {
  const rows = [
    { event_type: 'kasko_page_view', session_id: 'k1' },
    { event_type: 'kasko_results_view', session_id: 'k1' },
    { event_type: 'kasko_wizard_complete', session_id: 'k1' },
    { event_type: 'kasko_lead_submit', session_id: 'k1' }
  ];
  const metrics = buildUnifiedFunnelMetrics(rows);
  const kasko = metrics.find((m) => m.id === 'kasko');
  assert.ok(kasko);
  assert.ok(kasko.visits >= 1);
  assert.ok(kasko.results >= 2);
  assert.ok(kasko.leads >= 1);
});

test('buildUnifiedFunnelMetrics counts insurance_lead_submit for sigorta', () => {
  const rows = [
    { event_name: 'insurance_page_view', session_id: 's1' },
    { event_name: 'insurance_results_view', session_id: 's1' },
    { event_name: 'insurance_lead_submit', session_id: 's1' }
  ];
  const metrics = buildUnifiedFunnelMetrics(rows);
  const sigorta = metrics.find((m) => m.id === 'sigorta');
  assert.ok(sigorta);
  assert.ok(sigorta.leads >= 1);
});

test('buildUnifiedFunnelMetrics counts vacation lead funnel events', () => {
  const rows = [
    { event_type: 'vacation_start', session_id: 't1' },
    { event_type: 'vacation_results_view', session_id: 't1' },
    { event_type: 'vacation_lead_submit', session_id: 't1' }
  ];
  const metrics = buildUnifiedFunnelMetrics(rows);
  const tatil = metrics.find((m) => m.id === 'tatil');
  assert.ok(tatil);
  assert.ok(tatil.visits >= 1);
  assert.ok(tatil.results >= 1);
  assert.ok(tatil.leads >= 1);
});

test('LEGACY_TO_SITE_EVENT maps print clicks and kasko events to canonical names', () => {
  assert.equal(LEGACY_TO_SITE_EVENT.decision_report_print_click, 'pdf_downloaded');
  assert.equal(LEGACY_TO_SITE_EVENT.finance_report_print_click, 'pdf_downloaded');
  assert.equal(LEGACY_TO_SITE_EVENT.travel_report_print_click, 'pdf_downloaded');
  assert.equal(LEGACY_TO_SITE_EVENT.kasko_wizard_complete, 'analysis_completed');
  assert.equal(LEGACY_TO_SITE_EVENT.kasko_lead_submit, 'lead_submitted');
  assert.equal(LEGACY_TO_SITE_EVENT.insurance_lead_submit, 'lead_submitted');
  assert.equal(LEGACY_TO_SITE_EVENT.vacation_lead_open, 'lead_form_opened');
});

test('createVerticalTracker(kasko) exposes kasko funnel event names', () => {
  const tracker = createVerticalTracker('kasko');
  assert.equal(tracker.events.startEvent, 'kasko_analysis_started');
  assert.equal(tracker.events.resultsEvent, 'kasko_results_view');
  assert.equal(tracker.events.leadEvent, 'kasko_lead_submit');
  assert.equal(tracker.events.wizardCompleteEvent, 'kasko_wizard_complete');
  assert.equal(tracker.events.pageViewEvent, 'kasko_page_view');
  assert.equal(typeof tracker.trackWizardComplete, 'function');
  assert.equal(typeof tracker.trackPageView, 'function');
});

test('vertical-decision-app uses trackAnalysisCompleted on wizard complete', () => {
  const src = readFileSync(join(root, 'js/vertical/vertical-decision-app.js'), 'utf8');
  assert.match(src, /trackAnalysisCompleted\(siteCategory, \{ phase: 'wizard_complete' \}\)/);
  assert.doesNotMatch(src, /trackAnalysisStarted\(siteCategory, \{ phase: 'wizard_complete' \}\)/);
});

test('kasko-intake edge function allowlist includes required events', () => {
  const src = readFileSync(join(root, 'supabase/functions/kasko-intake/index.ts'), 'utf8');
  for (const event of [
    'kasko_page_view',
    'kasko_analysis_started',
    'kasko_wizard_complete',
    'kasko_results_view',
    'kasko_lead_submit'
  ]) {
    assert.match(src, new RegExp(`"${event}"`));
  }
});

test('platform analytics allowlist includes remediation events', () => {
  const src = readFileSync(join(root, 'supabase/functions/_shared/platform-analytics.ts'), 'utf8');
  for (const event of [
    'kasko_page_view',
    'insurance_lead_submit',
    'vacation_start',
    'vacation_lead_submit',
    'vacation_lead_open',
    'decision_report_print_click',
    'finance_report_print_click',
    'travel_report_print_click'
  ]) {
    assert.match(src, new RegExp(`"${event}"`));
  }
});
