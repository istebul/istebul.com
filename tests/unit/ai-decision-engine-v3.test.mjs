import test from 'node:test';
import assert from 'node:assert/strict';

const { tryMountDecisionEngineV3, renderDecisionV3Panel } = await import(
  '../../js/decision/ai-decision-engine-v3.js'
);
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
    createElement() {
      return createDomNode();
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
