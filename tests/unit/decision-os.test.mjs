import test from 'node:test';
import assert from 'node:assert/strict';

const { isDecisionOsEnabled, setDecisionOsLocalOverride, clearDecisionOsLocalOverride } =
  await import('../../js/decision/decision-os-flags.js');
const { mapVerdict, buildDecisionOsModel } = await import(
  '../../js/decision/decision-os-mappers.js'
);
const { renderDecisionOsPanel } = await import('../../js/decision/decision-os-renderer.js');
const { tryMountDecisionOs } = await import('../../js/decision/decision-os-engine.js');
const { buildLinkedInSummaryText, renderDecisionOsReportHtml } = await import(
  '../../js/decision/decision-os-report.js'
);
const {
  loadDecisionTimeline,
  saveDecisionTimelineEntry,
  renderDecisionTimelineHtml
} = await import('../../js/decision/decision-os-timeline.js');
const { buildTurkeyBenchmark } = await import('../../js/decision/decision-os-benchmark.js');
const { buildShareCardText } = await import('../../js/decision/decision-os-share.js');
const { buildDecisionIntelligenceResult } = await import(
  '../../js/features/results/decision-intelligence-engine.js'
);

function createMountNode() {
  const nodes = [];
  return {
    nodes,
    querySelector(selector) {
      for (const node of nodes) {
        if (node.matches?.(selector)) return node;
        const nested = node.querySelector?.(selector);
        if (nested) return nested;
      }
      return null;
    },
    prepend(node) {
      nodes.unshift(node);
    },
    setAttribute() {},
    getAttribute() {
      return null;
    }
  };
}

function createDomNode({ className = '', innerHTML = '' } = {}) {
  const childNodes = [];
  const listeners = {};
  const node = {
    className,
    innerHTML,
    childNodes,
    hidden: false,
    style: {},
    rel: '',
    href: '',
    setAttribute(name, value) {
      this[name] = value;
      this[`data-${name}`] = value;
    },
    getAttribute(name) {
      return this[name] ?? null;
    },
    remove() {},
    matches(selector) {
      if (selector.startsWith('.')) {
        return className.split(/\s+/).includes(selector.slice(1));
      }
      if (selector.startsWith('[data-')) {
        const attr = selector.slice(1, -1);
        return innerHTML.includes(attr) || this[attr] != null;
      }
      return false;
    },
    querySelector(selector) {
      if (selector.startsWith('[data-') && innerHTML.includes(selector.slice(1, -1))) {
        return createDomNode();
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-dos-accordion]' && innerHTML.includes('data-dos-accordion')) {
        return [createDomNode()];
      }
      return [];
    },
    addEventListener(type, fn) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    },
    appendChild(child) {
      childNodes.push(child);
    }
  };
  return node;
}

test('mapVerdict maps recommendation levels to AL/BEKLE/ALMA', () => {
  assert.equal(mapVerdict('proceed').label, 'AL');
  assert.equal(mapVerdict('proceed').color, '#16A34A');
  assert.equal(mapVerdict('wait').label, 'BEKLE');
  assert.equal(mapVerdict('wait').color, '#F59E0B');
  assert.equal(mapVerdict('avoid').label, 'ALMA');
  assert.equal(mapVerdict('avoid').color, '#DC2626');
});

test('buildDecisionOsModel produces conversational AI and Turkey benchmark', () => {
  const intelligence = buildDecisionIntelligenceResult(
    'auto',
    { budget: 900_000, usage: 'city' },
    { totalCost: 900_000 }
  );
  const model = buildDecisionOsModel(intelligence, {
    vertical: 'auto',
    totalCost: 900_000
  });

  assert.ok(model.aiCommentary.paragraphs?.length >= 1);
  assert.match(model.aiCommentary.paragraphs[0], /Ben olsam|Şimdilik beklemek|almazdım/);
  assert.ok(model.turkeyBenchmark?.turkey?.score >= 0);
  assert.ok(model.proInsights?.length >= 7);
  assert.ok(model.todaySavings != null || model.savings?.todayAmount != null);
});

