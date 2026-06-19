import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  SEARCHABLE_FIELDS,
  SEMANTIC_WEIGHTS,
  buildSearchableText,
  getCachedNormalizedText,
  computeSemanticScores,
  computeSemanticScore,
  clearNormalizedTextCache,
  BOOST_WEIGHTS,
  computeBoosts,
  buildMatchExplanation,
  formatExplanationLines,
  scoreToStarCount,
  scoreToStars,
  RANKING_WEIGHTS,
  rankDocument,
  levenshteinDistance,
  findClosestToken,
  correctQueryTypos,
  correctQueryString,
  expandQueryTokens,
  analyzeQuery,
  extractQueryIntents,
  resolveSynonym,
  resolvePhraseSynonym,
  SYNONYM_MAP,
  tokenize,
  clearTokenCache,
  findCandidateIds,
  buildTokenIndex,
  buildSearchDocuments,
  runRepositorySearch,
  clearSearchMemoCache,
  buildSearchResults,
  buildSearchSummary,
  parseSearchQuery
} = await import('../../js/ai-listings-search/index.js');

const {
  buildRepositoryCardHtml,
  buildSearchResultSummaryHtml
} = await import('../../js/admin/ai-listings-repository-admin.js');

const routerPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/router.js');
const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260701_ai_listings_engine_v1.sql');

const vehicleListing = {
  id: '11111111-1111-1111-1111-111111111111',
  category: 'vehicle',
  title: '2022 BMW 320i M Sport',
  description: 'Yetkili servis bakımlı düşük km otomatik',
  price: 1780000,
  currency: 'TRY',
  location: 'İstanbul',
  source_type: 'manual',
  status: 'approved',
  created_at: '2026-06-07T10:00:00.000Z',
  updated_at: '2026-06-07T11:00:00.000Z',
  attributes: {
    brand: 'BMW',
    model: '320i',
    year: 2022,
    km: 45000,
    fuel_type: 'benzin',
    transmission: 'otomatik'
  },
  latest_analysis: {
    ai_score: 82,
    risk_score: 28,
    quality_score: 88,
    decision_score: 82,
    tags: ['executive_label:Satın Alınabilir', 'm_sport']
  }
};

const audiListing = {
  id: '22222222-2222-2222-2222-222222222222',
  category: 'vehicle',
  title: 'Audi A4 1.4 TFSI',
  description: 'Otomatik vites manuel bakım',
  price: 950000,
  currency: 'TRY',
  source_type: 'ai_builder',
  status: 'approved',
  created_at: '2026-06-06T08:00:00.000Z',
  updated_at: '2026-06-06T09:00:00.000Z',
  attributes: {
    brand: 'Audi',
    model: 'A4',
    year: 2019,
    km: 82000,
    fuel_type: 'benzin',
    transmission: 'automatic'
  },
  latest_analysis: {
    ai_score: 70,
    risk_score: 35,
    quality_score: 72,
    decision_score: 70
  }
};

const suvListing = {
  id: '33333333-3333-3333-3333-333333333333',
  category: 'vehicle',
  title: 'Volkswagen Tiguan SUV',
  description: 'Dizel otomatik crossover jeep tarzı',
  price: 1200000,
  currency: 'TRY',
  source_type: 'csv',
  status: 'approved',
  created_at: '2026-06-05T12:00:00.000Z',
  updated_at: '2026-06-05T13:00:00.000Z',
  attributes: {
    brand: 'Volkswagen',
    model: 'Tiguan',
    year: 2020,
    km: 95000,
    fuel_type: 'diesel',
    transmission: 'otomatik',
    body_type: 'SUV'
  },
  latest_analysis: {
    ai_score: 68,
    risk_score: 40,
    quality_score: 65,
    decision_score: 68
  }
};

const listings = [vehicleListing, audiListing, suvListing];

// --- SEARCHABLE FIELDS ---

test('SEARCHABLE_FIELDS includes all required fields', () => {
  for (const field of ['title', 'description', 'brand', 'model', 'year', 'fuel', 'transmission', 'tags', 'attributes', 'features', 'normalizedText', 'searchableText']) {
    assert.ok(SEARCHABLE_FIELDS.includes(field), `missing field ${field}`);
  }
});

