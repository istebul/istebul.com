#!/usr/bin/env node
/**
 * isteBul AI Listings Engine — seed script (Sprint-6).
 *
 * Creates 5 vehicle + 5 housing listings with source_type=manual_seed.
 *
 * Usage:
 *   node scripts/seed-ai-listings.cjs --dry-run
 *   node scripts/seed-ai-listings.cjs --memory
 *   SUPABASE_URL=... AI_LISTINGS_EDGE_SECRET=... node scripts/seed-ai-listings.cjs
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-ai-listings.cjs --direct --publish
 */

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const memoryMode = args.has('--memory');
const directMode = args.has('--direct');
const analyzeAfterCreate = !args.has('--no-analyze');
const publishMode = args.has('--publish');

async function loadSeedModule() {
  return import('../src/ai-listings/seed/seed-data.js');
}

async function loadEngineModule() {
  return import('../src/ai-listings/index.js');
}

function edgeConfig() {
  const baseUrl = String(process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
  const secret = String(process.env.AI_LISTINGS_EDGE_SECRET ?? '').trim();
  return { baseUrl, secret, edgeUrl: baseUrl ? `${baseUrl}/functions/v1/ai-listings` : '' };
}

async function seedViaEdge(record) {
  const { edgeUrl, secret } = edgeConfig();
  if (!edgeUrl || !secret) {
    throw new Error('SUPABASE_URL and AI_LISTINGS_EDGE_SECRET are required for edge seeding');
  }

  const response = await fetch(`${edgeUrl}/listings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-ai-listings-secret': secret
    },
    body: JSON.stringify({
      ...record,
      source_type: 'manual_seed',
      status: publishMode ? 'published' : 'draft'
    })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || `Edge create failed (${response.status})`;
    throw new Error(message);
  }

  const listing = body?.data?.listing;
  if (analyzeAfterCreate && listing?.id) {
    const analyzeRes = await fetch(`${edgeUrl}/listings/${listing.id}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-ai-listings-secret': secret
      }
    });
    const analyzeBody = await analyzeRes.json().catch(() => ({}));
    if (!analyzeRes.ok) {
      const message = analyzeBody?.error?.message || `Edge analyze failed (${analyzeRes.status})`;
      throw new Error(message);
    }
    return { listing, analysis: analyzeBody?.data?.analysis ?? null };
  }

  return { listing, analysis: null };
}

async function seedViaMemory(records) {
  const engine = await loadEngineModule();
  engine.setAiListingsLocalOverride(true);
  const container = engine.createAiListingsContainer();
  const created = [];

  for (const record of records) {
    const listing = engine.createEmptyListing({
      ...record,
      id: `seed-${record.category}-${created.length + 1}`,
      source_type: 'manual_seed'
    });
    const upsert = await container.services.listingService.upsert(listing);
    if (!upsert.ok || !upsert.listing) {
      throw new Error(`In-memory upsert failed for ${record.title}`);
    }

    let analysis = null;
    if (analyzeAfterCreate) {
      const analyzed = await container.services.aiAnalysisService.analyze(upsert.listing);
      if (!analyzed.ok) throw new Error(`In-memory analyze failed for ${record.title}`);
      analysis = analyzed.analysis;
    }

    created.push({ listing: upsert.listing, analysis });
  }

  engine.clearAiListingsLocalOverride();
  return created;
}

async function seedViaDirectSupabase(records) {
  const baseUrl = String(process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!baseUrl || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --direct mode');
  }

  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(baseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const engine = await loadEngineModule();
  const created = [];

  for (const record of records) {
    const row = {
      category: record.category,
      title: record.title,
      description: record.description,
      location: record.location ? { label: record.location } : null,
      price: record.price,
      currency: record.currency ?? 'TRY',
      images: [],
      attributes: record.attributes ?? {},
      status: publishMode ? 'published' : 'draft',
      source_type: 'manual_seed'
    };

    const { data, error } = await client.from('ai_listings').insert(row).select('*').single();
    if (error) throw new Error(`Supabase insert failed: ${error.message}`);

    const listing = {
      id: data.id,
      category: data.category,
      title: data.title,
      description: data.description ?? '',
      location: data.location?.label ?? '',
      price: Number(data.price ?? 0),
      currency: data.currency ?? 'TRY',
      images: [],
      attributes: data.attributes ?? {},
      status: data.status,
      source_type: data.source_type,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    let analysis = null;
    if (analyzeAfterCreate) {
      const pipeline = await engine.runAnalysisPipeline({ listing });
      if (!pipeline.ok || !pipeline.analysis) {
        throw new Error(`Analysis pipeline failed for ${record.title}`);
      }

      const analysisRow = {
        listing_id: listing.id,
        ai_score: pipeline.analysis.ai_score,
        risk_score: pipeline.analysis.risk_score,
        market_score: pipeline.analysis.market_score,
        price_score: pipeline.analysis.price_score,
        confidence: pipeline.analysis.confidence,
        summary: pipeline.analysis.summary,
        pros: pipeline.analysis.pros,
        cons: pipeline.analysis.cons,
        tags: pipeline.analysis.tags,
        analysis_version: 'v1-seed'
      };

      const { error: analysisError } = await client.from('ai_listing_analyses').insert(analysisRow);
      if (analysisError) throw new Error(`Supabase analysis insert failed: ${analysisError.message}`);
      analysis = pipeline.analysis;
    }

    created.push({ listing, analysis });
  }

  return created;
}

async function main() {
  const { getAllSeedListings } = await loadSeedModule();
  const records = getAllSeedListings();

  console.log(`AI Listings seed: ${records.length} records (${records.filter((r) => r.category === 'vehicle').length} vehicle, ${records.filter((r) => r.category === 'housing').length} housing)`);

  if (dryRun) {
    for (const record of records) {
      console.log(`[dry-run] ${record.category}: ${record.title} — ${record.price} ${record.currency}`);
    }
    console.log('Dry run complete. No records created.');
    return;
  }

  let results = [];
  if (memoryMode) {
    results = await seedViaMemory(records);
  } else if (directMode) {
    results = await seedViaDirectSupabase(records);
  } else {
    for (const record of records) {
      results.push(await seedViaEdge(record));
    }
  }

  for (const item of results) {
    const id = item.listing?.id ?? 'unknown';
    const title = item.listing?.title ?? 'untitled';
    const aiScore = item.analysis?.ai_score ?? 'n/a';
    console.log(`✓ ${id} — ${title} (ai_score: ${aiScore})`);
  }

  console.log(`Seed complete: ${results.length} listing(s) created.`);
}

main().catch((err) => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});