test('buildDecisionOsModel produces hero reasons and risks', () => {
  const intelligence = buildDecisionIntelligenceResult(
    'konut',
    { city: 'İzmir', totalBudget: 3_500_000, purchasePurpose: 'Oturmak' },
    { dti: 32 }
  );
  const model = buildDecisionOsModel(intelligence, {
    vertical: 'konut',
    totalCost: 3_500_000,
    strengths: ['Bütçe uyumu güçlü'],
    cautions: ['Likidite riski']
  });

  assert.ok(model.verdict);
  assert.ok(model.whyReasons.length >= 1);
  assert.ok(model.risks.length >= 1);
  assert.equal(model.vertical, 'konut');
  assert.ok(model.decisionScore >= 0 && model.decisionScore <= 100);
});

test('renderDecisionOsPanel includes hero, accordions, sticky and savings', () => {
  const html = renderDecisionOsPanel({
    vertical: 'auto',
    title: 'Test',
    verdict: mapVerdict('proceed'),
    decisionScore: 88,
    confidencePercent: 92,
    confidenceScore: 92,
    whyReasons: ['Neden 1'],
    risks: ['Risk 1'],
    savings: { amount: 120_000, years: 5, rate: 0.08 },
    crossDecision: { from: 'Araç', to: 'Konut', message: 'test' },
    decisionQuality: { score: 85, label: 'Güçlü', summary: 'Özet' },
    dataQuality: { score: 70, label: 'Orta', notes: ['3 faktör'] },
    actionPlan: ['Adım 1'],
    riskRadar: [],
    scoreFactors: [],
    profile: { cards: [{ icon: '💰', label: 'Tasarruf' }], aiComment: 'Yorum' },
    alternatives: [{ badge: '🥇 En uygun', title: 'Alt 1', score: 80, summary: 'Özet' }],
    aiCommentary: {
      preferLead: 'Ben olsam',
      preferReasons: ['A'],
      waitLead: 'Bekle',
      waitReasons: ['B']
    },
    whatIfInput: {
      category: 'auto',
      formData: { budget: 900_000 },
      metrics: { totalCost: 900_000 },
      extras: { totalCost: 900_000 }
    },
    turkeyBenchmark: buildTurkeyBenchmark({ vertical: 'auto', decisionScore: 88, confidenceScore: 92 }),
    todaySavings: 19_200,
    proInsights: [
      { id: '12m', label: '12 ay senaryo', locked: true },
      { id: '36m', label: '36 ay senaryo', locked: true },
      { id: '60m', label: '60 ay senaryo', locked: true },
      { id: 'rate', label: 'Faiz değişirse', locked: true },
      { id: 'fx', label: 'Kur değişirse', locked: true },
      { id: 'best-alt', label: 'En iyi alternatif', locked: true },
      { id: 'sensitivity', label: 'Kritik değişken analizi', locked: true }
    ],
    timeline: [
      {
        id: 't1',
        vertical: 'auto',
        icon: '🚗',
        label: 'Araç',
        verdict: 'AL',
        verdictEmoji: '🟢',
        decisionScore: 88,
        confidencePercent: 92,
        createdAt: '2026-01-15T10:00:00.000Z'
      }
    ]
  });

  assert.match(html, /AI SON KARARI/);
  assert.match(html, /🟢/);
  assert.match(html, /AL/);
  assert.match(html, /Detaylı Analizi Aç/);
  assert.match(html, /data-dos-sticky/);
  assert.match(html, /tasarruf sağlayabilir/);
  assert.match(html, /AI Gelecek Önerisi/);
  assert.match(html, /Neden önerildi/);
  assert.match(html, /Riskler/);
  assert.match(html, /What-if/);
  assert.match(html, /data-dos-whatif-budget/);
  assert.doesNotMatch(html, /data-whatif-run/);
  assert.match(html, /Karar Profili/);
  assert.match(html, /Türkiye Ort/);
  assert.match(html, /🥇 En uygun/);
  assert.match(html, /Kartı Paylaş/);
  assert.match(html, /Karar Geçmişim/);
  assert.match(html, /Pro Insights/);
  assert.match(html, /12 ay senaryo/);
  assert.match(html, /En önemli 3 neden/);
  assert.match(html, /Detay/);
  assert.doesNotMatch(html, /Tam Analiz/);
});

