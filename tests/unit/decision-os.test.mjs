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
    }
  });

  assert.match(html, /AI SON KARARI/);
  assert.match(html, /🟢/);
  assert.match(html, /AL/);
  assert.match(html, /Detaylı Analizi Aç/);
  assert.match(html, /data-dos-sticky/);
  assert.match(html, /tasarruf edebilirsiniz/);
  assert.match(html, /AI Gelecek Önerisi/);
  assert.match(html, /Karar Kalitesi/);
  assert.match(html, /What If/);
  assert.match(html, /data-dos-whatif-budget/);
  assert.doesNotMatch(html, /data-whatif-run/);
  assert.match(html, /Sizin Karar Karakteriniz/);
  assert.match(html, /🥇 En uygun/);
  assert.match(html, /Ben olsam/);
  assert.match(html, /Skor Şeffaflığı/);
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

test('tryMountDecisionOs returns null when disabled', async () => {
  setDecisionOsLocalOverride(false);
  const result = await tryMountDecisionOs({
    mountNode: createMountNode(),
    category: 'auto'
  });
  assert.equal(result, null);
  clearDecisionOsLocalOverride();
});
