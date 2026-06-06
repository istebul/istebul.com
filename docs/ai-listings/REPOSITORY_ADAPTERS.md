# isteBul AI Listings Engine v1 — Repository Adapters

## Overview

Sprint-3 implements real Supabase CRUD adapters behind feature flags. The module remains **inactive by default** and is **not wired into production**.

## Default Behavior: In-Memory

```javascript
import { createAiListingsRepositories } from 'src/ai-listings/index.js';

const repos = createAiListingsRepositories();
// repos.backend === 'in-memory'
// repos.listingRepository → in-memory (findById, findMany, save, deleteById)
// repos.aiAnalysisRepository → in-memory
// repos.eventRepository === null
```

The DI container (`createAiListingsContainer`) continues to use in-memory repositories unless explicitly overridden.

## Supabase Adapter Activation

Supabase repositories activate only when **both** conditions are met:

1. `AI_LISTINGS_SUPABASE_ENABLED=true` (or `setAiListingsSupabaseLocalOverride(true)` in tests)
2. A valid Supabase client is passed: `{ client }` with a `from(table)` method

```javascript
import {
  setAiListingsSupabaseLocalOverride,
  createAiListingsRepositories
} from 'src/ai-listings/index.js';

setAiListingsSupabaseLocalOverride(true); // dev/test only
const repos = createAiListingsRepositories({ mode: 'supabase', client: serviceRoleClient });
// repos.backend === 'supabase'
```

### Explicit Supabase factory

```javascript
import { createSupabaseAiListingsRepositories } from 'src/ai-listings/index.js';

// Throws AI_LISTINGS_REPOSITORY_DISABLED if flag off
// Throws AI_LISTINGS_SUPABASE_CONFIG_MISSING if client missing
const repos = createSupabaseAiListingsRepositories({ client: serviceRoleClient });
```

## Repository APIs

### SupabaseAiListingRepository (`ai_listings`)

| Method | Description |
|--------|-------------|
| `create(input)` | Insert new listing |
| `getById(id)` | Fetch by UUID; returns `null` if not found |
| `update(id, patch)` | Partial update |
| `list(filters)` | Filter by category, status, source_type, owner_user_id; paginate with limit/offset |
| `archive(id)` | Set `status = 'archived'`, update `updated_at` |

### SupabaseAiAnalysisRepository (`ai_listing_analyses`)

| Method | Description |
|--------|-------------|
| `create(input)` | Insert analysis row |
| `getLatestByListingId(listingId)` | `ORDER BY created_at DESC LIMIT 1` |
| `listByListingId(listingId)` | All analyses for listing |
| `deleteByListingId(listingId)` | Cascade-safe delete by listing |

### SupabaseAiListingEventRepository (`ai_listing_events`)

| Method | Description |
|--------|-------------|
| `create(input)` | Insert event |
| `listByListingId(listingId)` | Events for a listing |
| `listByType(eventType)` | Events by type |

## Error Mapping

Raw Supabase/PostgREST errors are mapped inside the repository layer:

| Code | When |
|------|------|
| `AI_LISTINGS_REPOSITORY_DISABLED` | Supabase adapter flag is off |
| `AI_LISTINGS_SUPABASE_CONFIG_MISSING` | Flag on but no valid client |
| `AI_LISTINGS_RECORD_NOT_FOUND` | `PGRST116` or empty single-row result |
| `AI_LISTINGS_DB_ERROR` | Any other database error (cause attached, message sanitized) |

```javascript
import { AiListingsRepositoryError, AI_LISTINGS_DB_ERROR } from 'src/ai-listings/index.js';

try {
  await repo.getById(id);
} catch (err) {
  if (err instanceof AiListingsRepositoryError) {
    console.error(err.code); // never raw PostgREST text at top level
  }
}
```

## Future Service Role Usage

Current RLS allows **service_role only**. Production integration path:

1. Edge Function or server worker creates Supabase client with `SUPABASE_SERVICE_ROLE_KEY`
2. Pass client to `createAiListingsRepositories({ mode: 'supabase', client })`
3. Never expose service role key to browser
4. Anon/authenticated clients remain blocked until RLS Phase A (see `DATABASE_SCHEMA.md`)

## Edge Function API (Sprint-4)

Internal API at `supabase/functions/ai-listings/` uses service_role via `repositories.js`.
See [EDGE_FUNCTION_API.md](./EDGE_FUNCTION_API.md).

## Future Admin Integration

1. Admin panel calls Edge Function with admin JWT validation
2. Edge Function uses service_role client + repository factory
3. Admin views: listing queue (`status`, `source_type`), analysis history, event timeline
4. Admin actions: `archive()`, re-trigger analysis, manual status transitions
5. No direct `admin-panel.html` changes until dedicated Sprint

## Factory Resolution

| `mode` | Flag | Client | Result |
|--------|------|--------|--------|
| `auto` (default) | off | — | in-memory |
| `auto` | on | missing | in-memory |
| `auto` | on | present | supabase |
| `in-memory` | any | any | in-memory |
| `supabase` | on | present | supabase |
| `supabase` | on | missing | throws `AI_LISTINGS_SUPABASE_CONFIG_MISSING` |

## Files

| File | Role |
|------|------|
| `repository/repository-factory.js` | Backend selection |
| `repository/repository-errors.js` | Error codes + mapping |
| `repository/supabase/supabase-ai-listing-repository.js` | Listing CRUD |
| `repository/supabase/supabase-ai-analysis-repository.js` | Analysis CRUD |
| `repository/supabase/supabase-ai-listing-event-repository.js` | Event CRUD |
| `repository/supabase/row-mappers.js` | DB ↔ domain mapping |
| `repository/in-memory/` | Default test/dev backend |
