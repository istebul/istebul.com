import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  normalizeTurkishChars,
  normalizeText,
  normalizeToken,
  parseKmValue,
  parsePriceValue,
  sanitizeSearchQuery,
  tokenize,
  buildTokenIndex,
  resolveSynonym,
  resolvePhraseSynonym,
  SYNONYM_MAP,
  parseSearchQuery,
  extractKnownBrandsModels,
  RANKING_WEIGHTS,
  MIN_SIMILARITY_THRESHOLD,
  clampScore,
  scoreToSimilarityPercent,
  rankDocument,
  sortSearchResults,
  passesSimilarityThreshold,
  filterBySimilarityThreshold,
  enrichWithSimilarity,
  buildSearchSummary,
  SEARCH_SORT_OPTIONS,
  SEARCH_FILTER_CHIPS,
  buildSearchDocuments,
  runRepositorySearch,
  clearSearchMemoCache,
  highlightSearchTerms,
  escapeSearchHtml,
  buildSearchSuggestions,
  suggestionsAreFromDataset,
  buildSearchResults,
  buildResultSummary,
  SEARCHABLE_FIELDS,
  buildSearchableText,
  documentMatchesSearchQuery
} = await import('../../js/ai-listings-search/index.js');

const {
  buildRepositoryDashboardHtml,
  buildAiSearchSectionHtml,
  buildSearchResultSummaryHtml
} = await import('../../js/admin/ai-listings-repository-admin.js');

const routerPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/router.js');
const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260701_ai_listings_engine_v1.sql');
const adminHtmlPath = path.join(process.cwd(), 'admin/ai-listings.html');

const vehicleListing = {
  id: '11111111-1111-1111-1111-111111111111',
  category: 'vehicle',
  title: '2022 BMW 320i M Sport',
  description: 'Yetkili servis bakımlı düşük km',
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
    tags: ['executive_label:Satın Alınabilir']
  }
};

const audiListing = {
  id: '22222222-2222-2222-2222-222222222222',
  category: 'vehicle',
  title: 'Audi A4 1.4 TFSI',
  description: 'Otomatik vites',
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
  description: 'Dizel otomatik crossover',
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

const paintListing = {
  id: '44444444-4444-4444-4444-444444444444',
  category: 'vehicle',
  title: 'BMW 520i',
  description: 'Tek parça boya, lokal boya yok',
  price: 2100000,
  currency: 'TRY',
  source_type: 'json',
  status: 'draft',
  created_at: '2026-06-04T12:00:00.000Z',
  updated_at: '2026-06-04T13:00:00.000Z',
  attributes: {
    brand: 'BMW',
    model: '520i',
    year: 2021,
    km: 30000,
    fuel_type: 'benzin',
    transmission: 'otomatik'
  },
  latest_analysis: {
    ai_score: 75,
    risk_score: 30,
    quality_score: 80,
    decision_score: 75
  }
};

const partnerListing = {
  id: '55555555-5555-5555-5555-555555555555',
  category: 'vacation',
  title: 'Bodrum Yazlık',
  price: 15000,
  currency: 'TRY',
  source_type: 'partner_api',
  status: 'approved',
  created_at: '2026-06-03T12:00:00.000Z',
  updated_at: '2026-06-03T13:00:00.000Z',
  attributes: {}
};

const listings = [vehicleListing, audiListing, suvListing, paintListing, partnerListing];

test('normalizeTurkishChars converts Turkish characters', () => {
  assert.equal(normalizeTurkishChars('İstanbul Şişli'), 'istanbul sisli');
  assert.equal(normalizeTurkishChars('ğı ü ö ç ı'), 'gi u o c i');
});

test('normalizeText is case-insensitive and strips punctuation', () => {
  assert.equal(normalizeText('  BMW, 320i! '), 'bmw 320i');
});

test('normalizeToken removes separators', () => {
  assert.equal(normalizeToken('3.20i'), '320i');
});

test('parseKmValue parses dotted and bin formats', () => {
  assert.equal(parseKmValue('58.000 km'), 58000);
  assert.equal(parseKmValue('58000 km'), 58000);
  assert.equal(parseKmValue('58 bin km'), 58000);
});

test('parsePriceValue parses TL and milyon formats', () => {
  assert.equal(parsePriceValue('1.780.000 TL'), 1780000);
  assert.equal(parsePriceValue('1780000'), 1780000);
  assert.equal(parsePriceValue('1.78m'), 1780000);
});

test('sanitizeSearchQuery strips unsafe characters', () => {
  assert.equal(sanitizeSearchQuery('<script>alert(1)</script>'), 'scriptalert(1)/script');
  assert.equal(sanitizeSearchQuery('BMW 320i'), 'BMW 320i');
});

test('tokenize splits normalized text', () => {
  assert.deepEqual(tokenize('BMW 2022'), ['bmw', '2022']);
});

test('buildTokenIndex maps tokens to document ids', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const index = buildTokenIndex(docs);
  assert.ok(index.get('bmw')?.has(vehicleListing.id));
  assert.ok(index.get('320i')?.has(vehicleListing.id));
});

