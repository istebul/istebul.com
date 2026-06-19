import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  runExecutiveEngine,
  computeExecutiveScore,
  buildExplainability,
  buildExecutiveTags,
  parseExecutiveFromTags
} = await import('../../supabase/functions/_shared/ai-listings/executive/executive-engine.js');

const { computeExecutiveConfidence } = await import(
  '../../supabase/functions/_shared/ai-listings/executive/decision-confidence.js'
);
const { buildExecutiveSummary } = await import(
  '../../supabase/functions/_shared/ai-listings/executive/executive-summary.js'
);
const {
  getExecutiveLabel,
  buildExecutiveStrengths,
  buildExecutiveRisks,
  buildExecutiveRecommendations,
  containsForbiddenExecutivePhrase,
  findForbiddenExecutivePhrases,
  FORBIDDEN_EXECUTIVE_PHRASES
} = await import('../../supabase/functions/_shared/ai-listings/executive/executive-recommendation.js');

const {
  runCanonicalEngine,
  normalizeCanonicalListing,
  buildAnalysisRecord
} = await import('../../supabase/functions/_shared/ai-listings/engine/canonical-engine.js');
const { runQualityEngine } = await import(
  '../../supabase/functions/_shared/ai-listings/engine/quality-engine.js'
);
const { runMarketEngine } = await import(
  '../../supabase/functions/_shared/ai-listings/engine/market-engine.js'
);
const { runRiskEngine } = await import(
  '../../supabase/functions/_shared/ai-listings/engine/risk-engine.js'
);
const { runDecisionEngine } = await import(
  '../../supabase/functions/_shared/ai-listings/engine/decision-engine.js'
);
const { runMarketIntelligence } = await import(
  '../../supabase/functions/_shared/ai-listings/market-intelligence/market-intelligence.js'
);

const {
  buildExecutiveDecisionCardHtml,
  resolveExecutiveForListing
} = await import('../../js/admin/ai-listings-admin-core.js');
const { buildExecutivePreviewHtml } = await import(
  '../../js/ai-listings-engine/executive/executive-preview.js'
);
const { buildPreviewHtml } = await import('../../js/ai-listings-builder/preview-builder.js');

const sampleListing = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  category: 'vehicle',
  title: 'BMW 320i M Sport Düşük KM',
  description: 'Yetkili servis bakımlı, servis kayıtlı, detaylı açıklama ile temiz araç.',
  price: 900000,
  currency: 'TRY',
  location: 'İstanbul',
  images: ['https://example.com/1.jpg'],
  source_url: 'https://example.com/listing/1',
  attributes: {
    year: 2024,
    km: 45000,
    brand: 'BMW',
    model: '320i',
    transmission: 'Otomatik'
  },
  source_type: 'manual'
};

function buildEngineBundle(listing, duplicate = null) {
  const canonical = normalizeCanonicalListing(listing);
  const quality = runQualityEngine(canonical);
  const market = runMarketEngine(canonical);
  const risk = runRiskEngine(canonical, quality);
  const market_intelligence = runMarketIntelligence(canonical, { quality, risk, market });
  const decision = runDecisionEngine(canonical, quality, market, risk);
  return {
    canonical,
    quality,
    market,
    risk,
    market_intelligence,
    decision,
    duplicate
  };
}

test('getExecutiveLabel maps v2 score bands', () => {
  assert.equal(getExecutiveLabel(95), 'Satın Alınabilir');
  assert.equal(getExecutiveLabel(82), 'İncelenebilir');
  assert.equal(getExecutiveLabel(68), 'Dikkatli İncelenmeli');
  assert.equal(getExecutiveLabel(50), 'Riskli');
  assert.equal(getExecutiveLabel(25), 'Önerilmez');
});

test('computeExecutiveScore combines engine signals', () => {
  const score = computeExecutiveScore(85, 75, 80, 25, 78, { status: 'new' });
  assert.ok(score >= 60 && score <= 100);
});

