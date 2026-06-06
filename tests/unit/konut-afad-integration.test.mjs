import test from 'node:test';
import assert from 'node:assert/strict';

const { buildKonutResultsV2Payload } = await import('../../js/features/konut/konut-results-v2.js');
const { buildAfadRiskLayer, renderAfadRiskLayerHtml } = await import(
  '../../js/features/results/results-afad-risk-layer.js'
);
const { buildKonutPdfPayload } = await import('../../js/features/konut/konut-pdf.js');

const sampleState = {
  city: 'İstanbul',
  district: 'Kadıköy',
  totalBudget: 4_000_000,
  homeType: 'Daire',
  purchasePurpose: 'Satın almak istiyorum',
  useFinancing: 'evet',
  monthlyIncome: 80_000,
  monthlyCapacity: 45_000,
  earthquakeRiskInput: '40'
};

const sampleMetrics = {
  score: 78,
  budgetFit: 75,
  locationFit: 80,
  homeTypeFit: 82,
  financingClarity: 85,
  costPressure: 30,
  investmentPotential: 70,
  dti: 35,
  earthquakeRiskScore: 40,
  liquidityRisk: 40,
  risk: { label: 'Orta', score: 48 },
  ownership: {
    homePrice: 4_000_000,
    monthlyPayment: 42_000,
    downPayment: 1_200_000,
    principal: 2_800_000,
    titleFees: 180_000,
    realTotal: 4_500_000
  }
};

const sampleAfad = {
  earthquakeRiskScore: 82,
  earthquakeActivityLevel: 'orta',
  earthquakeSummary:
    'AFAD deprem istihbaratı: Kadıköy (İstanbul) yüksek deprem risk bandında (skor 82/100).',
  riskLevel: 'yüksek',
  seismicBaseRisk: 85,
  eventCount: 3,
  maxMagnitude: 2.8,
  recentEvents: [
    {
      magnitude: 2.8,
      location: 'Kadıköy (İstanbul)',
      date: '2026-05-12T10:00:00'
    }
  ],
  source: 'afad'
};

test('konut V2 payload includes Deprem Riski layer from AFAD snapshot', () => {
  const payload = buildKonutResultsV2Payload({
    state: sampleState,
    metrics: sampleMetrics,
    afadSnapshot: sampleAfad
  });

  assert.ok(payload.afadRiskLayer);
  assert.equal(payload.afadRiskLayer.title, 'Deprem Riski');
  assert.equal(payload.afadRiskLayer.hasData, true);
  assert.match(payload.afadRiskLayer.summary, /AFAD deprem istihbaratı/i);
  assert.ok(payload.metricsForView.earthquakeRiskScore > sampleMetrics.earthquakeRiskScore);
  assert.equal(payload.metricsForView.earthquakeSource, 'afad');
  assert.equal(payload.riskAnalysis.length, 6);
});

test('renderAfadRiskLayerHtml shows risk level, activity and AI explanation', () => {
  const layer = buildAfadRiskLayer(sampleAfad);
  const html = renderAfadRiskLayerHtml(layer);
  assert.match(html, /Deprem Riski/);
  assert.match(html, /yüksek risk/i);
  assert.match(html, /AI açıklama/i);
  assert.match(html, /AFAD deprem istihbaratı/i);
  assert.match(html, /data-afad-risk-layer/);
});

test('buildKonutPdfPayload embeds AFAD metadata for PDF export', () => {
  const pdfPayload = buildKonutPdfPayload({
    state: sampleState,
    metrics: sampleMetrics,
    afadSnapshot: sampleAfad
  });

  assert.ok(pdfPayload.pdfReportData.metadata);
  assert.equal(pdfPayload.pdfReportData.metadata.earthquakeSource, 'afad');
  assert.ok(pdfPayload.pdfReportData.metadata.afadRiskLayer?.hasData);
  assert.match(pdfPayload.pdfReportData.metadata.earthquakeAssessment, /AFAD deprem istihbaratı/i);
});

test('konut payload gracefully handles missing AFAD data', () => {
  const payload = buildKonutResultsV2Payload({
    state: sampleState,
    metrics: sampleMetrics,
    afadSnapshot: null
  });

  assert.equal(payload.afadRiskLayer.hasData, false);
  assert.equal(payload.metricsForView.earthquakeRiskScore, sampleMetrics.earthquakeRiskScore);
});
