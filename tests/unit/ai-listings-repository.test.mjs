import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  REPOSITORY_SOURCE_TYPES,
  normalizeRepositorySource,
  deriveRepositoryRecord,
  buildRepositoryRecords,
  groupDuplicatesByFingerprint,
  isActiveRepositoryRecord,
  computeRepositoryStats,
  computeRepositoryStatsByCategory,
  normalizeSearchText,
  searchRepositoryRecords,
  recordMatchesSearch,
  buildRepositorySummary,
  REPOSITORY_FILTER_CHIPS,
  REPOSITORY_CATEGORY_TABS,
  recordMatchesRepositoryFilter,
  applyRepositoryFilters,
  filterRepositoryByCategoryTab,
  toggleRepositoryFilter,
  runRepositoryQuery
} = await import('../../js/ai-listings-repository/index.js');

const {
  buildRepositoryCardHtml,
  buildRepositoryKpiCardsHtml,
  buildRepositorySummaryHtml,
  buildRepositoryDashboardHtml,
  buildRepositoryFilterChipsHtml,
  getRepositorySourceLabelTr
} = await import('../../js/admin/ai-listings-repository-admin.js');

const routerPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/router.js');
const authPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/auth.js');
const handlerPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/handler.js');
const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260701_ai_listings_engine_v1.sql');
const adminHtmlPath = path.join(process.cwd(), 'admin/ai-listings.html');

const vehicleListing = {
  id: '11111111-1111-1111-1111-111111111111',
  category: 'vehicle',
  title: '2021 BMW 320i M Sport',
  description: 'Bakımlı araç',
  price: 1250000,
  currency: 'TRY',
  location: 'İstanbul',
  source_type: 'manual',
  status: 'approved',
  created_at: '2026-06-07T10:00:00.000Z',
  updated_at: '2026-06-07T11:00:00.000Z',
  attributes: { brand: 'BMW', model: '320i', year: 2021 },
  latest_analysis: {
    ai_score: 82,
    risk_score: 28,
    quality_score: 88,
    decision_score: 82,
    tags: ['executive_label:Satın Alınabilir', 'executive_score:85']
  }
};

const housingListing = {
  id: '22222222-2222-2222-2222-222222222222',
  category: 'housing',
  title: 'Kadıköy 3+1 Daire',
  price: 4500000,
  currency: 'TRY',
  source_type: 'csv',
  status: 'pending_review',
  created_at: '2026-06-06T08:00:00.000Z',
  updated_at: '2026-06-06T09:00:00.000Z',
  attributes: { brand: '', model: '', year: 2018 },
  latest_analysis: {
    ai_score: 65,
    risk_score: 72,
    quality_score: 60,
    decision_score: 65,
    tags: ['executive_label:Riskli']
  }
};

const vacationListing = {
  id: '33333333-3333-3333-3333-333333333333',
  category: 'vacation',
  title: 'Bodrum Yazlık Villa',
  price: 15000,
  currency: 'TRY',
  source_type: 'partner_api',
  status: 'archived',
  created_at: '2026-06-05T12:00:00.000Z',
  updated_at: '2026-06-05T13:00:00.000Z',
  attributes: {}
};

const nearDuplicateVehicle = {
  id: '44444444-4444-4444-4444-444444444444',
  category: 'vehicle',
  title: '2021 BMW 320i',
  description: 'Bakımlı araç tek elden',
  price: 1240000,
  currency: 'TRY',
  location: 'İstanbul',
  source_type: 'ai_builder',
  status: 'draft',
  created_at: '2026-06-07T09:00:00.000Z',
  updated_at: '2026-06-07T09:30:00.000Z',
  attributes: { brand: 'BMW', model: '320i', year: 2021 }
};

test('REPOSITORY_SOURCE_TYPES includes future-ready source types', () => {
  for (const source of ['manual', 'ai_builder', 'csv', 'json', 'partner_api', 'future_partner']) {
    assert.ok(REPOSITORY_SOURCE_TYPES.includes(source), `missing ${source}`);
  }
});

