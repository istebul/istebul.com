import test from 'node:test';
import assert from 'node:assert/strict';

const {
  analyzeVehicleListing,
  analyzeHousingListing,
  validateListingInput,
  buildListingAnalysisResult
} = await import('../../js/verticals/listing-analysis/listing-analysis-engine.js');

const { buildListingAiSummary, fetchListingExecutiveSummary } = await import(
  '../../js/verticals/listing-analysis/listing-analysis-ai-summary.js'
);

const { buildListingPdfHtml } = await import('../../js/verticals/listing-analysis/listing-analysis-pdf.js');

const vehicleInput = {
  marka: 'Toyota',
  model: 'Corolla',
  yil: '2020',
  km: '65000',
  yakit_turu: 'hibrit',
  fiyat: '950000',
  il: 'İstanbul'
};

const housingInput = {
  il: 'Ankara',
  ilce: 'Çankaya',
  metrekare: '120',
  oda_sayisi: '3',
  bina_yasi: '8',
  fiyat: '4200000',
  kullanim_amaci: 'oturum'
};

test('analyzeVehicleListing produces bounded canonical scores', () => {
  const result = analyzeVehicleListing(vehicleInput);
  assert.equal(result.listingType, 'vehicle');
  assert.ok(result.decisionScore >= 0 && result.decisionScore <= 100);
  assert.ok(result.confidenceScore >= 0 && result.confidenceScore <= 100);
  assert.ok(result.priceFit >= 0 && result.priceFit <= 100);
  assert.ok(['düşük', 'orta', 'yüksek'].includes(result.riskLevel));
  assert.ok(result.strengths.length > 0);
  assert.ok(result.totalCostEstimate.firstYearTotal > result.totalCostEstimate.purchasePrice);
});

test('analyzeHousingListing produces bounded canonical scores', () => {
  const result = analyzeHousingListing(housingInput);
  assert.equal(result.listingType, 'housing');
  assert.ok(result.decisionScore >= 0 && result.decisionScore <= 100);
  assert.ok(result.confidenceScore >= 0 && result.confidenceScore <= 100);
  assert.ok(result.priceFit >= 0 && result.priceFit <= 100);
  assert.ok(result.totalCostEstimate.totalAcquisitionCost > result.totalCostEstimate.purchasePrice);
  assert.ok(result.factors.some((f) => f.key === 'sqm_price'));
});

test('validateListingInput rejects missing required fields', () => {
  const vehicle = validateListingInput('vehicle', { marka: 'X' });
  assert.equal(vehicle.valid, false);
  assert.ok(vehicle.errors.length >= 2);

  const housing = validateListingInput('housing', { il: 'Ankara' });
  assert.equal(housing.valid, false);
  assert.ok(housing.errors.length >= 2);

  const built = buildListingAnalysisResult('vehicle', { marka: 'X' });
  assert.equal(built.ok, false);
});

test('buildListingAiSummary does not mutate engine scores', async () => {
  const result = analyzeVehicleListing(vehicleInput);
  const before = {
    decisionScore: result.decisionScore,
    confidenceScore: result.confidenceScore,
    priceFit: result.priceFit,
    riskLevel: result.riskLevel
  };

  const ai = buildListingAiSummary(result);
  assert.ok(ai.summary.length > 40);
  assert.equal(ai.source, 'deterministic');
  assert.equal(result.decisionScore, before.decisionScore);
  assert.equal(result.confidenceScore, before.confidenceScore);
  assert.equal(result.priceFit, before.priceFit);
  assert.equal(result.riskLevel, before.riskLevel);

  const fetched = await fetchListingExecutiveSummary(result, { skipProxy: true });
  assert.equal(result.decisionScore, before.decisionScore);
  assert.equal(result.confidenceScore, before.confidenceScore);
  assert.equal(result.priceFit, before.priceFit);
  assert.equal(result.riskLevel, before.riskLevel);
  assert.ok(fetched.summary.length > 20);
});

test('buildListingPdfHtml smoke export contains score blocks', () => {
  const result = analyzeHousingListing(housingInput);
  const html = buildListingPdfHtml({ result });
  assert.ok(html.includes('Karar Skoru'));
  assert.ok(html.includes(`${result.decisionScore}/100`));
  assert.ok(html.includes('AI Executive Summary'));
  assert.ok(html.includes('Toplam Maliyet Tahmini'));
});

test('high km and old year lower vehicle decision score vs strong profile', () => {
  const weak = analyzeVehicleListing({
    ...vehicleInput,
    yil: '2008',
    km: '280000',
    fiyat: '780000',
    yakit_turu: 'benzin',
    il: ''
  });
  const strong = analyzeVehicleListing(vehicleInput);
  assert.ok(strong.decisionScore > weak.decisionScore);
  assert.ok(strong.confidenceScore > weak.confidenceScore);
});
