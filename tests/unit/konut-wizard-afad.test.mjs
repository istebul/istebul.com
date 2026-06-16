import test from 'node:test';
import assert from 'node:assert/strict';

const {
  buildKonutResultsV2Payload,
  computeDecisionScore,
  hydrateKonutAfadRiskLayer,
  resolveKonutAfadLocation
} = await import('../../js/features/konut/konut-results-v2.js');

const { buildEvdsRiskLayer, mountEvdsRiskLayer } = await import(
  '../../js/features/results/results-evds-risk-layer.js'
);

const DISABLED_SNAPSHOT = {
  ok: false,
  data: {
    status: 'disabled',
    source: 'disabled',
    earthquakes: [],
    regionalSignals: []
  },
  meta: { featureEnabled: false }
};

const CONNECTED_SNAPSHOT = {
  ok: true,
  data: {
    status: 'connected',
    source: 'afad',
    regionalSignals: [
      {
        province: 'İstanbul',
        district: 'Silivri',
        locationLabel: 'İstanbul / Silivri',
        eventCount: 5,
        maxMagnitude: 2.4,
        avgMagnitude: 1.8,
        significantCount: 0,
        activityLevel: 'düşük',
        hasLiveActivity: true
      }
    ],
    earthquakes: [
      {
        date: '2026-05-11T08:10:00',
        magnitude: 2.4,
        province: 'İstanbul',
        district: 'Silivri',
        location: 'Silivri (İstanbul)'
      }
    ],
    attribution: {
      provider: 'AFAD Deprem Dairesi',
      url: 'https://www.afad.gov.tr/'
    }
  },
  meta: { featureEnabled: true }
};

const sampleState = {
  city: 'İstanbul',
  district: 'Silivri',
  totalBudget: 4_000_000,
  homeType: 'Daire',
  purchasePurpose: 'Satın almak istiyorum',
  useFinancing: 'evet',
  monthlyIncome: 80_000,
  monthlyCapacity: 45_000,
  earthquakeRiskInput: '62'
};

const sampleMetrics = {
  score: 78,
  budgetFit: 75,
  locationFit: 80,
  homeTypeFit: 82,
  financingClarity: 85,
  costPressure: 30,
  investmentPotential: 70,
  earthquakeRiskScore: 62,
  dti: 35,
  risk: { label: 'Orta', score: 48 },
  ownership: {
    homePrice: 4_000_000,
    monthlyPayment: 42_000,
    downPayment: 1_200_000,
    principal: 2_800_000
  }
};

test('resolveKonutAfadLocation reads city/district from konut state', () => {
  assert.deepEqual(resolveKonutAfadLocation(sampleState), {
    province: 'İstanbul',
    district: 'Silivri'
  });
  assert.equal(resolveKonutAfadLocation({ city: '', district: '' }), null);
  assert.equal(resolveKonutAfadLocation({}), null);
});

test('disabled AFAD response leaves konut results root without AFAD card', async () => {
  const root = createKonutResultsRoot();
  let fetchCalled = false;

  const layer = await hydrateKonutAfadRiskLayer(
    root,
    sampleState,
    async () => {
      fetchCalled = true;
      return {
        ok: true,
        async json() {
          return DISABLED_SNAPSHOT;
        }
      };
    }
  );

  assert.equal(fetchCalled, true);
  assert.equal(layer?.hasData, false);
  assert.equal(root.afadCard, null);
  assert.equal(root.html.includes('data-afad-risk-layer'), false);
});

test('missing province/district skips AFAD fetch', async () => {
  const root = createKonutResultsRoot();
  let fetchCalled = false;

  const layer = await hydrateKonutAfadRiskLayer(root, { city: '', district: '' }, async () => {
    fetchCalled = true;
    return { ok: true, async json() { return CONNECTED_SNAPSHOT; } };
  });

  assert.equal(fetchCalled, false);
  assert.equal(layer, null);
  assert.equal(root.afadCard, null);
});

test('connected AFAD mock mounts data-afad-risk-layer after EVDS layer', async () => {
  const root = createKonutResultsRoot();

  await withDocumentMock(async () => {
    const layer = await hydrateKonutAfadRiskLayer(
      root,
      sampleState,
      async () => ({
        ok: true,
        async json() {
          return CONNECTED_SNAPSHOT;
        }
      })
    );

    assert.equal(layer?.hasData, true);
    assert.ok(root.afadCard);
    assert.match(root.html, /data-afad-risk-layer/);
    assert.match(root.html, /Deprem Aktivite Görünümü/);
    assert.match(root.html, /AFAD Deprem Dairesi/);
    assert.match(root.html, /Resmi uyarı değildir/);
  });
});

test('decisionScore and earthquakeRiskScore stay unchanged by AFAD hydration', async () => {
  const metrics = { ...sampleMetrics, earthquakeRiskScore: 62 };
  const payload = buildKonutResultsV2Payload({
    state: sampleState,
    metrics,
    evdsRates: { housingLoanRate: 45, policyRate: 50, cpiAnnual: 55 }
  });
  const decisionBefore = payload.decisionScore;
  const eqBefore = metrics.earthquakeRiskScore;

  const root = createKonutResultsRoot();
  await withDocumentMock(async () => {
    await hydrateKonutAfadRiskLayer(root, sampleState, async () => ({
      ok: true,
      async json() {
        return CONNECTED_SNAPSHOT;
      }
    }));
  });

  const payloadAfter = buildKonutResultsV2Payload({
    state: sampleState,
    metrics,
    evdsRates: { housingLoanRate: 45, policyRate: 50, cpiAnnual: 55 }
  });

  assert.equal(payloadAfter.decisionScore, decisionBefore);
  assert.equal(computeDecisionScore(sampleState, metrics), decisionBefore);
  assert.equal(metrics.earthquakeRiskScore, eqBefore);
  assert.equal(metrics.earthquakeRiskScore, 62);
});