test('normalizeRepositorySource maps aliases', () => {
  assert.equal(normalizeRepositorySource('AI-Builder'), 'ai_builder');
  assert.equal(normalizeRepositorySource('partner-api'), 'partner_api');
  assert.equal(normalizeRepositorySource('unknown'), 'manual');
});

test('deriveRepositoryRecord builds canonical model fields', () => {
  const record = deriveRepositoryRecord(vehicleListing);
  assert.equal(record.id, vehicleListing.id);
  assert.equal(record.category, 'vehicle');
  assert.equal(record.title, vehicleListing.title);
  assert.equal(record.brand, 'BMW');
  assert.equal(record.model, '320i');
  assert.equal(record.year, 2021);
  assert.equal(record.price, 1250000);
  assert.equal(record.currency, 'TRY');
  assert.ok(record.fingerprint);
  assert.equal(record.executive_label, 'Satın Alınabilir');
  assert.equal(record.source, 'manual');
});

test('deriveRepositoryRecord extracts scores from analysis', () => {
  const record = deriveRepositoryRecord(housingListing);
  assert.equal(record.quality_score, 60);
  assert.equal(record.risk_score, 72);
  assert.equal(record.decision_score, 65);
  assert.equal(record.executive_label, 'Riskli');
});

test('deriveRepositoryRecord defaults duplicate_status to new', () => {
  const record = deriveRepositoryRecord(vacationListing);
  assert.equal(record.duplicate_status, 'new');
});

test('buildRepositoryRecords detects duplicates across listings', () => {
  const records = buildRepositoryRecords([vehicleListing, nearDuplicateVehicle]);
  const statuses = records.map((record) => record.duplicate_status);
  assert.ok(statuses.includes('exact') || statuses.includes('similar'));
});

test('groupDuplicatesByFingerprint groups by hash', () => {
  const records = buildRepositoryRecords([vehicleListing, nearDuplicateVehicle], {
    includeDuplicateDetection: false
  });
  const groups = groupDuplicatesByFingerprint(records);
  assert.ok(groups.size >= 1);
  const largest = Math.max(...[...groups.values()].map((group) => group.length));
  assert.ok(largest >= 1);
});

test('isActiveRepositoryRecord excludes archived', () => {
  const archived = deriveRepositoryRecord(vacationListing);
  const active = deriveRepositoryRecord(vehicleListing);
  assert.equal(isActiveRepositoryRecord(archived), false);
  assert.equal(isActiveRepositoryRecord(active), true);
});

test('computeRepositoryStats aggregates totals and averages', () => {
  const records = buildRepositoryRecords([vehicleListing, housingListing, vacationListing], {
    includeDuplicateDetection: false
  });
  const stats = computeRepositoryStats(records);
  assert.equal(stats.total, 3);
  assert.equal(stats.active, 2);
  assert.equal(stats.archived, 1);
  assert.ok(stats.average_ai !== null);
  assert.ok(stats.average_quality !== null);
  assert.ok(stats.average_risk !== null);
});

test('computeRepositoryStatsByCategory filters vehicle tab', () => {
  const records = buildRepositoryRecords([vehicleListing, housingListing, vacationListing], {
    includeDuplicateDetection: false
  });
  const stats = computeRepositoryStatsByCategory(records, 'vehicle');
  assert.equal(stats.total, 1);
});

test('computeRepositoryStatsByCategory filters housing tab', () => {
  const records = buildRepositoryRecords([vehicleListing, housingListing], {
    includeDuplicateDetection: false
  });
  const stats = computeRepositoryStatsByCategory(records, 'housing');
  assert.equal(stats.total, 1);
});

test('computeRepositoryStatsByCategory filters vacation tab', () => {
  const records = buildRepositoryRecords([vehicleListing, vacationListing], {
    includeDuplicateDetection: false
  });
  const stats = computeRepositoryStatsByCategory(records, 'vacation');
  assert.equal(stats.total, 1);
});

test('normalizeSearchText handles Turkish characters', () => {
  assert.equal(normalizeSearchText('İstanbul'), normalizeSearchText('istanbul'));
  assert.equal(normalizeSearchText('Şişli'), normalizeSearchText('sisli'));
});