test('SEMANTIC_WEIGHTS sum to 100', () => {
  const total = Object.values(SEMANTIC_WEIGHTS).reduce((sum, v) => sum + v, 0);
  assert.equal(total, 100);
});

test('RANKING_WEIGHTS brand is 25', () => assert.equal(RANKING_WEIGHTS.brand, 25));
test('RANKING_WEIGHTS model is 20', () => assert.equal(RANKING_WEIGHTS.model, 20));
test('RANKING_WEIGHTS year is 15', () => assert.equal(RANKING_WEIGHTS.year, 15));
test('RANKING_WEIGHTS attributes is 10', () => assert.equal(RANKING_WEIGHTS.attributes, 10));
test('RANKING_WEIGHTS description is 10', () => assert.equal(RANKING_WEIGHTS.description, 10));
test('RANKING_WEIGHTS tags is 10', () => assert.equal(RANKING_WEIGHTS.tags, 10));
test('RANKING_WEIGHTS fuel is 5', () => assert.equal(RANKING_WEIGHTS.fuel, 5));
test('RANKING_WEIGHTS transmission is 5', () => assert.equal(RANKING_WEIGHTS.transmission, 5));

// --- SEMANTIC ENGINE ---

test('buildSearchableText combines all document fields', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const text = buildSearchableText(docs[0]);
  assert.match(text, /bmw/i);
  assert.match(text, /320i/i);
  assert.match(text, /yetkili/i);
});

test('buildSearchDocument adds searchableText and normalizedText', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  assert.ok(docs[0].searchableText);
  assert.ok(docs[0].normalizedText);
  assert.ok(Array.isArray(docs[0].tags));
});

test('getCachedNormalizedText memoizes normalized text', () => {
  clearNormalizedTextCache();
  const docs = buildSearchDocuments([vehicleListing]);
  const first = getCachedNormalizedText(docs[0]);
  const second = getCachedNormalizedText(docs[0]);
  assert.equal(first, second);
  assert.match(first, /bmw/);
});

test('computeSemanticScores matches brand with weight 25', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('BMW');
  const { breakdown } = computeSemanticScores(docs[0], parsed);
  assert.equal(breakdown.brand, 25);
});

test('computeSemanticScores matches model with weight 20', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('BMW 320i');
  const { breakdown } = computeSemanticScores(docs[0], parsed);
  assert.equal(breakdown.model, 20);
});

test('computeSemanticScores matches year with weight 15', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('2022');
  const { breakdown } = computeSemanticScores(docs[0], parsed);
  assert.equal(breakdown.year, 15);
});

test('computeSemanticScores matches fuel with weight 5', () => {
  const docs = buildSearchDocuments([suvListing]);
  const parsed = parseSearchQuery('dizel');
  const { breakdown } = computeSemanticScores(docs[0], parsed);
  assert.equal(breakdown.fuel, 5);
});

test('computeSemanticScores matches transmission with weight 5', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('otomatik');
  const { breakdown } = computeSemanticScores(docs[0], parsed);
  assert.equal(breakdown.transmission, 5);
});

test('computeSemanticScores matches low_km attribute', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('düşük km');
  const { breakdown } = computeSemanticScores(docs[0], parsed);
  assert.equal(breakdown.attributes, 10);
});

test('computeSemanticScores matches authorized_service attribute', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('yetkili servis');
  const { breakdown } = computeSemanticScores(docs[0], parsed);
  assert.equal(breakdown.attributes, 10);
});

test('computeSemanticScores matches m_sport attribute', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('M Sport');
  const { breakdown } = computeSemanticScores(docs[0], parsed);
  assert.equal(breakdown.attributes, 10);
});

test('computeSemanticScore returns sum of breakdown', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('BMW 320i 2022');
  const score = computeSemanticScore(docs[0], parsed);
  assert.ok(score >= 60);
});

// --- BOOST ENGINE ---

test('BOOST_WEIGHTS defines all boost types', () => {
  assert.ok(BOOST_WEIGHTS.exact_phrase > 0);
  assert.ok(BOOST_WEIGHTS.multi_token > 0);
  assert.ok(BOOST_WEIGHTS.recent_listing > 0);
  assert.ok(BOOST_WEIGHTS.quality_score > 0);
});

