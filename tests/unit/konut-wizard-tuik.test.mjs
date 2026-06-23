import test from 'node:test';
import assert from 'node:assert/strict';

const {
  buildKonutResultsV2Payload,
  buildKonutExecutiveSummaryContext,
  computeDecisionScore,
  hydrateKonutAfadRiskLayer,
  hydrateKonutTuikReferenceLayer
} = await import('../../js/features/konut/konut-results-v2.js');

const { buildEvdsRiskLayer, mountEvdsRiskLayer } = await import(
  '../../js/features/results/results-evds-risk-layer.js'
);

const { buildAfadRiskLayer } = await import('../../js/features/results/results-afad-risk-layer.js');

const REFERENCE_SNAPSHOT = {
  ok: true,
  data: {
    status: 'reference',
    source: 'tuik',
    lastReviewed: '2026-06-08',
    categories: [
      {
        id: 'konut_satis_istatistikleri',
        title: 'Konut Satış İstatistikleri',
        relatedVerticals: ['konut'],
        usage: 'Konut piyasası hacmi referansı.',
        scoreImpact: false
      },
      {
        id: 'tuketici_fiyat_endeksi',
        title: 'Tüketici fiyat endeksi (TÜFE)',
        relatedVerticals: ['finansman', 'auto'],
        usage: 'Enflasyon referansı.',
        scoreImpact: false
      }
    ],
    attribution: {
      provider: 'Türkiye İstatistik Kurumu (TÜİK)',
      url: 'https://www.tuik.gov.tr/',
      disclaimer: 'Ham veri yeniden satılmaz veya ticari olarak paketlenmez.'
    }
  },
  meta: { scoreImpact: false }
};

const CONNECTED_AFAD_SNAPSHOT = {
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
        activityLevel: 'düşük',
        hasLiveActivity: true
      }
    ],
    earthquakes: [],
    attribution: { provider: 'AFAD Deprem Dairesi' }
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

const BANNED_PHRASES = [
  'tavsiye eder',
  'skoru artırır',
  'canlı bağlı',
  'resmi API',
  'upstream'
];

function assertNoBannedPhrases(text) {
  const normalized = String(text || '').toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    assert.equal(normalized.includes(phrase.toLowerCase()), false, `forbidden phrase: ${phrase}`);
  }
}

test('hydrateKonutTuikReferenceLayer calls /api/tuik-snapshot?vertical=konut', async () => {
  const root = createKonutResultsRoot();
  let requestedUrl = '';

  await withDocumentMock(async () => {
    await hydrateKonutTuikReferenceLayer(
      root,
      sampleState,
      async (url) => {
        requestedUrl = String(url);
        return {
          ok: true,
          async json() {
            return REFERENCE_SNAPSHOT;
          }
        };
      }
    );
  });

  assert.equal(requestedUrl, '/api/tuik-snapshot?vertical=konut');
});

test('connected TÜİK snapshot mounts data-tuik-reference-layer', async () => {
  const root = createKonutResultsRoot();

  await withDocumentMock(async () => {
    const layer = await hydrateKonutTuikReferenceLayer(
      root,
      sampleState,
      async () => ({
        ok: true,
        async json() {
          return REFERENCE_SNAPSHOT;
        }
      })
    );

    assert.equal(layer?.hasData, true);
    assert.ok(root.tuikCard);
    assert.match(root.html, /data-tuik-reference-layer/);
    assert.match(root.html, /TÜİK referans verisi/);
    assert.match(root.html, /Konut Satış İstatistikleri/);
    assert.doesNotMatch(root.html, /Tüketici fiyat endeksi/);
  });
});

test('TÜİK card mounts after AFAD card when both are present', async () => {
  const root = createKonutResultsRoot();
  const evdsLayer = buildEvdsRiskLayer('konut', { housingLoanRate: 45, policyRate: 50, cpiAnnual: 55 });

  await withDocumentMock(async () => {
    mountEvdsRiskLayer(root, evdsLayer);
    await hydrateKonutAfadRiskLayer(
      root,
      sampleState,
      async () => ({
        ok: true,
        async json() {
          return CONNECTED_AFAD_SNAPSHOT;
        }
      })
    );
    await hydrateKonutTuikReferenceLayer(
      root,
      sampleState,
      async () => ({
        ok: true,
        async json() {
          return REFERENCE_SNAPSHOT;
        }
      })
    );

    assert.ok(root.afadCard);
    assert.ok(root.tuikCard);
    assert.ok(root.afadIndex >= 0);
    assert.ok(root.tuikIndex > root.afadIndex, 'TÜİK card should mount after AFAD card');
  });
});

test('TÜİK card mounts after EVDS when AFAD is absent', async () => {
  const root = createKonutResultsRoot();
  const evdsLayer = buildEvdsRiskLayer('konut', { housingLoanRate: 45, policyRate: 50, cpiAnnual: 55 });

  await withDocumentMock(async () => {
    mountEvdsRiskLayer(root, evdsLayer);
    await hydrateKonutTuikReferenceLayer(
      root,
      sampleState,
      async () => ({
        ok: true,
        async json() {
          return REFERENCE_SNAPSHOT;
        }
      })
    );

    assert.equal(root.afadCard, null);
    assert.ok(root.tuikCard);
    assert.ok(root.evdsIndex >= 0);
    assert.ok(root.tuikIndex > root.evdsIndex, 'TÜİK card should mount after EVDS layer');
  });
});

