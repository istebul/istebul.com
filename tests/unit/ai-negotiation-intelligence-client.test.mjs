import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const client = await import('../../js/ai-negotiation-intelligence/index.js');

const {
  runNegotiationIntelligenceEngine,
  buildNegotiationDisplayModel,
  formatNegotiationCurrency,
  NEGOTIATION_RISK_LABELS_TR,
  buildNegotiationPanelHtml,
  buildNegotiationShellHtml
} = client;

const shared = await import('../../supabase/functions/_shared/ai-listings/negotiation/index.js');

const VEHICLE_INPUT = Object.freeze({
  category: 'vehicle',
  price: 950000,
  marketReference: { medianPrice: 980000, priceDeltaPct: -3.1 },
  ownershipSignal: { sellerType: 'owner', ownershipConfidence: 0.72 },
  qualitySignal: { listingQualityScore: 78, verificationLevel: 'partial' },
  location: 'İstanbul',
  confidence: 0.82,
  attributes: { year: 2022, mileage: 45000 }
});

const FORBIDDEN_PHRASES = Object.freeze([
  'kesin',
  'garanti',
  'mutlaka al',
  'risksiz',
  'zararsız',
  'en iyi fırsat'
]);

const CLIENT_FILES = Object.freeze([
  'js/ai-negotiation-intelligence/index.js',
  'js/ai-negotiation-intelligence/negotiation-view-model.js',
  'js/ai-negotiation-intelligence/negotiation-card-builder.js'
]);

const FORBIDDEN_TOKENS = Object.freeze(['fetch(', 'process.env', 'SUPABASE_', 'AI_LISTINGS_EDGE_SECRET']);

function getVehicleResult() {
  return runNegotiationIntelligenceEngine(VEHICLE_INPUT);
}

test('client import works', () => {
  assert.equal(typeof runNegotiationIntelligenceEngine, 'function');
  assert.equal(typeof buildNegotiationDisplayModel, 'function');
  assert.equal(typeof buildNegotiationPanelHtml, 'function');
  assert.equal(typeof formatNegotiationCurrency, 'function');
  assert.equal(typeof buildNegotiationShellHtml, 'function');
  assert.ok(NEGOTIATION_RISK_LABELS_TR.low);
});

test('re-export parity matches shared negotiation contract', () => {
  const clientResult = runNegotiationIntelligenceEngine(VEHICLE_INPUT);
  const sharedResult = shared.runNegotiationIntelligenceEngine(VEHICLE_INPUT);

  assert.deepEqual(clientResult, sharedResult);
  assert.ok(clientResult);
  assert.ok('targetOffer' in clientResult);
  assert.ok('minOffer' in clientResult);
  assert.ok('maxOffer' in clientResult);
});

test('view model stable for valid result', () => {
  const result = getVehicleResult();
  const model = buildNegotiationDisplayModel(result, { title: 'Test İlan' });

  assert.equal(model.hasData, true);
  assert.equal(model.title, 'Test İlan');
  assert.ok(String(model.targetOfferText).length > 0);
  assert.ok(String(model.bandText).includes('–'));
  assert.ok(String(model.discountPercentText).startsWith('%'));
  assert.ok(String(model.riskLabel).length > 0);
  assert.equal(typeof model.confidencePercent, 'number');
  assert.ok(model.confidencePercent >= 0 && model.confidencePercent <= 100);
  assert.ok(Array.isArray(model.checklist));
  assert.ok(Array.isArray(model.warnings));
  assert.ok(Array.isArray(model.evidenceSignals));
});

test('view model empty state is Turkish', () => {
  const model = buildNegotiationDisplayModel(null);

  assert.equal(model.hasData, false);
  assert.equal(model.title, 'Pazarlık Analizi');
  assert.match(String(model.emptyMessage), /üretilemedi/i);
});

test('TR formatting for currency and risk label', () => {
  assert.match(formatNegotiationCurrency(910000), /910\.000/);
  assert.match(formatNegotiationCurrency(910000), /TL/);

  const result = runNegotiationIntelligenceEngine({
    ...VEHICLE_INPUT,
    ownershipSignal: { sellerType: 'unknown' },
    qualitySignal: { listingQualityScore: 40, verificationLevel: 'none' },
    confidence: 0.4
  });
  const model = buildNegotiationDisplayModel(result);
  if (model.riskLevel === 'medium') {
    assert.equal(model.riskLabel, 'Orta');
  } else {
    assert.ok(['Düşük', 'Orta', 'Yüksek'].includes(String(model.riskLabel)));
  }
});

test('buildNegotiationPanelHtml empty state is Turkish', () => {
  const html = buildNegotiationPanelHtml(null);
  assert.match(html, /üretilemedi/i);
  assert.match(html, /Pazarlık Analizi/);
  assert.match(html, /ai-neg-panel/);
});

test('buildNegotiationPanelHtml renders offer band risk summary checklist warnings', () => {
  const result = getVehicleResult();
  const html = buildNegotiationPanelHtml(result, { title: 'BMW 320i' });

  assert.match(html, /Hedef teklif/);
  assert.match(html, /Teklif bandı/);
  assert.match(html, /Pazarlık riski/);
  assert.match(html, /Özet/);
  assert.match(html, /Kontrol listesi/);
  assert.match(html, /Uyarılar/);
  assert.match(html, /Kanıt sinyalleri/);
  assert.match(html, /BMW 320i/);
  assert.match(html, new RegExp(String(result.targetOffer).slice(0, 3)));
});

test('buildNegotiationPanelHtml escapes title XSS', () => {
  const result = getVehicleResult();
  const html = buildNegotiationPanelHtml(result, { title: '<script>alert(1)</script>' });

  assert.doesNotMatch(html, /<script>/);
  assert.ok(html.includes('&lt;script&gt;') || !html.includes('alert(1)</script>'));
});

test('buildNegotiationPanelHtml does not contain forbidden phrases', () => {
  const result = getVehicleResult();
  const html = buildNegotiationPanelHtml(result).toLocaleLowerCase('tr-TR');

  for (const phrase of FORBIDDEN_PHRASES) {
    assert.equal(html.includes(phrase), false, `forbidden phrase found: ${phrase}`);
  }
});

test('buildNegotiationPanelHtml is deterministic', () => {
  const result = getVehicleResult();
  const first = buildNegotiationPanelHtml(result, { title: 'Deterministik Test' });
  const second = buildNegotiationPanelHtml(result, { title: 'Deterministik Test' });
  assert.equal(first, second);
});

test('buildNegotiationShellHtml exposes negotiation host', () => {
  const html = buildNegotiationShellHtml();
  assert.match(html, /ai-neg-panel-host/);
  assert.match(html, /id="ai-neg-panel-host"/);
});

test('client files do not reference network or env secrets', () => {
  for (const rel of CLIENT_FILES) {
    const content = fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
    for (const token of FORBIDDEN_TOKENS) {
      assert.equal(
        content.includes(token),
        false,
        `${rel} must not reference ${token}`
      );
    }
  }
});
