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
