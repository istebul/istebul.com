#!/usr/bin/env node
/**
 * Personalization v2 audit — score immutability and preference profile validation.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

let failed = 0;

function fail(msg) {
  console.error('FAIL:', msg);
  failed += 1;
}

function pass(msg) {
  console.log('PASS:', msg);
}

const engine = read('supabase/functions/_shared/ai-listings/personalization/personalization-engine.js');

if (!engine.includes('scoresUnchanged: true')) fail('scoresUnchanged flag missing');
else pass('scoresUnchanged flag present');

if (engine.includes('decisionScore =') || engine.includes('fit_score =')) {
  fail('Personalization engine mutates scores');
} else {
  pass('No score mutation in personalization engine');
}

const profile = read('supabase/functions/_shared/ai-listings/personalization/preference-profile-engine.js');
const requiredPrefs = [
  'lowRiskPreference',
  'costSensitivity',
  'qualitySensitivity',
  'familyUsagePreference',
  'cityUsagePreference',
  'comfortPreference',
  'performancePreference'
];

for (const pref of requiredPrefs) {
  if (!profile.includes(pref)) fail(`Missing preference: ${pref}`);
  else pass(`Preference: ${pref}`);
}

const cardBuilder = read('js/ai-personalization/preference-profile-card-builder.js');
if (!cardBuilder.includes('escapeHtml')) fail('Preference profile card builder not XSS-safe');
else pass('XSS-safe preference profile builder');

if (!cardBuilder.includes('Tercih Profili')) fail('Missing Turkish Tercih Profili label');
else pass('Tercih Profili label present');

console.log(`\nPersonalization audit errors: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
