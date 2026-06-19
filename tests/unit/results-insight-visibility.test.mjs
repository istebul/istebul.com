import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

const {
  INSIGHT_COMMENTARY_UNAVAILABLE,
  buildDecisionInsight,
  hydrateInsightBlocks,
  markInsightSummaryUnavailable,
  renderInsightBlocksHtml
} = await import('../../js/features/ai/ai-insight-engine.js');

const LONG_SUMMARY =
  'Bu uzun AI karar özeti metni kırpılmadan tam görünmelidir. '.repeat(12).trim();

test('renderInsightBlocksHtml renders all insight sections for category results', () => {
  const insight = buildDecisionInsight({
    vertical: 'konut',
    answers: { city: 'İstanbul' },
    scores: { decision: 72, confidence: 68, overallRisk: 'Orta' }
  });
  const html = renderInsightBlocksHtml(insight, (s) => s);

  assert.match(html, /data-insight-summary/);
  assert.match(html, /data-insight-why/);
  assert.match(html, /data-insight-risk/);
  assert.match(html, /data-insight-next/);
  assert.match(html, /data-insight-fallback-notice/);
  assert.match(html, /AI karar özeti/);
  assert.match(html, /Neden bu sonuç/);
  assert.match(html, /Sonraki en iyi adım/);
});

test('renderInsightBlocksHtml keeps long AI commentary without truncation', () => {
  const insight = {
    summary: LONG_SUMMARY,
    why: LONG_SUMMARY,
    risk: 'Risk metni tam görünür.',
    nextStep: 'Sonraki adım metni tam görünür.',
    disclaimer: 'Bilgilendirme amaçlıdır.'
  };
  const html = renderInsightBlocksHtml(insight, (s) => s);

  assert.ok(html.includes(LONG_SUMMARY));
  assert.equal((html.match(new RegExp(LONG_SUMMARY, 'g')) || []).length, 2);
});

test('hydrateInsightBlocks writes full text into DOM nodes', () => {
  const host = {
    nodes: {},
    querySelector(sel) {
      return this.nodes[sel] || null;
    }
  };
  ['[data-insight-summary]', '[data-insight-why]', '[data-insight-risk]', '[data-insight-next]'].forEach(
    (sel) => {
      host.nodes[sel] = { textContent: '' };
    }
  );
  host.nodes['.ib-insight-blocks__disclaimer'] = { textContent: '' };
  host.nodes['[data-insight-fallback-notice]'] = { hidden: false, textContent: '' };

  hydrateInsightBlocks(host, {
    summary: LONG_SUMMARY,
    why: 'Neden metni',
    risk: 'Risk metni',
    nextStep: 'Adım metni',
    disclaimer: 'Uyarı'
  });

  assert.equal(host.nodes['[data-insight-summary]'].textContent, LONG_SUMMARY);
  assert.equal(host.nodes['[data-insight-why]'].textContent, 'Neden metni');
  assert.equal(host.nodes['[data-insight-fallback-notice]'].hidden, true);
});

test('markInsightSummaryUnavailable shows fallback instead of hiding AI panel', () => {
  const host = {
    nodes: {},
    querySelector(sel) {
      return this.nodes[sel] || null;
    }
  };
  host.nodes['[data-insight-fallback-notice]'] = { hidden: true, textContent: '' };
  host.nodes['[data-insight-summary]'] = { textContent: '—' };
  host.nodes['[data-konut-v2-exec-text]'] = { textContent: 'Yorum hazırlanıyor…' };
  host.nodes['[data-konut-v2-source]'] = { textContent: '' };

  markInsightSummaryUnavailable(host, {
    execTextSelector: '[data-konut-v2-exec-text]',
    sourceSelector: '[data-konut-v2-source]',
    forceExecText: true
  });

  assert.equal(host.nodes['[data-insight-fallback-notice]'].hidden, false);
  assert.equal(host.nodes['[data-insight-fallback-notice]'].textContent, INSIGHT_COMMENTARY_UNAVAILABLE);
  assert.equal(host.nodes['[data-konut-v2-exec-text]'].textContent, INSIGHT_COMMENTARY_UNAVAILABLE);
  assert.match(host.nodes['[data-konut-v2-source]'].textContent, /Kural tabanlı/);
});

test('shared enterprise CSS exposes full-render rules for insight blocks', () => {
  const css = readFileSync(join(root, 'css/enterprise-card-readability.css'), 'utf8');
  assert.match(css, /\.ib-insight-blocks\b/);
  assert.match(css, /\.ib-insight-blocks__text/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /-webkit-line-clamp:\s*unset/);
});

test('auto results no longer slice executive summary text in source', () => {
  const autoSource = readFileSync(join(root, 'js/auto/auto-results-v2.js'), 'utf8');
  assert.doesNotMatch(autoSource, /summary\.text\)\.slice\(0,\s*280\)/);
  assert.doesNotMatch(autoSource, /aiSummary \|\| ''\)\)\.slice\(0,\s*280\)/);
});