test('computeExecutiveScore penalizes duplicate matches', () => {
  const clean = computeExecutiveScore(80, 70, 75, 30, 75, { status: 'new' });
  const duplicate = computeExecutiveScore(80, 70, 75, 30, 75, { status: 'exact' });
  assert.ok(duplicate < clean);
});

test('computeExecutiveConfidence stays within 0-100', () => {
  const bundle = buildEngineBundle(sampleListing);
  const confidence = computeExecutiveConfidence(
    {
      quality: bundle.quality,
      price_intelligence: bundle.market,
      market_intelligence: bundle.market_intelligence,
      risk: bundle.risk,
      duplicate: null
    },
    bundle.canonical
  );
  assert.ok(confidence >= 0 && confidence <= 100);
});

test('computeExecutiveConfidence drops with missing fields', () => {
  const sparse = normalizeCanonicalListing({
    ...sampleListing,
    description: '',
    location: '',
    images: [],
    source_url: ''
  });
  const sparseQuality = runQualityEngine(sparse);
  const sparseMarket = runMarketEngine(sparse);
  const sparseRisk = runRiskEngine(sparse, sparseQuality);
  const fullConfidence = computeExecutiveConfidence(
    {
      quality: buildEngineBundle(sampleListing).quality,
      price_intelligence: buildEngineBundle(sampleListing).market,
      market_intelligence: buildEngineBundle(sampleListing).market_intelligence,
      risk: buildEngineBundle(sampleListing).risk,
      duplicate: null
    },
    buildEngineBundle(sampleListing).canonical
  );
  const sparseConfidence = computeExecutiveConfidence(
    {
      quality: sparseQuality,
      price_intelligence: sparseMarket,
      market_intelligence: runMarketIntelligence(sparse, {
        quality: sparseQuality,
        risk: sparseRisk,
        market: sparseMarket
      }),
      risk: sparseRisk,
      duplicate: null
    },
    sparse
  );
  assert.ok(sparseConfidence < fullConfidence);
});

test('buildExecutiveSummary uses allowed phrasing only', () => {
  const summary = buildExecutiveSummary({
    executive_label: 'İncelenebilir',
    executive_confidence: 84,
    quality: { quality_score: 82, missing_fields: ['Fotoğraf'] },
    price_intelligence: { price_score: 75 },
    risk: { risk_score: 28 }
  });
  assert.match(summary, /mevcut bilgiler ışığında/i);
  assert.match(summary, /deterministik analiz/i);
  assert.match(summary, /ön değerlendirme/i);
  assert.equal(containsForbiddenExecutivePhrase(summary), false);
});

test('forbidden executive wording is detected', () => {
  for (const phrase of FORBIDDEN_EXECUTIVE_PHRASES) {
    assert.equal(containsForbiddenExecutivePhrase(`Bu ilan ${phrase} ile değerlendirildi.`), true);
  }
  assert.deepEqual(findForbiddenExecutivePhrases('garanti ve yatırım tavsiyesi'), [
    'garanti',
    'yatırım tavsiyesi'
  ]);
});

test('buildExecutiveStrengths extracts listing positives', () => {
  const bundle = buildEngineBundle(sampleListing);
  const strengths = buildExecutiveStrengths(bundle.canonical, {
    quality: bundle.quality,
    price_intelligence: bundle.market,
    market_intelligence: bundle.market_intelligence,
    decision: bundle.decision
  });
  assert.ok(strengths.includes('Yetkili servis'));
  assert.ok(strengths.includes('Düşük KM'));
  assert.ok(strengths.includes('Otomatik'));
  assert.ok(strengths.includes('Detaylı açıklama'));
});

test('buildExecutiveRisks maps missing fields to Turkish labels', () => {
  const sparse = normalizeCanonicalListing({
    ...sampleListing,
    images: [],
    location: '',
    source_url: ''
  });
  const quality = runQualityEngine(sparse);
  const risks = buildExecutiveRisks(sparse, { quality, risk: { risk_factors: [] }, duplicate: null });
  assert.ok(risks.includes('Fotoğraf eksik'));
  assert.ok(risks.includes('Konum eksik'));
  assert.ok(risks.includes('Kaynak URL eksik'));
});