test('resolveSynonym maps otomatik to automatic', () => {
  assert.equal(resolveSynonym('otomatik'), 'automatic');
  assert.equal(resolveSynonym('automatic'), 'automatic');
  assert.equal(resolveSynonym('auto'), 'automatic');
});

test('resolvePhraseSynonym maps düşük km to low_km', () => {
  assert.equal(resolvePhraseSynonym('düşük km'), 'low_km');
  assert.equal(resolvePhraseSynonym('az km'), 'low_km');
  assert.equal(resolvePhraseSynonym('low mileage'), 'low_km');
});

test('SYNONYM_MAP includes fuel and service synonyms', () => {
  assert.equal(SYNONYM_MAP.dizel, 'diesel');
  assert.equal(SYNONYM_MAP.benzin, 'gasoline');
  assert.equal(SYNONYM_MAP['yetkili servis'], 'authorized_service');
  assert.equal(SYNONYM_MAP['tek parça boya'], 'paint_one_piece');
  assert.equal(SYNONYM_MAP.suv, 'suv');
});

test('parseSearchQuery extracts BMW brand year and low_km', () => {
  const parsed = parseSearchQuery('BMW 2022 düşük km');
  assert.equal(parsed.brand, 'BMW');
  assert.equal(parsed.year, 2022);
  assert.ok(parsed.attributes.includes('low_km'));
});

test('parseSearchQuery extracts Audi automatic transmission', () => {
  const parsed = parseSearchQuery('Audi otomatik');
  assert.equal(parsed.brand, 'Audi');
  assert.equal(parsed.transmission, 'automatic');
});

test('parseSearchQuery extracts SUV diesel', () => {
  const parsed = parseSearchQuery('SUV dizel');
  assert.equal(parsed.body_type, 'suv');
  assert.equal(parsed.fuel, 'diesel');
});

test('parseSearchQuery extracts authorized_service attribute', () => {
  const parsed = parseSearchQuery('Yetkili servis');
  assert.ok(parsed.attributes.includes('authorized_service'));
});

test('parseSearchQuery extracts paint_one_piece attribute', () => {
  const parsed = parseSearchQuery('Tek parça boya');
  assert.ok(parsed.attributes.includes('paint_one_piece'));
});

test('extractKnownBrandsModels collects brands from dataset', () => {
  const docs = buildSearchDocuments(listings);
  const { brands, models } = extractKnownBrandsModels(docs);
  assert.ok(brands.has('bmw'));
  assert.ok(models.has('320i'));
});

test('rankDocument scores brand match', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('BMW');
  const { score, breakdown } = rankDocument(docs[0], parsed);
  assert.equal(breakdown.brand, RANKING_WEIGHTS.brand);
  assert.ok(score >= MIN_SIMILARITY_THRESHOLD);
});