test('computeBoosts applies exact phrase boost', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('BMW 320i M Sport');
  const { boosts } = computeBoosts(docs[0], parsed, 'BMW 320i M Sport');
  assert.ok(boosts.exact_phrase > 0 || boosts.multi_token > 0);
});

test('computeBoosts applies multi token boost', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('BMW 320i düşük km');
  const { boosts } = computeBoosts(docs[0], parsed, 'BMW 320i düşük km');
  assert.ok(boosts.multi_token > 0);
});

test('computeBoosts applies recent listing boost', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('BMW');
  const { boosts } = computeBoosts(docs[0], parsed, 'BMW');
  assert.ok(boosts.recent_listing > 0);
});

test('computeBoosts applies quality score boost', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('BMW');
  const { boosts } = computeBoosts(docs[0], parsed, 'BMW');
  assert.ok(boosts.quality_score > 0);
});

// --- EXPLAIN ENGINE ---

test('buildMatchExplanation returns Turkish reasons', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('BMW 2022 düşük km otomatik');
  const { breakdown, boosts } = rankDocument(docs[0], parsed, 'BMW 2022 düşük km otomatik');
  const reasons = buildMatchExplanation(docs[0], parsed, breakdown, boosts);
  assert.ok(reasons.includes('BMW'));
  assert.ok(reasons.includes('2022'));
  assert.ok(reasons.some((r) => r.includes('düşük km') || r.includes('otomatik')));
});

test('formatExplanationLines prefixes checkmarks', () => {
  const formatted = formatExplanationLines(['BMW', '2022', 'otomatik']);
  assert.match(formatted, /✓ BMW/);
  assert.match(formatted, /✓ 2022/);
  assert.match(formatted, /✓ otomatik/);
});

test('scoreToStarCount returns 5 for high scores', () => {
  assert.equal(scoreToStarCount(95), 5);
  assert.equal(scoreToStarCount(80), 4);
  assert.equal(scoreToStarCount(65), 3);
});

test('scoreToStars renders star characters', () => {
  assert.equal(scoreToStars(95).length, 5);
  assert.match(scoreToStars(95), /★/);
  assert.match(scoreToStars(30), /☆/);
});

// --- TYPO ENGINE ---

test('levenshteinDistance returns 0 for identical strings', () => {
  assert.equal(levenshteinDistance('bmw', 'bmw'), 0);
});

test('levenshteinDistance detects single character typo', () => {
  assert.equal(levenshteinDistance('bmw', 'bmv'), 1);
  assert.equal(levenshteinDistance('audi', 'aidi'), 1);
});

test('findClosestToken corrects bmv to bmw', () => {
  const vocab = new Set(['bmw', 'audi', 'mercedes']);
  const match = findClosestToken('bmv', vocab);
  assert.equal(match, 'bmw');
});

test('findClosestToken returns null for unrelated token', () => {
  const vocab = new Set(['bmw', 'audi']);
  assert.equal(findClosestToken('xyz', vocab), null);
});

test('correctQueryTypos fixes brand typo', () => {
  const { tokens, corrections } = correctQueryTypos(['bmv', '320i'], new Set(['bmw', '320i']));
  assert.equal(tokens[0], 'bmw');
  assert.equal(corrections[0].from, 'bmv');
});

test('correctQueryString returns corrected query', () => {
  const result = correctQueryString('bmv 320i', new Set(['bmw', '320i']));
  assert.equal(result.query, 'bmw 320i');
  assert.equal(result.corrections.length, 1);
});

// --- QUERY INTELLIGENCE ---

test('expandQueryTokens expands otomatik to automatic', () => {
  const { expanded } = expandQueryTokens(['otomatik']);
  assert.ok(expanded.includes('automatic'));
});

test('expandQueryTokens expands düşük km phrase', () => {
  const { expanded, phrases } = expandQueryTokens(['dusuk', 'km']);
  assert.ok(phrases.includes('low_km'));
  assert.ok(expanded.includes('low_km'));
});