test('fetch failure leaves konut results root without TÜİK card', async () => {
  const root = createKonutResultsRoot();

  await withDocumentMock(async () => {
    const layer = await hydrateKonutTuikReferenceLayer(
      root,
      sampleState,
      async () => ({
        ok: false,
        status: 500,
        async json() {
          return { ok: false };
        }
      })
    );

    assert.equal(layer, null);
    assert.equal(root.tuikCard, null);
    assert.equal(root.html.includes('data-tuik-reference-layer'), false);
  });
});

test('hasData:false snapshot is no-op', async () => {
  const root = createKonutResultsRoot();

  await withDocumentMock(async () => {
    const layer = await hydrateKonutTuikReferenceLayer(
      root,
      sampleState,
      async () => ({
        ok: true,
        async json() {
          return { ok: true, data: { status: 'connected', categories: [] }, meta: { scoreImpact: false } };
        }
      })
    );

    assert.equal(layer, null);
    assert.equal(root.tuikCard, null);
  });
});

test('decisionScore and earthquakeRiskScore stay unchanged by TÜİK hydration', async () => {
  const metrics = { ...sampleMetrics, earthquakeRiskScore: 62 };
  const payload = buildKonutResultsV2Payload({
    state: sampleState,
    metrics,
    evdsRates: { housingLoanRate: 45, policyRate: 50, cpiAnnual: 55 }
  });
  const beforeDecisionScore = payload.decisionScore;
  const beforeEarthquakeRiskScore = metrics.earthquakeRiskScore;

  const root = createKonutResultsRoot();
  await withDocumentMock(async () => {
    await hydrateKonutTuikReferenceLayer(
      root,
      sampleState,
      async () => ({
        ok: true,
        async json() {
          return REFERENCE_SNAPSHOT;
        }
      })
    );
  });

  const afterPayload = buildKonutResultsV2Payload({
    state: sampleState,
    metrics,
    evdsRates: { housingLoanRate: 45, policyRate: 50, cpiAnnual: 55 }
  });

  assert.equal(afterPayload.decisionScore, beforeDecisionScore);
  assert.equal(metrics.earthquakeRiskScore, beforeEarthquakeRiskScore);
  assert.equal(computeDecisionScore(sampleState, metrics), beforeDecisionScore);
});

test('buildKonutExecutiveSummaryContext does not include TÜİK data', async () => {
  const afadLayer = buildAfadRiskLayer(CONNECTED_AFAD_SNAPSHOT);
  const context = buildKonutExecutiveSummaryContext({ marketAssessment: 'EVDS test' }, afadLayer);

  assert.equal('tuikReferenceAssessment' in context, false);
  assert.equal('tuikReferenceLayer' in context, false);
  assert.match(JSON.stringify(context).toLowerCase(), /earthquakeactivityassessment|marketassessment/);
  assert.doesNotMatch(JSON.stringify(context).toLowerCase(), /tuik referans/);
});

test('TÜİK card copy avoids banned phrases', async () => {
  const root = createKonutResultsRoot();

  await withDocumentMock(async () => {
    await hydrateKonutTuikReferenceLayer(
      root,
      sampleState,
      async () => ({
        ok: true,
        async json() {
          return REFERENCE_SNAPSHOT;
        }
      })
    );

    assertNoBannedPhrases(root.html);
  });
});

function createKonutResultsRoot() {
  const root = {
    html: '',
    afadCard: null,
    tuikCard: null,
    evdsLayerNode: null,
    evdsIndex: -1,
    afadIndex: -1,
    tuikIndex: -1,
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
      if (markup.includes('data-tuik-reference-layer')) {
        root.tuikCard = node;
        root.tuikIndex = root.html.length;
      }
      root.html += markup;
    },
    querySelector(selector) {
      if (selector === '[data-tuik-reference-layer]') {
        return root.html.includes('data-tuik-reference-layer')
          ? {
              remove() {
                root.html = root.html.replace(/<section[^>]*data-tuik-reference-layer[\s\S]*?<\/section>/, '');
                root.tuikCard = null;
                root.tuikIndex = -1;
              },
              parentNode: {},
              insertAdjacentElement() {}
            }
          : null;
      }
      if (selector === '[data-afad-risk-layer]') {
        return root.html.includes('data-afad-risk-layer')
          ? {
              remove() {
                root.html = root.html.replace(/<section[^>]*data-afad-risk-layer[\s\S]*?<\/section>/, '');
                root.afadCard = null;
                root.afadIndex = -1;
              },
              parentNode: {},
              insertAdjacentElement(_pos, node) {
                node.parentNode = {};
                root.appendNode(node);
              }
            }
          : null;
      }
      if (selector === '[data-evds-risk-layer]') {
        return root.evdsLayerNode?.parentNode
          ? {
              ...root.evdsLayerNode,
              parentNode: root.evdsLayerNode.parentNode,
              insertAdjacentElement(_pos, node) {
                node.parentNode = {};
                root.appendNode(node);
              }
            }
          : null;
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
      if (markup.includes('data-tuik-reference-layer')) {
        root.tuikCard = node;
        root.tuikIndex = 0;
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
          if (
            trimmed.includes('data-afad-risk-layer') ||
            trimmed.includes('data-evds-risk-layer') ||
            trimmed.includes('data-tuik-reference-layer')
          ) {
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