test('rankDocument scores model match', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('BMW 320i');
  const { breakdown } = rankDocument(docs[0], parsed);
  assert.equal(breakdown.brand, RANKING_WEIGHTS.brand);
  assert.equal(breakdown.model, RANKING_WEIGHTS.model);
});

test('rankDocument scores year match', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('BMW 2022');
  const { breakdown } = rankDocument(docs[0], parsed);
  assert.equal(breakdown.year, RANKING_WEIGHTS.year);
});

test('rankDocument scores low km query', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('düşük km');
  const { breakdown } = rankDocument(docs[0], parsed);
  assert.ok(breakdown.km >= RANKING_WEIGHTS.km * 0.5);
});

test('rankDocument scores fuel match', () => {
  const docs = buildSearchDocuments([suvListing]);
  const parsed = parseSearchQuery('dizel');
  const { breakdown } = rankDocument(docs[0], parsed);
  assert.equal(breakdown.fuel, RANKING_WEIGHTS.fuel);
});

test('rankDocument scores transmission match', () => {
  const docs = buildSearchDocuments([audiListing]);
  const parsed = parseSearchQuery('otomatik');
  const { breakdown } = rankDocument(docs[0], parsed);
  assert.equal(breakdown.transmission, RANKING_WEIGHTS.transmission);
});

test('rankDocument scores attribute match for authorized service', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('yetkili servis');
  const { breakdown } = rankDocument(docs[0], parsed);
  assert.equal(breakdown.attribute, RANKING_WEIGHTS.attribute);
});

test('rankDocument applies duplicate penalty', () => {
  const doc = {
    ...buildSearchDocuments([vehicleListing])[0],
    duplicate_status: 'exact'
  };
  const parsed = parseSearchQuery('BMW');
  const { breakdown } = rankDocument(doc, parsed);
  assert.equal(breakdown.duplicate_penalty, RANKING_WEIGHTS.duplicate_penalty);
});

test('clampScore limits score to 0-100', () => {
  assert.equal(clampScore(150), 100);
  assert.equal(clampScore(-10), 0);
  assert.equal(clampScore(72.4), 72);
});

test('scoreToSimilarityPercent returns clamped percent', () => {
  assert.equal(scoreToSimilarityPercent(94.2), 94);
});

test('passesSimilarityThreshold respects 40 threshold', () => {
  assert.equal(passesSimilarityThreshold(39), false);
  assert.equal(passesSimilarityThreshold(40), true);
  assert.equal(MIN_SIMILARITY_THRESHOLD, 40);
});

test('filterBySimilarityThreshold removes low scores', () => {
  const results = [
    { id: '1', search_score: 90 },
    { id: '2', search_score: 30 }
  ];
  const filtered = filterBySimilarityThreshold(results);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, '1');
});

test('enrichWithSimilarity adds similarity_percent', () => {
  const enriched = enrichWithSimilarity({ search_score: 88 });
  assert.equal(enriched.similarity_percent, 88);
});

test('highlightSearchTerms wraps matches with mark and escapes HTML', () => {
  const html = highlightSearchTerms('BMW 320i', 'BMW');
  assert.match(html, /<mark>BMW<\/mark>/);
  assert.doesNotMatch(html, /<script/i);
});

test('highlightSearchTerms prevents XSS in highlight output', () => {
  const html = highlightSearchTerms('<img onerror=alert(1)>', 'img');
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('<script'));
  assert.match(html, /&lt;/);
});

test('escapeSearchHtml escapes HTML entities', () => {
  assert.equal(escapeSearchHtml('a & b < c >'), 'a &amp; b &lt; c &gt;');
});

test('buildSearchSuggestions returns dataset-derived suggestions for BMW', () => {
  const docs = buildSearchDocuments(listings);
  const suggestions = buildSearchSuggestions(docs, 'BMW');
  assert.ok(suggestions.some((item) => item.startsWith('BMW')));
  assert.ok(suggestionsAreFromDataset(suggestions, docs));
});