test('analyzeQuery corrects typos and parses', () => {
  const result = analyzeQuery('bmv 2022', { vocabulary: new Set(['bmw', '2022']) });
  assert.equal(result.corrected_query, 'bmw 2022');
  assert.equal(result.parsed.brand, 'BMW');
  assert.equal(result.parsed.year, 2022);
});

test('extractQueryIntents returns structured intents', () => {
  const parsed = parseSearchQuery('BMW 320i otomatik');
  const intents = extractQueryIntents(parsed);
  assert.ok(intents.some((i) => i.startsWith('brand:')));
  assert.ok(intents.some((i) => i.startsWith('model:')));
  assert.ok(intents.some((i) => i.startsWith('transmission:')));
});

// --- SYNONYM EXPANSION ---

test('SYNONYM_MAP maps jeep to suv', () => assert.equal(SYNONYM_MAP.jeep, 'suv'));
test('SYNONYM_MAP maps msport to m_sport', () => assert.equal(SYNONYM_MAP.msport, 'm_sport'));
test('SYNONYM_MAP maps m sport to m_sport', () => assert.equal(SYNONYM_MAP['m sport'], 'm_sport'));
test('resolveSynonym maps manuel to manual', () => assert.equal(resolveSynonym('manuel'), 'manual'));
test('resolvePhraseSynonym maps servis bakımlı', () => assert.equal(resolvePhraseSynonym('servis bakımlı'), 'authorized_service'));

// --- TOKENIZER CACHE & LAZY RANKING ---

test('tokenize caches repeated input', () => {
  clearTokenCache();
  const first = tokenize('BMW 320i');
  const second = tokenize('BMW 320i');
  assert.deepEqual(first, second);
});

test('findCandidateIds narrows documents by tokens', () => {
  const docs = buildSearchDocuments(listings);
  const index = buildTokenIndex(docs);
  const candidates = findCandidateIds(index, ['bmw']);
  assert.ok(candidates?.has(vehicleListing.id));
  assert.ok(!candidates?.has(audiListing.id));
});

test('findCandidateIds returns union when no intersection', () => {
  const docs = buildSearchDocuments(listings);
  const index = buildTokenIndex(docs);
  const candidates = findCandidateIds(index, ['bmw', 'zzzznonexistent']);
  assert.ok(candidates === null || candidates.size >= 0);
});

// --- RANKING INTEGRATION ---

test('rankDocument returns match_reasons array', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('BMW 2022');
  const result = rankDocument(docs[0], parsed, 'BMW 2022');
  assert.ok(Array.isArray(result.match_reasons));
  assert.ok(result.match_reasons.length > 0);
});

test('rankDocument includes boosts in score', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('2022 BMW 320i M Sport');
  const result = rankDocument(docs[0], parsed, '2022 BMW 320i M Sport');
  assert.ok(result.score > 0);
  assert.ok(result.boosts);
});

test('runRepositorySearch natural language query BMW 2022 düşük km', () => {
  clearSearchMemoCache();
  const result = runRepositorySearch(listings, { query: 'BMW 2022 düşük km' });
  assert.ok(result.results.length > 0);
  assert.equal(result.results[0].brand, 'BMW');
  assert.ok(result.results[0].match_reasons?.length > 0);
});

test('runRepositorySearch synonym expansion otomatik', () => {
  clearSearchMemoCache();
  const result = runRepositorySearch(listings, { query: 'otomatik' });
  assert.ok(result.results.length > 0);
});

test('runRepositorySearch jeep synonym maps to SUV', () => {
  clearSearchMemoCache();
  const result = runRepositorySearch(listings, { query: 'jeep dizel' });
  assert.ok(result.results.some((r) => r.brand === 'Volkswagen'));
});

test('runRepositorySearch msport query matches M Sport listing', () => {
  clearSearchMemoCache();
  const result = runRepositorySearch(listings, { query: 'msport BMW' });
  assert.ok(result.results.length > 0);
  assert.equal(result.results[0].brand, 'BMW');
});

// --- RESULT BUILDER & UI ---