test('buildExecutiveRecommendations suggests actionable fixes', () => {
  const sparse = normalizeCanonicalListing({
    ...sampleListing,
    images: [],
    location: ''
  });
  const quality = runQualityEngine(sparse);
  const recommendations = buildExecutiveRecommendations(sparse, {
    quality,
    risk: { risk_score: 20 },
    duplicate: null
  });
  assert.ok(recommendations.includes('Eksik görseller eklenmeli'));
  assert.ok(recommendations.includes('Konum belirtilmeli'));
  assert.ok(recommendations.includes('Servis kayıtları doğrulanmalı'));
});

test('buildExplainability returns impact objects', () => {
  const bundle = buildEngineBundle(sampleListing);
  const explainability = buildExplainability(
    {
      quality: bundle.quality,
      price_intelligence: bundle.market,
      market_intelligence: bundle.market_intelligence,
      risk: bundle.risk,
      decision: bundle.decision,
      duplicate: null
    },
    bundle.canonical
  );
  assert.ok(Array.isArray(explainability));
  assert.ok(explainability.length >= 4);
  assert.ok(explainability.every((item) => typeof item.id === 'string' && Number.isFinite(item.impact)));
  assert.ok(explainability.some((item) => item.id === 'quality'));
});

test('runExecutiveEngine returns full output shape', () => {
  const bundle = buildEngineBundle(sampleListing);
  const executive = runExecutiveEngine(bundle.canonical, {
    quality: bundle.quality,
    price_intelligence: bundle.market,
    market_intelligence: bundle.market_intelligence,
    risk: bundle.risk,
    duplicate: null,
    decision: bundle.decision
  });

  assert.ok(executive.executive_score >= 0 && executive.executive_score <= 100);
  assert.ok(executive.executive_confidence >= 0 && executive.executive_confidence <= 100);
  assert.ok(executive.executive_label.length > 0);
  assert.ok(executive.executive_summary.length > 0);
  assert.ok(Array.isArray(executive.strengths));
  assert.ok(Array.isArray(executive.risks));
  assert.ok(Array.isArray(executive.recommendations));
  assert.ok(Array.isArray(executive.explainability));
});

test('runCanonicalEngine includes context.executive', () => {
  const result = runCanonicalEngine({ listing: sampleListing });
  assert.equal(result.ok, true);
  assert.ok(result.context.executive);
  assert.ok(result.context.executive.executive_score >= 0);
});

test('buildAnalysisRecord encodes executive tags', () => {
  const bundle = buildEngineBundle(sampleListing);
  const executive = runExecutiveEngine(bundle.canonical, {
    quality: bundle.quality,
    price_intelligence: bundle.market,
    market_intelligence: bundle.market_intelligence,
    risk: bundle.risk,
    duplicate: null,
    decision: bundle.decision
  });
  const record = buildAnalysisRecord(bundle.canonical, {
    quality: bundle.quality,
    market: bundle.market,
    risk: bundle.risk,
    decision: bundle.decision,
    market_intelligence: bundle.market_intelligence,
    executive
  });

  assert.ok(record.tags.some((tag) => tag.startsWith('executive_score:')));
  assert.ok(record.tags.some((tag) => tag.startsWith('executive_confidence:')));
  assert.ok(record.tags.some((tag) => tag.startsWith('executive_label:')));
  assert.deepEqual(buildExecutiveTags(executive), [
    `executive_score:${executive.executive_score}`,
    `executive_confidence:${executive.executive_confidence}`,
    `executive_label:${executive.executive_label}`
  ]);
});

test('parseExecutiveFromTags reads encoded tags', () => {
  const parsed = parseExecutiveFromTags([
    'executive_score:82',
    'executive_confidence:84',
    'executive_label:İncelenebilir'
  ]);
  assert.equal(parsed.executive_score, 82);
  assert.equal(parsed.executive_confidence, 84);
  assert.equal(parsed.executive_label, 'İncelenebilir');
});