test('buildSearchSuggestions returns Audi models from dataset', () => {
  const docs = buildSearchDocuments(listings);
  const suggestions = buildSearchSuggestions(docs, 'Audi');
  assert.ok(suggestions.includes('Audi A4'));
});

test('buildSearchSuggestions does not hallucinate unknown brands', () => {
  const docs = buildSearchDocuments(listings);
  const suggestions = buildSearchSuggestions(docs, 'Ferrari');
  assert.equal(suggestions.length, 0);
});

test('Yetkili servis search returns matching listing', () => {
  clearSearchMemoCache();
  const result = runRepositorySearch([vehicleListing], { query: 'Yetkili servis' });
  assert.equal(result.results.length, 1);
  assert.ok(Number(result.results[0].search_score) >= 40);
});

test('documentMatchesSearchQuery matches authorized service in description', () => {
  clearSearchMemoCache();
  const docs = buildSearchDocuments([vehicleListing]);
  const parsed = parseSearchQuery('Yetkili servis');
  assert.equal(documentMatchesSearchQuery(docs[0], parsed, 'Yetkili servis'), true);
});

test('buildSearchableText includes title description tags attributes features', () => {
  const docs = buildSearchDocuments([vehicleListing]);
  const text = buildSearchableText(docs[0]);
  assert.ok(text.includes('yetkili'));
  assert.ok(text.includes('bmw'));
  assert.ok(SEARCHABLE_FIELDS.includes('tags'));
});

test('runRepositorySearch finds BMW 2022 düşük km matches', () => {
  clearSearchMemoCache();
  const result = runRepositorySearch(listings, { query: 'BMW 2022 düşük km' });
  assert.ok(result.results.length > 0);
  assert.equal(result.results[0].brand, 'BMW');
});

test('runRepositorySearch filters vehicle chip with search query', () => {
  clearSearchMemoCache();
  const result = runRepositorySearch(listings, { query: 'BMW', filters: ['vehicle'] });
  assert.ok(result.results.every((row) => row.category === 'vehicle'));
});

test('runRepositorySearch filters manual source with search', () => {
  clearSearchMemoCache();
  const result = runRepositorySearch(listings, { query: 'BMW', filters: ['manual'] });
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].source, 'manual');
});

test('sortSearchResults sorts by best match', () => {
  const rows = [
    { id: '1', search_score: 50, decision_score: 10 },
    { id: '2', search_score: 90, decision_score: 10 }
  ];
  const sorted = sortSearchResults(rows, 'best_match');
  assert.equal(sorted[0].id, '2');
});

test('sortSearchResults sorts by newest', () => {
  const rows = [
    { id: '1', created_at: '2026-01-01', updated_at: '2026-01-01' },
    { id: '2', created_at: '2026-06-07', updated_at: '2026-06-07' }
  ];
  const sorted = sortSearchResults(rows, 'newest');
  assert.equal(sorted[0].id, '2');
});

test('sortSearchResults sorts by highest AI', () => {
  const rows = [
    { id: '1', decision_score: 60 },
    { id: '2', decision_score: 90 }
  ];
  const sorted = sortSearchResults(rows, 'highest_ai');
  assert.equal(sorted[0].id, '2');
});

test('sortSearchResults sorts by lowest risk', () => {
  const rows = [
    { id: '1', risk_score: 80 },
    { id: '2', risk_score: 20 }
  ];
  const sorted = sortSearchResults(rows, 'lowest_risk');
  assert.equal(sorted[0].id, '2');
});

test('sortSearchResults sorts by highest quality', () => {
  const rows = [
    { id: '1', quality_score: 55 },
    { id: '2', quality_score: 95 }
  ];
  const sorted = sortSearchResults(rows, 'highest_quality');
  assert.equal(sorted[0].id, '2');
});

