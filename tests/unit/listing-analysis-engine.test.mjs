import test from 'node:test';
import assert from 'node:assert/strict';

const {
  analyzeVehicleListing,
  analyzeHousingListing,
  validateListingInput,
  buildListingAnalysisResult,
  parseListingUrl
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
  assert.equal(result.source.mode, null);
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

test('valid sahibinden URL accepted', () => {
  const parsed = parseListingUrl('https://www.sahibinden.com/ilan/arac/detay/123?utm_source=google&utm_medium=cpc');
  assert.equal(parsed.isValid, true);
  assert.equal(parsed.sourceLabel, 'Sahibinden');
  assert.equal(parsed.sourceDomain, 'sahibinden.com');
  assert.ok(!parsed.normalizedUrl.includes('utm_'));
});

test('valid arabam URL accepted', () => {
  const parsed = parseListingUrl('https://arabam.com/ilan/123');
  assert.equal(parsed.isValid, true);
  assert.equal(parsed.sourceLabel, 'Arabam');
});

test('valid emlakjet URL accepted', () => {
  const parsed = parseListingUrl('https://www.emlakjet.com/ilan/konut/456');
  assert.equal(parsed.isValid, true);
  assert.equal(parsed.sourceLabel, 'Emlakjet');
});

test('valid hepsiemlak URL accepted', () => {
  const parsed = parseListingUrl('https://hepsiemlak.com/ilan/789');
  assert.equal(parsed.isValid, true);
  assert.equal(parsed.sourceLabel, 'Hepsiemlak');
});

test('javascript URL rejected', () => {
  const parsed = parseListingUrl('javascript:alert(1)');
  assert.equal(parsed.isValid, false);
  assert.ok(parsed.error);
});

test('localhost rejected', () => {
  const parsed = parseListingUrl('http://localhost/ilan');
  assert.equal(parsed.isValid, false);
});

test('private IP rejected', () => {
  assert.equal(parseListingUrl('https://192.168.1.10/ilan').isValid, false);
  assert.equal(parseListingUrl('https://10.0.0.5/ilan').isValid, false);
  assert.equal(parseListingUrl('https://172.16.0.1/ilan').isValid, false);
});

test('utm params stripped from normalized URL', () => {
  const parsed = parseListingUrl('https://sahibinden.com/ilan/1?utm_campaign=test&utm_content=x&foo=bar');
  assert.equal(parsed.isValid, true);
  assert.ok(!parsed.normalizedUrl.includes('utm_campaign'));
  assert.ok(!parsed.normalizedUrl.includes('utm_content'));
  assert.ok(parsed.normalizedUrl.includes('foo=bar'));
});

test('result source object created when URL provided', () => {
  const built = buildListingAnalysisResult('vehicle', {
    ...vehicleInput,
    listing_url: 'https://www.sahibinden.com/ilan/arac/123'
  });
  assert.equal(built.ok, true);
  assert.equal(built.result.source.mode, 'user_provided_url_only');
  assert.equal(built.result.source.label, 'Sahibinden');
  assert.ok(built.result.source.listingUrl.includes('sahibinden.com'));
  assert.equal(built.result.inputSnapshot.listing_url, built.result.source.listingUrl);
});

test('V1 manual analysis works without URL', () => {
  const before = analyzeVehicleListing(vehicleInput);
  const built = buildListingAnalysisResult('vehicle', vehicleInput);
  assert.equal(built.ok, true);
  assert.equal(built.result.decisionScore, before.decisionScore);
  assert.equal(built.result.source.listingUrl, null);
  assert.equal(built.result.source.mode, null);
});

test('invalid listing URL blocks analysis', () => {
  const built = buildListingAnalysisResult('vehicle', {
    ...vehicleInput,
    listing_url: 'javascript:alert(1)'
  });
  assert.equal(built.ok, false);
  assert.ok(built.errors.length > 0);
});
