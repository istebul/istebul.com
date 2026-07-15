/**
 * PR-573 — Platform vs AI indexability contract (audit/test layer only).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('audit-seo enforces Platform root + AI Landing section split', () => {
  const audit = fs.readFileSync(path.join(root, 'scripts/audit-seo.cjs'), 'utf8');
  assert.match(audit, /id="platform-landing"/);
  assert.match(audit, /id="neden-istebul"/);
  assert.match(audit, /ai\/index\.html/);
  assert.match(audit, /id="hero-v4-title"/);
  assert.match(audit, /id="landing-faq"/);
  assert.match(audit, /must not host AI Landing section/);
  assert.match(audit, /https:\/\/www\.istebul\.com\/ai\//);
});

test('seo-indexability-report hard-fails on AI-root regression', () => {
  const report = fs.readFileSync(path.join(root, 'scripts/seo-indexability-report.cjs'), 'utf8');
  assert.match(report, /assertPlatformAiIndexabilityContract/);
  assert.match(report, /ai\/index\.html/);
  assert.match(report, /platform-landing/);
  assert.match(report, /neden-istebul/);
  assert.match(report, /landing-faq/);
  assert.match(report, /process\.exit\(1\)/);
});

test('live HTML matches EPIC-002 indexability surfaces', () => {
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const aiHtml = fs.readFileSync(path.join(root, 'ai/index.html'), 'utf8');

  assert.match(indexHtml, /id="platform-landing"/);
  assert.match(indexHtml, /id="neden-istebul"/);
  assert.doesNotMatch(indexHtml, /id="hero-v4-title"/);
  assert.doesNotMatch(indexHtml, /id="how-it-works"/);
  assert.doesNotMatch(indexHtml, /id="pricing"/);
  assert.doesNotMatch(indexHtml, /id="landing-faq"/);
  assert.doesNotMatch(indexHtml, /id="home"/);

  assert.match(aiHtml, /id="hero-v4-title"/);
  assert.match(aiHtml, /id="how-it-works"/);
  assert.match(aiHtml, /id="pricing"/);
  assert.match(aiHtml, /id="landing-faq"/);
});