test('buildSearchSummary reports count and top match', () => {
  const results = [{ title: 'BMW 320i', brand: 'BMW', model: '320i', similarity_percent: 94, search_score: 94 }];
  const summary = buildSearchSummary(results, 'BMW');
  assert.match(summary.message, /1 kayıt bulundu/);
  assert.match(summary.message, /%94/);
});

test('buildSearchSummary reports no result message', () => {
  const summary = buildSearchSummary([], 'Ferrari Enzo');
  assert.match(summary.message, /Sonuç bulunamadı/);
});

test('runRepositorySearch empty query returns all filtered records', () => {
  clearSearchMemoCache();
  const result = runRepositorySearch(listings, { query: '' });
  assert.equal(result.results.length, listings.length);
});

test('buildSearchResults adds highlighted fields', () => {
  const parsed = parseSearchQuery('BMW');
  const docs = buildSearchDocuments([vehicleListing]);
  const ranked = runRepositorySearch([vehicleListing], { query: 'BMW' }).results;
  const built = buildSearchResults(ranked, parsed, 'BMW');
  assert.ok(built[0].highlighted?.title);
});

test('buildResultSummary delegates to search summary', () => {
  const summary = buildResultSummary([], 'test');
  assert.match(summary.message, /Sonuç bulunamadı/);
});

test('SEARCH_SORT_OPTIONS includes required sort modes', () => {
  const ids = SEARCH_SORT_OPTIONS.map((item) => item.id);
  for (const id of ['best_match', 'newest', 'highest_ai', 'lowest_risk', 'highest_quality']) {
    assert.ok(ids.includes(id), `missing sort ${id}`);
  }
});

test('SEARCH_FILTER_CHIPS includes category and source chips', () => {
  const ids = SEARCH_FILTER_CHIPS.map((item) => item.id);
  for (const id of ['vehicle', 'housing', 'vacation', 'manual', 'ai_builder', 'csv', 'json', 'partner_api']) {
    assert.ok(ids.includes(id), `missing chip ${id}`);
  }
});

test('buildAiSearchSectionHtml renders AI Search title and input', () => {
  const html = buildAiSearchSectionHtml('', []);
  assert.match(html, /AI Search/);
  assert.match(html, /ai-listings-repo-ai-search/);
});

test('buildRepositoryDashboardHtml shows empty data message', () => {
  const { html } = buildRepositoryDashboardHtml([], { aiSearch: 'BMW' });
  assert.match(html, /Yeterli veri yok/);
});

test('buildRepositoryDashboardHtml renders search summary when query active', () => {
  const { html } = buildRepositoryDashboardHtml(listings, { aiSearch: 'BMW' });
  assert.match(html, /kayıt bulundu/);
  assert.match(html, /ai-listings-admin__repo-card--search/);
});

test('buildSearchResultSummaryHtml escapes summary output', () => {
  const html = buildSearchResultSummaryHtml({ message: '<script>x</script>' });
  assert.ok(!html.includes('<script>'));
  assert.match(html, /&lt;script&gt;/);
});

test('runRepositorySearch handles large dataset with memoization guard', () => {
  clearSearchMemoCache();
  const large = Array.from({ length: 10050 }, (_, index) => ({
    ...vehicleListing,
    id: `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
    title: `BMW ${320 + (index % 50)}i`
  }));
  const started = Date.now();
  const result = runRepositorySearch(large, { query: 'BMW' });
  const elapsed = Date.now() - started;
  assert.ok(result.results.length > 0);
  assert.ok(elapsed < 15000, `search too slow: ${elapsed}ms`);
});

test('guard: router has no new repository search endpoint', () => {
  const router = fs.readFileSync(routerPath, 'utf8');
  assert.doesNotMatch(router, /\/search/);
  assert.doesNotMatch(router, /\/repository-search/);
});

test('guard: migration schema unchanged for ai_listings tables', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.match(sql, /CREATE TABLE.*ai_listings/s);
  assert.doesNotMatch(sql, /ai_listings_search/);
});

test('guard: admin html still has repository view tab', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.match(html, /data-admin-view="repository"/);
});