test('buildExecutiveDecisionCardHtml renders admin card', () => {
  const html = buildExecutiveDecisionCardHtml(sampleListing, {
    tags: ['executive_score:82', 'executive_confidence:84', 'executive_label:İncelenebilir']
  });
  assert.match(html, /AI Yönetici Kararı/);
  assert.match(html, /Yönetici Skoru/);
  assert.match(html, /Karar Güveni/);
  assert.match(html, /Güçlü Yönler/);
  assert.match(html, /Riskler/);
  assert.match(html, /Öneriler/);
});

test('resolveExecutiveForListing falls back without tags', () => {
  const executive = resolveExecutiveForListing(sampleListing, null);
  assert.ok(executive.executive_score >= 0);
  assert.ok(executive.executive_label.length > 0);
});

test('buildExecutivePreviewHtml renders builder block', () => {
  const bundle = buildEngineBundle(sampleListing);
  const executive = runExecutiveEngine(bundle.canonical, {
    quality: bundle.quality,
    price_intelligence: bundle.market,
    market_intelligence: bundle.market_intelligence,
    risk: bundle.risk,
    duplicate: null,
    decision: bundle.decision
  });
  const html = buildExecutivePreviewHtml(executive);
  assert.match(html, /AI Ön Kararı/);
  assert.match(html, /Karar/);
  assert.match(html, /Karar Güveni/);
  assert.match(html, /84|deterministik/i);
});

test('buildPreviewHtml includes executive preview block', () => {
  const html = buildPreviewHtml({
    input_type: 'text',
    confidence: 88,
    category: 'vehicle',
    title: 'BMW 320i',
    description: 'Yetkili servis bakımlı detaylı açıklama.',
    price: 900000,
    currency: 'TRY',
    location: 'İstanbul',
    attributes: {
      brand: 'BMW',
      model: '320i',
      year: 2024,
      km: 40000,
      transmission: 'Otomatik'
    },
    missing_fields: [],
    extraction_warnings: []
  });
  assert.match(html, /data-executive-preview/);
  assert.match(html, /AI Ön Kararı/);
});

test('duplicate similar status reduces executive score via engine input', () => {
  const bundle = buildEngineBundle(sampleListing);
  const withoutDuplicate = runExecutiveEngine(bundle.canonical, {
    quality: bundle.quality,
    price_intelligence: bundle.market,
    market_intelligence: bundle.market_intelligence,
    risk: bundle.risk,
    duplicate: null,
    decision: bundle.decision
  });
  const withDuplicate = runExecutiveEngine(bundle.canonical, {
    quality: bundle.quality,
    price_intelligence: bundle.market,
    market_intelligence: bundle.market_intelligence,
    risk: bundle.risk,
    duplicate: { status: 'similar', similarity: 88 },
    decision: bundle.decision
  });
  assert.ok(withDuplicate.executive_score <= withoutDuplicate.executive_score);
});

test('executive label aligns with executive score bands', () => {
  const bundle = buildEngineBundle(sampleListing);
  const executive = runExecutiveEngine(bundle.canonical, {
    quality: bundle.quality,
    price_intelligence: bundle.market,
    market_intelligence: bundle.market_intelligence,
    risk: bundle.risk,
    duplicate: null,
    decision: bundle.decision
  });
  assert.equal(executive.executive_label, getExecutiveLabel(executive.executive_score));
});

test('executive summary mentions missing photo guidance when applicable', () => {
  const summary = buildExecutiveSummary({
    executive_label: 'Dikkatli İncelenmeli',
    executive_confidence: 62,
    quality: { quality_score: 55, missing_fields: ['Fotoğraf', 'Konum'] },
    price_intelligence: { price_score: 60 },
    risk: { risk_score: 45 }
  });
  assert.match(summary, /eksik fotoğraf ve konum/i);
});