test('renderDecisionOsPanel accordions are closed by default', () => {
  const html = renderDecisionOsPanel({
    vertical: 'konut',
    verdict: mapVerdict('wait'),
    decisionScore: 60,
    confidencePercent: 70,
    whyReasons: ['A'],
    risks: ['B'],
    decisionQuality: { score: 60, label: 'Orta', summary: '' },
    dataQuality: { score: 60, label: 'Orta', notes: [] },
    actionPlan: [],
    riskRadar: [],
    scoreFactors: [],
    profile: { cards: [], aiComment: '' },
    alternatives: [],
    aiCommentary: { preferLead: '', preferReasons: [], waitLead: '', waitReasons: [] },
    crossDecision: { from: 'Konut', to: 'Finansman', message: 'test' }
  });

  assert.doesNotMatch(html, /<details[^>]*open/);
  assert.match(html, /data-dos-accordions[^>]*hidden/);
});

test('premium report renders PDF-like HTML and LinkedIn summary', () => {
  const report = {
    title: 'Konut Kararı',
    verticalLabel: 'Konut',
    verdict: 'AL',
    verdictEmoji: '🟢',
    summary: 'Özet metin',
    generatedAt: new Date().toISOString(),
    scores: { decisionScore: 85, confidenceScore: 90, riskScore: 30, decisionQualityScore: 82 },
    totalCost: 3_000_000,
    topRisks: ['Risk A'],
    actionPlan: ['Adım 1'],
    disclaimer: 'Bilgilendirme'
  };

  const html = renderDecisionOsReportHtml(report);
  assert.match(html, /isteBul · Decision OS/);
  assert.match(html, /@page/);
  assert.match(html, /🟢 AL/);

  const linkedIn = buildLinkedInSummaryText(report);
  assert.match(linkedIn, /#isteBul/);
  assert.match(linkedIn, /AI Kararı: AL/);
});

test('isDecisionOsEnabled respects local override', () => {
  clearDecisionOsLocalOverride();
  setDecisionOsLocalOverride(false);
  assert.equal(isDecisionOsEnabled(), false);
  setDecisionOsLocalOverride(true);
  assert.equal(isDecisionOsEnabled(), true);
  clearDecisionOsLocalOverride();
});

test('tryMountDecisionOs mounts panel when enabled', async () => {
  setDecisionOsLocalOverride(true);
  const mountNode = createMountNode();

  global.document = {
    querySelector() {
      return null;
    },
    createElement() {
      return createDomNode();
    },
    head: { appendChild() {} }
  };
  global.window = {
    setTimeout(fn) {
      return fn();
    },
    clearTimeout() {},
    matchMedia() {
      return { matches: false };
    },
    addEventListener() {}
  };
  global.requestIdleCallback = (fn) => fn();

  const result = await tryMountDecisionOs({
    mountNode,
    category: 'konut',
    formData: { city: 'İzmir', totalBudget: 3_000_000 },
    metrics: { dti: 28 }
  });

  assert.ok(result);
  assert.ok(result.model);
  assert.equal(mountNode.nodes.length, 1);
  assert.match(mountNode.nodes[0].innerHTML, /data-decision-os-root/);
});

test('timeline persists entries in memory storage', () => {
  const storage = new Map();
  const mockStorage = {
    getItem(key) {
      return storage.get(key) ?? null;
    },
    setItem(key, value) {
      storage.set(key, value);
    }
  };

  saveDecisionTimelineEntry(
    { vertical: 'auto', verdict: 'AL', verdictEmoji: '🟢', decisionScore: 85, confidencePercent: 90 },
    mockStorage
  );
  const entries = loadDecisionTimeline(mockStorage);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].label, 'Araç');
  assert.match(renderDecisionTimelineHtml(entries), /🚗/);
});

test('buildTurkeyBenchmark returns deterministic comparison', () => {
  const bench = buildTurkeyBenchmark({ vertical: 'konut', decisionScore: 72, confidenceScore: 80 });
  assert.equal(bench.user.score, 72);
  assert.ok(bench.turkey.score >= 50 && bench.turkey.score <= 100);
  assert.equal(bench.diff.score, 72 - bench.turkey.score);
});

test('buildShareCardText includes verdict and scores', () => {
  const text = buildShareCardText({
    verdict: { label: 'AL', emoji: '🟢' },
    decisionScore: 88,
    confidencePercent: 92
  });
  assert.match(text, /isteBul AI/);
  assert.match(text, /AL/);
  assert.match(text, /88\/100/);
});

test('tryMountDecisionOs returns null when disabled', async () => {
  setDecisionOsLocalOverride(false);
  const result = await tryMountDecisionOs({
    mountNode: createMountNode(),
    category: 'auto'
  });
  assert.equal(result, null);
  clearDecisionOsLocalOverride();
});
