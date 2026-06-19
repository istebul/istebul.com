import test from 'node:test';
import assert from 'node:assert/strict';

const {
  tryMountDecisionEngineV3,
  renderDecisionV3Panel,
  simulateWhatIfChange
} = await import('../../js/decision/ai-decision-engine-v3.js');
const { buildDecisionIntelligenceResult } = await import(
  '../../js/features/results/decision-intelligence-engine.js'
);

function createMemoryStorage() {
  /** @type {Record<string, string>} */
  const store = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    }
  };
}

function createMountNode() {
  const nodes = [];
  return {
    nodes,
    querySelector(selector) {
      for (const node of nodes) {
        if (node.matches(selector)) return node;
        const nested = node.querySelector(selector);
        if (nested) return nested;
      }
      return null;
    },
    prepend(node) {
      nodes.unshift(node);
    }
  };
}

function createDomNode({ className = '', innerHTML = '' } = {}) {
  const childNodes = [];
  const node = {
    className,
    innerHTML,
    childNodes,
    rel: '',
    href: '',
    setAttribute(name, value) {
      this[name] = value;
    },
    remove() {
      const parent = childNodes.length ? null : node;
      if (parent) {
        const index = childNodes.indexOf(node);
        if (index >= 0) childNodes.splice(index, 1);
      }
    },
    matches(selector) {
      if (selector.startsWith('.')) {
        return className.split(/\s+/).includes(selector.slice(1));
      }
      if (selector.startsWith('[data-')) {
        const attr = selector.slice(1, -1);
        return innerHTML.includes(attr);
      }
      return false;
    },
    querySelector(selector) {
      if (selector.startsWith('[data-') && innerHTML.includes(selector.slice(1, -1))) {
        return {};
      }
      return null;
    }
  };
  return node;
}

test('tryMountDecisionEngineV3 returns null without mount node', async () => {
  const result = await tryMountDecisionEngineV3({ category: 'konut' });
  assert.equal(result, null);
});

test('tryMountDecisionEngineV3 mounts panel and enriches with memory-lite', async () => {
  const mountNode = createMountNode();
  const storage = createMemoryStorage();
  global.document = {
    querySelector() {
      return null;
    },
    createElement() {
      return createDomNode();
    },
    head: {
      appendChild() {}
    }
  };

  const result = await tryMountDecisionEngineV3({
    mountNode,
    category: 'konut',
    formData: { city: 'İzmir', totalBudget: 3_500_000, purchasePurpose: 'Oturmak' },
    metrics: { dti: 32 },
    storage
  });

  assert.ok(result);
  assert.ok(result.intelligence);
  assert.equal(result.memory.version, 'memory-lite-v1');
  assert.equal(mountNode.nodes.length, 1);
  assert.match(mountNode.nodes[0].innerHTML, /data-decision-v3-root/);
  assert.match(mountNode.nodes[0].innerHTML, /data-decision-memory-lite/);
  assert.match(mountNode.nodes[0].innerHTML, /Karar Profiliniz/);
  assert.match(mountNode.nodes[0].innerHTML, /Senaryo Simülasyonu/);
  assert.match(mountNode.nodes[0].innerHTML, /data-whatif-run/);
  assert.match(mountNode.nodes[0].innerHTML, /Karar Raporu/);
  assert.match(mountNode.nodes[0].innerHTML, /data-report-download/);
  assert.match(mountNode.nodes[0].innerHTML, /data-report-copy/);
});

test('renderDecisionV3Panel places memory profile after action plan', () => {
  const html = renderDecisionV3Panel({
    vertical: 'auto',
    title: 'Test',
    decisionScore: 75,
    confidenceScore: 70,
    overallRisk: 'Orta',
    scoreLabel: 'Güçlü',
    executiveSummary: 'Özet',
    recommendationLabel: 'Dikkatli ilerle',
    nextSteps: ['Adım 1'],
    scoreFactors: [],
    riskAnalysis: [],
    warnings: [],
    memory: {
      version: 'memory-lite-v1',
      profile: {
        riskPreference: 55,
        budgetDiscipline: 60,
        comfortPriority: 58,
        investmentFocus: 52,
        financeSensitivity: 49
      },
      trend: { direction: 'stable', explanation: 'Trend metni' },
      insights: ['Insight A', 'Insight B'],
      historyCount: 3
    }
  });

  assert.match(html, /Aksiyon Planı/);
  assert.match(html, /Karar Profiliniz/);
  assert.match(html, /Risk Tercihi/);
  assert.match(html, /Bütçe Disiplini/);
  assert.match(html, /Konfor Önceliği/);
  assert.match(html, /Yatırım Odağı/);
  assert.match(html, /Finansman Hassasiyeti/);
  assert.match(html, /Trend metni/);
  assert.match(html, /Insight A/);
  assert.match(html, /yalnızca cihazınızdaki analiz geçmişinden/i);

  const actionIndex = html.indexOf('Aksiyon Planı');
  const profileIndex = html.indexOf('Karar Profiliniz');
  assert.ok(actionIndex >= 0 && profileIndex > actionIndex);
});