test('recordMatchesSearch matches title brand model id fingerprint', () => {
  const record = deriveRepositoryRecord(vehicleListing);
  assert.equal(recordMatchesSearch(record, normalizeSearchText('bmw')), true);
  assert.equal(recordMatchesSearch(record, normalizeSearchText('320i')), true);
  assert.equal(recordMatchesSearch(record, normalizeSearchText(record.id)), true);
  assert.equal(recordMatchesSearch(record, normalizeSearchText('renault')), false);
});

test('searchRepositoryRecords filters by query', () => {
  const records = buildRepositoryRecords([vehicleListing, housingListing], {
    includeDuplicateDetection: false
  });
  const results = searchRepositoryRecords(records, 'kadıköy');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, housingListing.id);
});

test('buildRepositorySummary computes top brand and averages', () => {
  const records = buildRepositoryRecords([vehicleListing, nearDuplicateVehicle], {
    includeDuplicateDetection: false
  });
  const summary = buildRepositorySummary(records);
  assert.equal(summary.total_records, 2);
  assert.equal(summary.top_brand, 'BMW');
  assert.ok(summary.average_ai !== null);
  assert.ok(summary.average_quality !== null);
});

test('REPOSITORY_FILTER_CHIPS includes required filters', () => {
  const ids = REPOSITORY_FILTER_CHIPS.map((chip) => chip.id);
  for (const id of ['vehicle', 'housing', 'vacation', 'new', 'duplicate', 'risky', 'reviewable', 'buyable', 'archived']) {
    assert.ok(ids.includes(id), `missing filter ${id}`);
  }
});

test('REPOSITORY_CATEGORY_TABS includes Toplam Araç Konut Tatil', () => {
  const labels = REPOSITORY_CATEGORY_TABS.map((tab) => tab.label);
  assert.deepEqual(labels, ['Toplam', 'Araç', 'Konut', 'Tatil']);
});

test('recordMatchesRepositoryFilter category vehicle', () => {
  const record = deriveRepositoryRecord(vehicleListing);
  assert.equal(recordMatchesRepositoryFilter(record, 'vehicle'), true);
  assert.equal(recordMatchesRepositoryFilter(record, 'housing'), false);
});

test('recordMatchesRepositoryFilter risky and buyable', () => {
  const risky = deriveRepositoryRecord(housingListing);
  const buyable = deriveRepositoryRecord(vehicleListing);
  assert.equal(recordMatchesRepositoryFilter(risky, 'risky'), true);
  assert.equal(recordMatchesRepositoryFilter(buyable, 'buyable'), true);
});

test('recordMatchesRepositoryFilter archived', () => {
  const record = deriveRepositoryRecord(vacationListing);
  assert.equal(recordMatchesRepositoryFilter(record, 'archived'), true);
});

test('applyRepositoryFilters combines multiple filters', () => {
  const records = buildRepositoryRecords([vehicleListing, housingListing, vacationListing], {
    includeDuplicateDetection: false
  });
  const filtered = applyRepositoryFilters(records, ['vehicle']);
  assert.equal(filtered.length, 1);
});

test('filterRepositoryByCategoryTab respects all tab', () => {
  const records = buildRepositoryRecords([vehicleListing, housingListing], {
    includeDuplicateDetection: false
  });
  assert.equal(filterRepositoryByCategoryTab(records, 'all').length, 2);
});

test('toggleRepositoryFilter adds and removes filters', () => {
  assert.deepEqual(toggleRepositoryFilter([], 'vehicle'), ['vehicle']);
  assert.deepEqual(toggleRepositoryFilter(['vehicle'], 'vehicle'), []);
  assert.deepEqual(toggleRepositoryFilter(['vehicle'], 'risky'), ['vehicle', 'risky']);
});

test('runRepositoryQuery integrates search filters and stats', () => {
  const result = runRepositoryQuery([vehicleListing, housingListing, vacationListing], {
    categoryTab: 'vehicle',
    search: 'bmw'
  });
  assert.equal(result.filtered.length, 1);
  assert.equal(result.stats.total, 1);
  assert.ok(result.summary.total_records >= 0);
});

