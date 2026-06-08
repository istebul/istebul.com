import test from 'node:test';
import assert from 'node:assert/strict';

const { buildListingFingerprint, hashFingerprint } = await import(
  '../../supabase/functions/_shared/ai-listings/duplicate/fingerprint-engine.js'
);
const { computeListingSimilarity, SIMILARITY_WEIGHTS } = await import(
  '../../supabase/functions/_shared/ai-listings/duplicate/similarity-engine.js'
);
const {
  runDuplicateEngine,
  resolveDuplicateStatus,
  buildDuplicateSummary
} = await import('../../supabase/functions/_shared/ai-listings/duplicate/duplicate-engine.js');
const {
  detectListingDuplicate,
  extractDuplicateFromEvents,
  toDuplicateOutput
} = await import('../../supabase/functions/_shared/ai-listings/duplicate/duplicate-workflow.js');
const { buildListingCardHtml, buildDuplicateCheckCardHtml, buildAnalysisTimelineHtml } = await import(
  '../../js/admin/ai-listings-admin-core.js'
);

const baseListing = {
  id: '11111111-1111-1111-1111-111111111111',
  category: 'vehicle',
  title: '2021 BMW 320i M Sport',
  description: 'Bakımlı, servis kayıtlı, tek elden kullanılmış araç.',
  price: 1250000,
  currency: 'TRY',
  location: 'İstanbul',
  source_url: 'https://example.com/listing/a',
  attributes: {
    brand: 'BMW',
    model: '320i',
    year: 2021,
    km: 42000,
    fuel_type: 'benzin',
    transmission: 'otomatik'
  }
};

const nearDuplicate = {
  id: '22222222-2222-2222-2222-222222222222',
  category: 'vehicle',
  title: '2021 BMW 320i',
  description: 'Bakımlı servis kayıtlı tek elden araç.',
  price: 1240000,
  currency: 'TRY',
  location: 'İstanbul',
  source_url: 'https://example.com/listing/b',
  attributes: {
    brand: 'BMW',
    model: '320i',
    year: 2021,
    km: 43000,
    fuel_type: 'benzin',
    transmission: 'otomatik'
  }
};

const differentListing = {
  id: '33333333-3333-3333-3333-333333333333',
  category: 'vehicle',
  title: '2015 Renault Clio',
  description: 'Şehir içi ekonomik araç.',
  price: 450000,
  currency: 'TRY',
  location: 'Ankara',
  source_url: 'https://example.com/listing/c',
  attributes: {
    brand: 'Renault',
    model: 'Clio',
    year: 2015,
    km: 180000,
    fuel_type: 'dizel',
    transmission: 'manuel'
  }
};

