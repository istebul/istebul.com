import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url).pathname;

test('sigorta trackResults calls trackSigortaResultsView not analysis_started', async () => {
  const src = await readFile(`${root}js/sigorta/sigorta-app.js`, 'utf8');
  assert.match(src, /trackSigortaResultsView/);
  assert.match(src, /trackResults\(meta = \{\}\)\s*\{\s*return trackSigortaResultsView\(meta\)/);
  assert.doesNotMatch(src, /trackResults[\s\S]{0,120}trackSigortaAnalysisStarted\(\{ phase: 'results'/);
});

test('vertical-decision-app does not fire trackStart on init', async () => {
  const src = await readFile(`${root}js/vertical/vertical-decision-app.js`, 'utf8');
  assert.ok(src.includes('maybeFireWizardStart'));
  const initBlock = src.slice(src.indexOf('async function init()'), src.indexOf('function bootInit()'));
  assert.doesNotMatch(initBlock, /config\.tracker\.trackStart/);
});

test('vertical-decision-app fires wizard start on first interaction hooks', async () => {
  const src = await readFile(`${root}js/vertical/vertical-decision-app.js`, 'utf8');
  assert.match(src, /maybeFireWizardStart\('hero_cta'\)/);
  assert.match(src, /maybeFireWizardStart\('next_click'\)/);
  assert.match(src, /maybeFireWizardStart\('field_select'\)/);
  assert.ok(src.includes('wizardStartSessionKey'));
});

test('konut home_analysis_start is not fired on init', async () => {
  const src = await readFile(`${root}js/real-estate/real-estate-app.js`, 'utf8');
  const initBlock = src.slice(src.indexOf('async function init()'), src.indexOf('init();'));
  assert.doesNotMatch(initBlock, /trackEvent\('home_analysis_start'/);
  assert.ok(src.includes('maybeFireHomeAnalysisStart'));
});

test('konut fires home_wizard_complete on results render', async () => {
  const src = await readFile(`${root}js/real-estate/real-estate-app.js`, 'utf8');
  assert.match(src, /trackEvent\('home_wizard_complete'/);
  assert.match(src, /trackAnalysisCompleted\('konut'/);
});

test('tatil fires vacation_wizard_complete on showResults', async () => {
  const src = await readFile(`${root}js/tatil/tatil-app.js`, 'utf8');
  const showResultsBlock = src.slice(src.indexOf('async function showResults()'), src.indexOf('function renderResults()'));
  assert.match(showResultsBlock, /vacation_wizard_complete/);
  assert.match(showResultsBlock, /trackAnalysisCompleted\('tatil'/);
});

test('konut fires home_lead_open on partner CTA and lead form', async () => {
  const src = await readFile(`${root}js/real-estate/real-estate-app.js`, 'utf8');
  assert.match(src, /maybeFireHomeLeadOpen\('partner_cta'\)/);
  assert.match(src, /maybeFireHomeLeadOpen\('lead_form'\)/);
  assert.match(src, /trackEvent\('home_lead_open'/);
});

test('tatil fires vacation_lead_open on confirm and partner CTA', async () => {
  const src = await readFile(`${root}js/tatil/tatil-app.js`, 'utf8');
  assert.match(src, /maybeFireVacationLeadOpen\('confirm_selection'\)/);
  assert.match(src, /maybeFireVacationLeadOpen\('partner_cta'\)/);
  assert.match(src, /vacation_lead_open/);
});

test('tatil hero bypass fires vacation_start on first interaction', async () => {
  const src = await readFile(`${root}js/tatil/tatil-app.js`, 'utf8');
  assert.match(src, /maybeFireVacationStart\('next_click'\)/);
  assert.match(src, /maybeFireVacationStart\('field_select'\)/);
  const initBlock = src.slice(src.indexOf('async function init()'), src.indexOf('init();'));
  assert.doesNotMatch(initBlock, /vacation_start/);
});

test('kasko-app wires saveLead to saveKaskoLead instead of stub', async () => {
  const src = await readFile(`${root}js/kasko/kasko-app.js`, 'utf8');
  assert.match(src, /import[\s\S]*saveKaskoLead[\s\S]*from '\.\/kasko-intake\.js'/);
  assert.match(src, /saveLead:\s*saveKaskoLeadFromTracker/);
  assert.doesNotMatch(src, /saveLead:\s*\(\)\s*=>\s*Promise\.resolve\(\{\s*ok:\s*false\s*\}\)/);
});

test('kasko results v2 emits kasko_wizard_complete once per mount', async () => {
  const src = await readFile(`${root}js/features/kasko/kasko-results-v2.js`, 'utf8');
  assert.match(src, /trackKaskoWizardComplete/);
  assert.match(src, /if \(!hadV2Root\)/);
  assert.match(src, /trackKaskoResultsView/);
});

test('kasko analytics legacy map includes vertical event parity keys', async () => {
  const { LEGACY_TO_SITE_EVENT } = await import('../../js/platform/site-analytics.js');
  assert.equal(LEGACY_TO_SITE_EVENT.kasko_page_view, 'category_page_view');
  assert.equal(LEGACY_TO_SITE_EVENT.kasko_results_view, 'results_viewed');
  assert.equal(LEGACY_TO_SITE_EVENT.kasko_wizard_complete, 'analysis_completed');
  assert.equal(LEGACY_TO_SITE_EVENT.kasko_lead_submit, 'lead_submitted');
  assert.equal(LEGACY_TO_SITE_EVENT.insurance_lead_submit, 'lead_submitted');
});

test('platform analytics allowlist includes kasko and insurance lead events', async () => {
  const src = await readFile(`${root}supabase/functions/_shared/platform-analytics.ts`, 'utf8');
  for (const eventName of [
    'kasko_page_view',
    'kasko_results_view',
    'kasko_wizard_complete',
    'kasko_lead_submit',
    'insurance_lead_submit'
  ]) {
    assert.match(src, new RegExp(`"${eventName}"`));
  }
});

test('sigorta saveSigortaLead emits insurance_lead_submit on success', async () => {
  const src = await readFile(`${root}js/sigorta/sigorta-intake.js`, 'utf8');
  const saveBlock = src.slice(src.indexOf('export function saveSigortaLead'), src.indexOf('export async function trackSigortaStep'));
  assert.match(saveBlock, /if \(res\.ok\)/);
  assert.match(saveBlock, /trackAnalytics\('insurance_lead_submit'/);
});