test('AFAD card copy avoids internal fields and directive language', async () => {
  const root = createKonutResultsRoot();

  await withDocumentMock(async () => {
    await hydrateKonutAfadRiskLayer(root, sampleState, async () => ({
      ok: true,
      async json() {
        return {
          ok: true,
          data: {
            status: 'connected',
            source: 'afad',
            regionalSignals: [
              {
                province: 'Ankara',
                district: 'Çankaya',
                eventCount: 3,
                maxMagnitude: 3.1,
                activityLevel: 'orta',
                hasLiveActivity: true,
                summary: 'earthquakeRiskScore 88/100 eventID latitude longitude'
              }
            ],
            earthquakes: [
              {
                eventID: 'secret',
                latitude: 39.9,
                longitude: 32.8,
                magnitude: 3.1,
                province: 'Ankara',
                district: 'Çankaya'
              }
            ],
            attribution: { provider: 'AFAD Deprem Dairesi' }
          }
        };
      }
    }));
  });

  const blob = root.html.toLowerCase();
  assert.doesNotMatch(blob, /eventid/);
  assert.doesNotMatch(blob, /latitude/);
  assert.doesNotMatch(blob, /longitude/);
  assert.doesNotMatch(blob, /earthquakeriskscore/);
  assert.doesNotMatch(blob, /\b88\s*\/\s*100\b/);
  assert.doesNotMatch(blob, /\bsatın al\b/);
  assert.doesNotMatch(blob, /\bbekle\b/);
});

test('EVDS mount still works when AFAD layer is hydrated', async () => {
  const root = createKonutResultsRoot();
  const evdsLayer = buildEvdsRiskLayer('konut', {
    housingLoanRate: 45,
    policyRate: 50,
    cpiAnnual: 55
  });

  await withDocumentMock(async () => {
    mountEvdsRiskLayer(root, evdsLayer);
    await hydrateKonutAfadRiskLayer(root, sampleState, async () => ({
      ok: true,
      async json() {
        return CONNECTED_SNAPSHOT;
      }
    }));
  });

  assert.match(root.html, /data-evds-risk-layer/);
  assert.match(root.html, /data-afad-risk-layer/);
  assert.ok(root.evdsIndex < root.afadIndex, 'AFAD card should mount after EVDS layer');
});

function createKonutResultsRoot() {
  const root = {
    html: '',
    afadCard: null,
    evdsLayerNode: null,
    evdsIndex: -1,
    afadIndex: -1,
    appendNode(node) {
      const markup = node.outerHTML || '';
      if (markup.includes('data-evds-risk-layer')) {
        root.evdsLayerNode = node;
        root.evdsIndex = root.html.length;
      }
      if (markup.includes('data-afad-risk-layer')) {
        root.afadCard = node;
        root.afadIndex = root.html.length;
      }
      root.html += markup;
    },
    querySelector(selector) {
      if (selector === '[data-afad-risk-layer]') {
        return root.html.includes('data-afad-risk-layer')
          ? {
              remove() {
                root.html = root.html.replace(/<section[^>]*data-afad-risk-layer[\s\S]*?<\/section>/, '');
                root.afadCard = null;
                root.afadIndex = -1;
              }
            }
          : null;
      }
      if (selector === '[data-evds-risk-layer]') {
        return root.evdsLayerNode?.parentNode ? root.evdsLayerNode : null;
      }
      if (selector === '[data-results-economic-mount]') return economicMount;
      return null;
    },
    prepend(node) {
      const markup = node.outerHTML || '';
      root.html = `${markup}${root.html}`;
      if (markup.includes('data-afad-risk-layer')) {
        root.afadCard = node;
        root.afadIndex = 0;
      }
    }
  };

  const economicMount = {
    parentNode: {},
    insertAdjacentElement(_pos, node) {
      node.parentNode = {};
      if ((node.outerHTML || '').includes('data-evds-risk-layer')) {
        node.insertAdjacentElement = (_position, child) => {
          child.parentNode = {};
          root.appendNode(child);
        };
      }
      root.appendNode(node);
    }
  };

  return root;
}

async function withDocumentMock(fn) {
  const previous = globalThis.document;
  globalThis.document = {
    createElement(tag) {
      if (tag !== 'div') return { innerHTML: '', firstElementChild: null };
      let html = '';
      let firstChild = null;
      return {
        set innerHTML(value) {
          html = value;
          const trimmed = value.trim();
          if (trimmed.includes('data-afad-risk-layer') || trimmed.includes('data-evds-risk-layer')) {
            firstChild = {
              outerHTML: trimmed,
              parentNode: null
            };
          }
        },
        get innerHTML() {
          return html;
        },
        get firstElementChild() {
          return firstChild;
        }
      };
    }
  };

  try {
    await fn();
  } finally {
    if (previous === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = previous;
    }
  }
}