test('renderDecisionV3Panel renders static what-if fallback without input', () => {
  const html = renderDecisionV3Panel({
    vertical: 'finansman',
    title: 'Test',
    decisionScore: 70,
    confidenceScore: 65,
    overallRisk: 'Orta',
    scoreLabel: 'Orta',
    executiveSummary: 'Özet',
    recommendationLabel: 'Değerlendirme',
    nextSteps: ['Adım 1'],
    scoreFactors: [],
    riskAnalysis: [],
    warnings: [],
    whatIfScenarios: [{ title: 'Bütçe +10%', description: 'Statik senaryo' }]
  });

  assert.match(html, /Senaryo Simülasyonu/);
  assert.match(html, /Statik senaryo/);
  assert.doesNotMatch(html, /data-whatif-run/);
});

test('renderDecisionV3Panel renders interactive what-if controls with input', () => {
  const html = renderDecisionV3Panel({
    vertical: 'konut',
    title: 'Test',
    decisionScore: 70,
    confidenceScore: 65,
    overallRisk: 'Orta',
    scoreLabel: 'Orta',
    executiveSummary: 'Özet',
    recommendationLabel: 'Değerlendirme',
    nextSteps: ['Adım 1'],
    scoreFactors: [],
    riskAnalysis: [],
    warnings: [],
    whatIfInput: {
      category: 'konut',
      formData: { totalBudget: 3_000_000 },
      metrics: { totalCost: 3_000_000 },
      extras: { totalCost: 3_000_000 }
    }
  });

  assert.match(html, /Simülasyonu çalıştır/);
  assert.match(html, /data-whatif-budget/);
  assert.match(html, /data-whatif-downpayment/);
  assert.match(html, /data-whatif-term/);
  assert.match(html, /data-whatif-risk/);
});

test('simulateWhatIfChange is exported', () => {
  assert.equal(typeof simulateWhatIfChange, 'function');
});

test('simulateWhatIfChange produces output for budget increase', () => {
  const input = {
    category: 'konut',
    formData: { totalBudget: 3_000_000, city: 'İzmir' },
    metrics: { totalCost: 3_000_000, dti: 30 },
    extras: { totalCost: 3_000_000 }
  };

  const result = simulateWhatIfChange(input, { field: 'budget', value: 10, mode: 'percent' });
  assert.ok(result);
  assert.ok(result.before);
  assert.ok(result.after);
  assert.ok(Number.isFinite(result.delta.decisionScore));
  assert.ok(typeof result.explanation === 'string' && result.explanation.length > 0);
});

test('simulateWhatIfChange riskTolerance can affect scores', () => {
  const input = {
    category: 'finansman',
    formData: { monthly_income: 60_000, existing_debt: 4_000 },
    metrics: { totalCost: 500_000 },
    extras: { totalCost: 500_000, primaryResult: { metrics: { monthlyPayment: 18_000 } } }
  };

  const low = simulateWhatIfChange(input, { field: 'riskTolerance', value: 'düşük', mode: 'toggle' });
  const high = simulateWhatIfChange(input, { field: 'riskTolerance', value: 'yüksek', mode: 'toggle' });

  assert.ok(low && high);
  assert.notEqual(low.after.riskScore, high.after.riskScore);
});

test('simulateWhatIfChange returns delta fields', () => {
  const result = simulateWhatIfChange(
    {
      category: 'auto',
      formData: { budget: 900_000 },
      metrics: { totalCost: 900_000 },
      extras: { totalCost: 900_000 }
    },
    { field: 'downPayment', value: 20, mode: 'percent' }
  );

  assert.ok(result);
  assert.ok(Object.prototype.hasOwnProperty.call(result.delta, 'decisionScore'));
  assert.ok(Object.prototype.hasOwnProperty.call(result.delta, 'confidenceScore'));
  assert.ok(Object.prototype.hasOwnProperty.call(result.delta, 'riskScore'));
  assert.ok(Object.prototype.hasOwnProperty.call(result.delta, 'totalCost'));
});

test('simulateWhatIfChange does not throw on invalid input', () => {
  assert.equal(simulateWhatIfChange(null, { field: 'budget', value: 10, mode: 'percent' }), null);
  assert.equal(simulateWhatIfChange({}, null), null);
  assert.doesNotThrow(() => {
    simulateWhatIfChange({}, { field: '', value: 0, mode: 'absolute' });
  });
});

test('tryMountDecisionEngineV3 swallows mount errors silently', async () => {
  const badNode = {
    querySelector() {
      throw new Error('dom failure');
    },
    prepend() {
      throw new Error('dom failure');
    }
  };

  const result = await tryMountDecisionEngineV3({
    mountNode: badNode,
    category: 'finansman',
    formData: {},
    metrics: {}
  });

  assert.equal(result, null);
});

test('buildDecisionIntelligenceResult remains usable through v3 mount path', async () => {
  const intelligence = buildDecisionIntelligenceResult(
    'finansman',
    { monthly_income: 70_000, existing_debt: 5_000 },
    {},
    { primaryResult: { metrics: { monthlyPayment: 16_000 } } }
  );

  assert.ok(intelligence.decisionScore >= 0 && intelligence.decisionScore <= 100);
  assert.ok(Array.isArray(intelligence.nextSteps));
});