test('buildExecutiveRisks includes duplicate warning', () => {
  const bundle = buildEngineBundle(sampleListing);
  const risks = buildExecutiveRisks(bundle.canonical, {
    quality: bundle.quality,
    risk: bundle.risk,
    duplicate: { status: 'exact', similarity: 98 }
  });
  assert.ok(risks.includes('Olası mükerrer kayıt'));
});

test('buildExecutiveRecommendations includes duplicate follow-up', () => {
  const bundle = buildEngineBundle(sampleListing);
  const recommendations = buildExecutiveRecommendations(bundle.canonical, {
    quality: bundle.quality,
    risk: bundle.risk,
    duplicate: { status: 'similar', similarity: 86 }
  });
  assert.ok(recommendations.includes('Mükerrer kayıt kontrolü yapılmalı'));
});

test('explainability includes missing photo impact when photos absent', () => {
  const sparse = normalizeCanonicalListing({ ...sampleListing, images: [] });
  const quality = runQualityEngine(sparse);
  const explainability = buildExplainability(
    { quality, price_intelligence: {}, market_intelligence: {}, risk: {}, decision: {}, duplicate: null },
    sparse
  );
  assert.ok(explainability.some((item) => item.id === 'missing_photos' && item.impact < 0));
});

test('no database schema changes for executive layer', () => {
  const schemaPath = path.join(process.cwd(), 'docs/ai-listings/DATABASE_SCHEMA.md');
  assert.ok(fs.existsSync(schemaPath));
  const schema = fs.readFileSync(schemaPath, 'utf8');
  assert.doesNotMatch(schema, /executive_score|executive_confidence|executive_label/i);
});

test('runExecutiveEngine strengths risks recommendations are bounded', () => {
  const bundle = buildEngineBundle(sampleListing);
  const executive = runExecutiveEngine(bundle.canonical, {
    quality: bundle.quality,
    price_intelligence: bundle.market,
    market_intelligence: bundle.market_intelligence,
    risk: bundle.risk,
    duplicate: null,
    decision: bundle.decision
  });
  assert.ok(executive.strengths.length <= 6);
  assert.ok(executive.risks.length <= 6);
  assert.ok(executive.recommendations.length <= 6);
});

test('computeExecutiveScore normalizes when price score missing', () => {
  const withPrice = computeExecutiveScore(80, 70, 75, 30, 75, {});
  const withoutPrice = computeExecutiveScore(80, 0, 75, 30, 75, {});
  assert.ok(withPrice >= 0 && withoutPrice >= 0);
  assert.notEqual(withPrice, withoutPrice);
});

test('executive confidence decreases with duplicate exact match', () => {
  const bundle = buildEngineBundle(sampleListing);
  const base = computeExecutiveConfidence(
    {
      quality: bundle.quality,
      price_intelligence: bundle.market,
      market_intelligence: bundle.market_intelligence,
      risk: bundle.risk,
      duplicate: null
    },
    bundle.canonical
  );
  const dup = computeExecutiveConfidence(
    {
      quality: bundle.quality,
      price_intelligence: bundle.market,
      market_intelligence: bundle.market_intelligence,
      risk: bundle.risk,
      duplicate: { status: 'exact', similarity: 99 }
    },
    bundle.canonical
  );
  assert.ok(dup < base);
});

test('buildExecutiveDecisionCardHtml escapes HTML in summary', () => {
  const html = buildExecutiveDecisionCardHtml({
    ...sampleListing,
    title: '<script>alert(1)</script>'
  });
  assert.doesNotMatch(html, /<script>/);
});

test('executive tags do not alter persisted analysis core fields', () => {
  const result = runCanonicalEngine({ listing: sampleListing });
  const analysis = result.analysis;
  assert.ok(Number.isFinite(analysis.ai_score));
  assert.ok(Number.isFinite(analysis.decision_score));
  assert.ok(Number.isFinite(analysis.risk_score));
  assert.equal(typeof analysis.summary, 'string');
});
