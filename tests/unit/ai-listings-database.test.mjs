import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const migrationPath = path.join(root, 'supabase/migrations/20260701_ai_listings_engine_v1.sql');

const {
  isAiListingsSupabaseAdapterEnabled,
  setAiListingsSupabaseLocalOverride,
  clearAiListingsSupabaseLocalOverride,
  createAiListingsContainer,
  createEmptyListing,
  setAiListingsLocalOverride,
  clearAiListingsLocalOverride,
  createSupabaseAiListingRepository,
  createSupabaseAiAnalysisRepository,
  isSupabaseAiListingRepositoryAvailable,
  isSupabaseAiAnalysisRepositoryAvailable,
  SUPABASE_TABLES,
  SUPABASE_ADAPTER_INACTIVE_ERROR
} = await import('../../src/ai-listings/index.js');

const { listingFromRow, listingToRow, analysisRecordFromRow, analysisRecordToRow, locationToJson, locationFromJson } =
  await import('../../src/ai-listings/repository/supabase/row-mappers.js');

test('database migration SQL file exists', () => {
  assert.ok(fs.existsSync(migrationPath), 'migration file must exist');
});

test('migration defines all required tables', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.ai_listings/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.ai_listing_analyses/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.ai_listing_events/i);
});

test('migration defines required indexes', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const indexes = [
    'ai_listings_category_idx',
    'ai_listings_status_idx',
    'ai_listings_source_type_idx',
    'ai_listings_created_at_idx',
    'ai_listing_analyses_listing_id_idx',
    'ai_listing_events_listing_id_idx',
    'ai_listing_events_event_type_idx'
  ];
  for (const idx of indexes) {
    assert.match(sql, new RegExp(idx, 'i'), `missing index ${idx}`);
  }
});

test('migration enables RLS and restricts client access', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(sql, /deny client access/i);
  assert.match(sql, /service role full/i);
  assert.match(sql, /REVOKE ALL ON public\.ai_listings FROM anon, authenticated/i);
});

test('Supabase adapter is inactive by default', () => {
  clearAiListingsSupabaseLocalOverride();
  assert.equal(isAiListingsSupabaseAdapterEnabled(), false);
  assert.equal(isSupabaseAiListingRepositoryAvailable(), false);
  assert.equal(isSupabaseAiAnalysisRepositoryAvailable(), false);
});

test('Supabase listing repository throws when adapter inactive', async () => {
  clearAiListingsSupabaseLocalOverride();
  const repo = createSupabaseAiListingRepository();
  await assert.rejects(repo.findById('test-id'), (err) => {
    assert.ok(err instanceof Error);
    assert.equal(err.message, SUPABASE_ADAPTER_INACTIVE_ERROR);
    return true;
  });
});

test('Supabase analysis repository throws when adapter inactive', async () => {
  clearAiListingsSupabaseLocalOverride();
  const repo = createSupabaseAiAnalysisRepository();
  await assert.rejects(repo.findByListingId('test-id'), (err) => {
    assert.ok(err instanceof Error);
    assert.equal(err.message, SUPABASE_ADAPTER_INACTIVE_ERROR);
    return true;
  });
});

test('Supabase adapter requires client when enabled', async () => {
  setAiListingsSupabaseLocalOverride(true);
  const repo = createSupabaseAiListingRepository();
  await assert.rejects(repo.findById('test-id'), /Supabase client required/);
  clearAiListingsSupabaseLocalOverride();
});

test('in-memory repository remains default in DI container', async () => {
  setAiListingsLocalOverride(true);
  const container = createAiListingsContainer();
  const listing = createEmptyListing({
    id: 'mem-1',
    category: 'vehicle',
    title: 'In-memory default test',
    price: 1,
    location: 'Ankara'
  });

  const upsert = await container.services.listingService.upsert(listing);
  assert.equal(upsert.ok, true);

  const found = await container.services.listingService.getById('mem-1');
  assert.equal(found?.title, 'In-memory default test');

  clearAiListingsLocalOverride();
});

test('row mappers translate listing location jsonb', () => {
  const json = locationToJson('İstanbul');
  assert.deepEqual(json, { label: 'İstanbul' });
  assert.equal(locationFromJson(json), 'İstanbul');

  const listing = createEmptyListing({
    id: '550e8400-e29b-41d4-a716-446655440000',
    category: 'housing',
    title: 'Test',
    location: 'İzmir',
    price: 1000000
  });

  const row = listingToRow(listing);
  assert.equal(row.location?.label, 'İzmir');

  const roundTrip = listingFromRow({
    ...row,
    created_at: listing.created_at,
    updated_at: listing.updated_at
  });
  assert.equal(roundTrip.location, 'İzmir');
  assert.equal(roundTrip.id, listing.id);
});

test('row mappers translate analysis records', () => {
  const record = {
    listing_id: '550e8400-e29b-41d4-a716-446655440000',
    analysis: {
      ai_score: 80,
      risk_score: 20,
      market_score: 70,
      price_score: 65,
      confidence: 0.85,
      summary: 'Good listing',
      pros: ['Fair price'],
      cons: ['High mileage'],
      tags: ['vehicle']
    },
    created_at: '2026-06-06T00:00:00.000Z',
    model_version: 'v1'
  };

  const row = analysisRecordToRow(record);
  assert.equal(row.listing_id, record.listing_id);
  assert.equal(row.ai_score, 80);

  const restored = analysisRecordFromRow({
    id: '660e8400-e29b-41d4-a716-446655440001',
    ...row,
    created_at: record.created_at
  });
  assert.equal(restored.analysis.ai_score, 80);
  assert.equal(restored.model_version, 'v1');
});

test('SUPABASE_TABLES constants match migration', () => {
  assert.equal(SUPABASE_TABLES.LISTINGS, 'ai_listings');
  assert.equal(SUPABASE_TABLES.ANALYSES, 'ai_listing_analyses');
  assert.equal(SUPABASE_TABLES.EVENTS, 'ai_listing_events');

  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.match(sql, new RegExp(SUPABASE_TABLES.LISTINGS));
  assert.match(sql, new RegExp(SUPABASE_TABLES.ANALYSES));
  assert.match(sql, new RegExp(SUPABASE_TABLES.EVENTS));
});