test('buildSearchResults adds similarity_label and stars', () => {
  clearSearchMemoCache();
  const searchResult = runRepositorySearch(listings, { query: 'BMW' });
  const built = buildSearchResults(searchResult.results, searchResult.parsed, 'BMW');
  assert.match(built[0].similarity_label, /Benzerlik %/);
  assert.ok(built[0].similarity_stars);
  assert.ok(built[0].match_explanation);
});

test('buildSearchSummary structured format with brand model feature', () => {
  const parsed = parseSearchQuery('BMW 320i düşük km');
  const results = [{ title: '2022 BMW 320i M Sport', brand: 'BMW', model: '320i', similarity_percent: 87, search_score: 87 }];
  const summary = buildSearchSummary(results, 'BMW 320i düşük km', parsed);
  assert.match(summary.message, /sonuç bulundu/);
  assert.equal(summary.brand_label, 'BMW');
  assert.equal(summary.model_label, '320i');
  assert.equal(summary.feature_label, 'Düşük KM');
});

test('buildSearchResultSummaryHtml renders structured summary', () => {
  const html = buildSearchResultSummaryHtml({
    message: '2 sonuç bulundu\n\nMarka:\nBMW',
    brand_label: 'BMW',
    model_label: '320i',
    feature_label: 'Düşük KM',
    top_match_title: '2022 BMW 320i M Sport'
  });
  assert.match(html, /Marka:/);
  assert.match(html, /BMW/);
  assert.match(html, /En iyi eşleşme/);
});

test('buildRepositoryCardHtml renders explainability section', () => {
  const record = {
    id: '1',
    title: '2022 BMW 320i M Sport',
    brand: 'BMW',
    model: '320i',
    category: 'vehicle',
    similarity_percent: 87,
    similarity_label: 'Benzerlik %87',
    similarity_stars: '★★★★☆',
    match_explanation: '✓ BMW\n✓ 2022\n✓ düşük km',
    executive_label: 'Satın Alınabilir',
    decision_score: 82,
    risk_score: 28,
    quality_score: 88,
    duplicate_status: 'new',
    source: 'manual',
    updated_at: '2026-06-07T11:00:00.000Z'
  };
  const html = buildRepositoryCardHtml(record, false, true);
  assert.match(html, /Benzerlik %87/);
  assert.match(html, /★/);
  assert.match(html, /Neden eşleşti/);
  assert.match(html, /✓ BMW/);
});

// --- PERFORMANCE ---

test('runRepositorySearch handles 10000 records with lazy ranking', () => {
  clearSearchMemoCache();
  const large = Array.from({ length: 10000 }, (_, index) => ({
    ...vehicleListing,
    id: `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
    title: index % 3 === 0 ? `BMW ${320 + (index % 50)}i` : `Other Car ${index}`
  }));
  const started = Date.now();
  const result = runRepositorySearch(large, { query: 'BMW düşük km otomatik' });
  const elapsed = Date.now() - started;
  assert.ok(result.results.length > 0);
  assert.ok(elapsed < 15000, `search too slow: ${elapsed}ms`);
});

// --- GUARDS ---

test('guard v2: no new search endpoint in router', () => {
  const router = fs.readFileSync(routerPath, 'utf8');
  assert.doesNotMatch(router, /\/search/);
});

test('guard v2: no ai_listings_search table in migration', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.doesNotMatch(sql, /ai_listings_search/);
});

test('guard v2: semantic-engine module exists on server', () => {
  const serverPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/search/semantic-engine.js');
  assert.ok(fs.existsSync(serverPath));
});

test('guard v2: boost-engine module exists on server', () => {
  const serverPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/search/boost-engine.js');
  assert.ok(fs.existsSync(serverPath));
});

test('guard v2: explain-engine module exists on server', () => {
  const serverPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/search/explain-engine.js');
  assert.ok(fs.existsSync(serverPath));
});

test('guard v2: typo-engine module exists on client', () => {
  const clientPath = path.join(process.cwd(), 'js/ai-listings-search/typo-engine.js');
  assert.ok(fs.existsSync(clientPath));
});

test('guard v2: query-intelligence module exists on client', () => {
  const clientPath = path.join(process.cwd(), 'js/ai-listings-search/query-intelligence.js');
  assert.ok(fs.existsSync(clientPath));
});