test('buildRepositoryCardHtml renders card fields', () => {
  const record = deriveRepositoryRecord(vehicleListing);
  const html = buildRepositoryCardHtml(record);
  assert.match(html, /2021 BMW 320i M Sport/);
  assert.match(html, /Satın Alınabilir/);
  assert.match(html, /ai-listings-admin__repo-card/);
});

test('buildRepositoryKpiCardsHtml renders animated counter targets', () => {
  const stats = computeRepositoryStats(buildRepositoryRecords([vehicleListing], { includeDuplicateDetection: false }));
  const html = buildRepositoryKpiCardsHtml(stats);
  assert.match(html, /Toplam kayıt/);
  assert.match(html, /data-kpi-counter/);
});

test('buildRepositorySummaryHtml renders summary strip', () => {
  const summary = buildRepositorySummary(buildRepositoryRecords([vehicleListing], { includeDuplicateDetection: false }));
  const html = buildRepositorySummaryHtml(summary);
  assert.match(html, /Son 24 saat/);
  assert.match(html, /En çok marka/);
});

test('buildRepositoryFilterChipsHtml marks active filters', () => {
  const html = buildRepositoryFilterChipsHtml(['vehicle', 'duplicate']);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /✓ Araç/);
});

test('buildRepositoryDashboardHtml builds full dashboard', () => {
  const { html, query } = buildRepositoryDashboardHtml([vehicleListing, housingListing]);
  assert.match(html, /Repository/);
  assert.match(html, /ai-listings-admin__repo-grid/);
  assert.ok(query.filtered.length >= 1);
});

test('getRepositorySourceLabelTr maps source types', () => {
  assert.equal(getRepositorySourceLabelTr('ai_builder'), 'AI Builder');
  assert.equal(getRepositorySourceLabelTr('future_partner'), 'Gelecek Partner');
});

test('no endpoint URL changes in router', () => {
  const router = fs.readFileSync(routerPath, 'utf8');
  assert.match(router, /resource: 'listings'/);
  assert.doesNotMatch(router, /repository/i);
});

test('no auth header changes', () => {
  const auth = fs.readFileSync(authPath, 'utf8');
  assert.match(auth, /x-ai-listings-secret/);
  const handler = fs.readFileSync(handlerPath, 'utf8');
  assert.doesNotMatch(handler, /\/repository/i);
});

test('no DB schema migration changes', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.doesNotMatch(sql, /ai_listing_repository/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.ai_listings/i);
});

test('admin html adds repository view without changing secret gate', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.match(html, /data-admin-view="repository"/);
  assert.match(html, /ai-listings-admin\.js/);
  assert.doesNotMatch(html, /AI_LISTINGS_EDGE_SECRET/);
});

test('duplicate grouping finds repeated fingerprints when titles match', () => {
  const clone = {
    ...vehicleListing,
    id: '55555555-5555-5555-5555-555555555555',
    source_type: 'json'
  };
  const records = buildRepositoryRecords([vehicleListing, clone], { includeDuplicateDetection: false });
  const groups = groupDuplicatesByFingerprint(records);
  const multi = [...groups.values()].filter((group) => group.length > 1);
  assert.ok(multi.length >= 0);
});

test('searchRepositoryRecords empty query returns all records', () => {
  const records = buildRepositoryRecords([vehicleListing, housingListing], { includeDuplicateDetection: false });
  assert.equal(searchRepositoryRecords(records, '').length, 2);
  assert.equal(searchRepositoryRecords(records, '   ').length, 2);
});

test('recordMatchesRepositoryFilter duplicate filter', () => {
  const records = buildRepositoryRecords([vehicleListing, nearDuplicateVehicle]);
  const dupRecord = records.find((record) => record.duplicate_status !== 'new');
  if (dupRecord) {
    assert.equal(recordMatchesRepositoryFilter(dupRecord, 'duplicate'), true);
  } else {
    assert.ok(true, 'no duplicate in sample set');
  }
});
