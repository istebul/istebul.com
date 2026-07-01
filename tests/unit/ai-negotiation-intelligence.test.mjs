import test from 'node:test';
import assert from 'node:assert/strict';

const negotiation = await import(
  '../../supabase/functions/_shared/ai-listings/negotiation/index.js'
);

const {
  runNegotiationIntelligenceEngine,
  buildNegotiationInput,
  buildOfferRange,
  assessNegotiationRisk,
  buildNegotiationChecklist,
  buildNegotiationSummary,
  sanitizeNegotiationText,
  NEGOTIATION_FORBIDDEN_PHRASES
} = negotiation;

const OUTPUT_KEYS = Object.freeze([
  'targetOffer',
  'minOffer',
  'maxOffer',
  'discountPercent',
  'negotiationRisk',
  'confidence',
  'summary',
  'checklist',
  'warnings',
  'evidenceSignals'
]);

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

/**
 * @param {unknown} result
 */
function assertStableOutputSchema(result) {
  assert.ok(result && typeof result === 'object');
  for (const key of OUTPUT_KEYS) {
    assert.ok(key in result, `missing output key: ${key}`);
  }
  assert.equal(typeof result.summary, 'string');
  assert.ok(Array.isArray(result.checklist));
  assert.ok(Array.isArray(result.warnings));
  assert.ok(Array.isArray(result.evidenceSignals));
  assert.ok(['low', 'medium', 'high'].includes(result.negotiationRisk));
}

/**
 * @param {string} text
 */
function assertNoForbiddenPhrases(text) {
  const lower = String(text ?? '').toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    assert.equal(lower.includes(phrase), false, `forbidden phrase found: ${phrase}`);
  }
}

/**
 * @param {Array<{ label: string, status: string }>} checklist
 */
function assertChecklistStatuses(checklist) {
  for (const item of checklist) {
    assert.ok(['pending', 'ok', 'warn'].includes(item.status), `invalid status: ${item.status}`);
    assert.equal(typeof item.label, 'string');
    assert.ok(item.label.length > 0);
  }
}

test('public API exports negotiation intelligence contract', () => {
  assert.equal(typeof runNegotiationIntelligenceEngine, 'function');
  assert.equal(typeof buildNegotiationInput, 'function');
  assert.equal(typeof buildOfferRange, 'function');
  assert.equal(typeof assessNegotiationRisk, 'function');
  assert.equal(typeof buildNegotiationChecklist, 'function');
  assert.equal(typeof buildNegotiationSummary, 'function');
  assert.equal(typeof sanitizeNegotiationText, 'function');
  assert.ok(Array.isArray(NEGOTIATION_FORBIDDEN_PHRASES));
  assert.ok(NEGOTIATION_FORBIDDEN_PHRASES.length > 0);
});

test('valid vehicle input produces coherent offer band', () => {
  const result = runNegotiationIntelligenceEngine(VEHICLE_INPUT);
  assert.ok(result);
  assertStableOutputSchema(result);

  assert.ok(result.minOffer <= result.targetOffer);
  assert.ok(result.targetOffer <= result.maxOffer);
  assert.ok(result.targetOffer > 0);
  assert.ok(result.minOffer > 0);
  assert.ok(result.maxOffer > 0);
  assert.ok(result.discountPercent > 0);
  assert.ok(result.discountPercent <= 25);
  assert.match(result.summary, /değerlendirilebilir/i);
  assert.match(result.summary, /TL/);
});

test('missing or invalid price returns null', () => {
  assert.equal(runNegotiationIntelligenceEngine({ category: 'vehicle' }), null);
  assert.equal(runNegotiationIntelligenceEngine({ category: 'vehicle', price: 0 }), null);
  assert.equal(runNegotiationIntelligenceEngine({ category: 'vehicle', price: -100 }), null);
  assert.equal(buildNegotiationInput({ category: 'vehicle' }), null);
});

test('listingPrice alias is accepted', () => {
  const input = buildNegotiationInput({ listingPrice: 850000, category: 'vehicle' });
  assert.ok(input);
  assert.equal(input.price, 850000);

  const result = runNegotiationIntelligenceEngine({ listingPrice: 850000, category: 'vehicle' });
  assert.ok(result);
  assert.ok(result.targetOffer > 0);
});

test('sellerSignal and availableAttributes aliases normalize correctly', () => {
  const input = buildNegotiationInput({
    price: 900000,
    sellerSignal: { sellerType: 'dealer' },
    availableAttributes: { year: 2020 }
  });

  assert.ok(input);
  assert.equal(input.ownershipSignal.sellerType, 'dealer');
  assert.deepEqual(input.attributes, { year: 2020 });
  assert.equal(input.category, 'vehicle');
});

test('empty category falls back to vehicle', () => {
  const input = buildNegotiationInput({ price: 700000, category: '' });
  assert.ok(input);
  assert.equal(input.category, 'vehicle');
});