test('SIMILARITY_WEIGHTS total equals 100', () => {
  const total = Object.values(SIMILARITY_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  assert.equal(total, 100);
});

test('buildListingFingerprint is deterministic', () => {
  const first = buildListingFingerprint(baseListing);
  const second = buildListingFingerprint(baseListing);
  assert.equal(first.hash, second.hash);
  assert.ok(first.hash.length >= 8);
});

test('hashFingerprint returns stable hex hash', () => {
  assert.equal(hashFingerprint('test'), hashFingerprint('test'));
  assert.notEqual(hashFingerprint('test-a'), hashFingerprint('test-b'));
});

test('computeListingSimilarity returns 100 for identical source_url', () => {
  const left = { ...baseListing, source_url: 'https://example.com/same/' };
  const right = { ...nearDuplicate, source_url: 'https://example.com/same' };
  assert.equal(computeListingSimilarity(left, right), 100);
});

test('computeListingSimilarity scores near duplicates high', () => {
  const score = computeListingSimilarity(baseListing, nearDuplicate);
  assert.ok(score >= 80, `expected >= 80, got ${score}`);
});

test('computeListingSimilarity scores different listings low', () => {
  const score = computeListingSimilarity(baseListing, differentListing);
  assert.ok(score < 60, `expected < 60, got ${score}`);
});

test('resolveDuplicateStatus maps score bands', () => {
  assert.equal(resolveDuplicateStatus(96), 'exact');
  assert.equal(resolveDuplicateStatus(88), 'similar');
  assert.equal(resolveDuplicateStatus(70), 'similar');
  assert.equal(resolveDuplicateStatus(40), 'new');
});

test('runDuplicateEngine finds best match and excludes self', () => {
  const result = runDuplicateEngine(baseListing, [baseListing, nearDuplicate, differentListing]);
  assert.equal(result.matched_listing_id, nearDuplicate.id);
  assert.equal(result.status, 'similar');
  assert.ok(result.similarity >= 80);
  assert.ok(result.summary.includes('benzerlik') || result.summary.includes('eşleşme'));
});

test('runDuplicateEngine returns new when no candidates', () => {
  const result = runDuplicateEngine(baseListing, []);
  assert.equal(result.status, 'new');
  assert.equal(result.matched_listing_id, null);
  assert.equal(result.similarity, 0);
});

test('buildDuplicateSummary uses Turkish labels', () => {
  assert.match(buildDuplicateSummary('exact', 97, nearDuplicate), /%97/);
  assert.match(buildDuplicateSummary('similar', 82, nearDuplicate), /%82/);
  assert.match(buildDuplicateSummary('new', 0), /Benzer ilan bulunamadı/i);
});

test('detectListingDuplicate delegates to runDuplicateEngine', () => {
  const duplicate = detectListingDuplicate(baseListing, [nearDuplicate]);
  assert.equal(duplicate.status, 'similar');
  assert.ok(duplicate.similarity >= 80);
});

test('extractDuplicateFromEvents reads duplicate_detected payload', () => {
  const extracted = extractDuplicateFromEvents([
    { event_type: 'duplicate_checked', payload: { status: 'similar', similarity: 70 } },
    {
      event_type: 'duplicate_detected',
      payload: {
        status: 'exact',
        similarity: 97,
        matched_listing_id: nearDuplicate.id,
        summary: 'test'
      }
    }
  ]);
  assert.equal(extracted.status, 'exact');
  assert.equal(extracted.similarity, 97);
  assert.equal(extracted.matched_listing_id, nearDuplicate.id);
});

test('toDuplicateOutput exposes engine contract fields', () => {
  const duplicate = runDuplicateEngine(baseListing, [nearDuplicate]);
  const output = toDuplicateOutput(duplicate);
  assert.deepEqual(Object.keys(output).sort(), [
    'matched_listing_id',
    'similarity',
    'status',
    'summary'
  ]);
});

test('buildDuplicateCheckCardHtml renders smart merge actions', () => {
  const html = buildDuplicateCheckCardHtml(baseListing, nearDuplicate, {
    status: 'exact',
    similarity: 97,
    summary: 'test summary'
  });
  assert.match(html, /Benzer İlan Kontrolü/);
  assert.match(html, /Aynı ilan bulundu/);
  assert.match(html, /2021 BMW 320i/);
  assert.match(html, /Mevcut ilanı aç/);
  assert.match(html, /Yeni kayıt olarak bırak/);
  assert.doesNotMatch(html, /Bilgileri güncelle/);
});

test('buildListingCardHtml shows duplicate label for similar listings', () => {
  const html = buildListingCardHtml(baseListing, false, {
    candidates: [nearDuplicate, differentListing]
  });
  assert.match(html, /Aynı ilan bulundu|Çok benzer ilan|Benzer ilan/);
  assert.doesNotMatch(html, /Duplicate %/);
});

test('buildAnalysisTimelineHtml includes duplicate workflow steps', () => {
  const html = buildAnalysisTimelineHtml(
    baseListing,
    { ai_score: 80 },
    [
      { event_type: 'listing_created' },
      { event_type: 'duplicate_checked' },
      { event_type: 'duplicate_detected' },
      { event_type: 'listing_analyzed' }
    ]
  );
  assert.match(html, /Benzer İlan Kontrolü/);
  assert.match(html, /Benzer İlan Tespiti/);
  assert.match(html, /Analiz Tamamlandı/);
});