test('high risk signals produce high or medium negotiationRisk', () => {
  const result = runNegotiationIntelligenceEngine({
    category: 'vehicle',
    price: 1200000,
    marketReference: { priceDeltaPct: 18 },
    qualitySignal: { verificationLevel: 'none', listingQualityScore: 40 },
    ownershipSignal: { sellerType: 'dealer' },
    confidence: 0.35
  });

  assert.ok(result);
  assert.ok(['medium', 'high'].includes(result.negotiationRisk));
  assert.ok(result.evidenceSignals.length > 0);
  for (const signal of result.evidenceSignals) {
    assert.ok(signal.weight >= 0 && signal.weight <= 1);
    assert.ok(['positive', 'negative', 'neutral'].includes(signal.impact));
  }
});

test('favorable signals do not produce high negotiationRisk', () => {
  const result = runNegotiationIntelligenceEngine({
    category: 'vehicle',
    price: 800000,
    marketReference: { priceDeltaPct: -8 },
    qualitySignal: { verificationLevel: 'full', listingQualityScore: 88 },
    ownershipSignal: { sellerType: 'owner' },
    confidence: 0.9
  });

  assert.ok(result);
  assert.notEqual(result.negotiationRisk, 'high');
});

test('vehicle checklist includes Turkish expert/mileage items', () => {
  const input = buildNegotiationInput(VEHICLE_INPUT);
  const offerRange = buildOfferRange(input);
  const riskResult = assessNegotiationRisk(input, offerRange);
  const checklist = buildNegotiationChecklist(input, riskResult);

  const labels = checklist.map((item) => item.label.toLowerCase()).join(' ');
  assert.match(labels, /ekspertiz|hasar/);
  assert.match(labels, /kilometre|model yıl/);
  assertChecklistStatuses(checklist);
});

test('housing checklist includes tapu, aidat and konum items', () => {
  const input = buildNegotiationInput({
    category: 'housing',
    price: 5200000,
    marketReference: { medianPrice: 5000000 }
  });
  const offerRange = buildOfferRange(input);
  const riskResult = assessNegotiationRisk(input, offerRange);
  const checklist = buildNegotiationChecklist(input, riskResult);
  const labels = checklist.map((item) => item.label.toLowerCase()).join(' ');

  assert.match(labels, /tapu/);
  assert.match(labels, /aidat/);
  assert.match(labels, /konum/);
  assertChecklistStatuses(checklist);
});

test('vacation checklist includes cancellation, season and review items', () => {
  const input = buildNegotiationInput({
    category: 'vacation',
    price: 42000,
    marketReference: { medianPrice: 45000 }
  });
  const offerRange = buildOfferRange(input);
  const riskResult = assessNegotiationRisk(input, offerRange);
  const checklist = buildNegotiationChecklist(input, riskResult);
  const ids = new Set(checklist.map((item) => item.id));

  assert.equal(ids.has('verify_cancellation'), true);
  assert.equal(ids.has('verify_season'), true);
  assert.equal(ids.has('verify_reviews'), true);
  assertChecklistStatuses(checklist);
});

test('summary and warnings surface Turkish data-quality messages', () => {
  const input = buildNegotiationInput({
    category: 'vehicle',
    price: 900000,
    qualitySignal: { verificationLevel: 'none' },
    confidence: 0.4
  });
  const offerRange = buildOfferRange(input);
  const riskResult = assessNegotiationRisk(input, offerRange);
  const checklist = buildNegotiationChecklist(input, riskResult);
  const { summary, warnings } = buildNegotiationSummary(input, offerRange, riskResult, checklist);

  assert.match(summary, /TL/);
  assert.ok(warnings.some((warning) => /piyasa referans/i.test(warning)));
  assert.ok(warnings.some((warning) => /güven|girdi güveni/i.test(warning)));
  assert.ok(warnings.some((warning) => /doğrulama/i.test(warning)));
});

test('sanitizeNegotiationText neutralizes forbidden phrases', () => {
  const raw =
    'Kesin al, garanti kazanç, mutlaka al, risksiz, zararsız, en iyi fırsat.';
  const safe = sanitizeNegotiationText(raw);

  assertNoForbiddenPhrases(safe);
  assert.match(safe, /değerlendirilebilir/i);
});

test('engine summary does not contain overconfident phrases', () => {
  const result = runNegotiationIntelligenceEngine({
    category: 'vehicle',
    price: 1100000,
    marketReference: { priceDeltaPct: 15 },
    qualitySignal: { verificationLevel: 'none' },
    confidence: 0.45
  });

  assert.ok(result);
  assertNoForbiddenPhrases(result.summary);
  for (const warning of result.warnings) {
    assertNoForbiddenPhrases(warning);
  }
});

test('runNegotiationIntelligenceEngine is deterministic for identical input', () => {
  const first = runNegotiationIntelligenceEngine(VEHICLE_INPUT);
  const second = runNegotiationIntelligenceEngine(VEHICLE_INPUT);
  assert.deepEqual(first, second);
});

test('output schema remains stable across categories', () => {
  const categories = ['vehicle', 'housing', 'vacation'];
  for (const category of categories) {
    const result = runNegotiationIntelligenceEngine({
      category,
      price: 500000,
      marketReference: { medianPrice: 520000, priceDeltaPct: 2 }
    });
    assert.ok(result);
    assertStableOutputSchema(result);
  }
});
