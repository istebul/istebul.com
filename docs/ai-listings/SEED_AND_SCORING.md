# AI Listings — Seed Data & Scoring (Sprint-6)

Internal-only module. No public UI, no production route changes. Disabled by default.

## Running the seed script

### Dry run (no writes)

```bash
node scripts/seed-ai-listings.cjs --dry-run
```

### In-memory (local dev / CI)

```bash
node scripts/seed-ai-listings.cjs --memory
```

Uses the in-memory repository layer with the deterministic analysis pipeline. No Supabase credentials required.

### Edge Function API (recommended for staging)

```bash
SUPABASE_URL=https://<project>.supabase.co \
AI_LISTINGS_EDGE_SECRET=<secret> \
node scripts/seed-ai-listings.cjs
```

Creates listings via `POST /functions/v1/ai-listings/listings` and runs `POST /listings/:id/analyze` for each record.

### Direct Supabase (service role)

```bash
SUPABASE_URL=https://<project>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
node scripts/seed-ai-listings.cjs --direct
```

Inserts into `ai_listings` and `ai_listing_analyses` directly. Requires migration `20260701_ai_listings_engine_v1.sql` applied.

### npm script

```bash
npm run seed:ai-listings -- --dry-run
```

## Sample data

The seed creates **10 listings** with `source_type = manual_seed`:

| Category | Count | Examples |
|----------|-------|----------|
| `vehicle` | 5 | 2022 Toyota Corolla, 2023 Hyundai Tucson, 2015 Ford Focus |
| `housing` | 5 | Kadıköy 3+1, Çankaya 2+1, Nilüfer sıfır bina |

Each record includes realistic:

- `category`, `title`, `description`, `price`, `location`, `currency`
- Category-specific `attributes` (vehicle: year/mileage/fuel; housing: sqm/rooms/building_age)
- Turkish marketplace context (İstanbul, Ankara, İzmir, Antalya, Bursa)

Seed definitions live in `src/ai-listings/seed/seed-data.js`.

## Scoring rules (deterministic)

Scoring is **rules-based only** in Sprint-6. No LLM changes canonical scores.

Engine version: `v1-rules-sprint6` (`src/ai-listings/scoring/scoring-engine.js`).

### Vehicle (`category: vehicle`)

| Factor | Inputs | Rule summary |
|--------|--------|--------------|
| `price_score` | price, model year | Compare to depreciated reference price (₺1.2M base, 12% annual depreciation) |
| `mileage_score` | `mileage` / `km` | Bands: ≤30k=90, ≤80k=75, ≤150k=60, ≤250k=45, else 30 |
| `age_score` | `year` | Bands by vehicle age: ≤3y=90, ≤7y=75, ≤12y=60, ≤18y=45, else 30 |
| `fuel_score` | `fuel_type` | elektrik=95, hibrit=85, lpg=70, dizel=65, benzin=55 |
| `risk_score` | composite | `100 − weighted(age, mileage, price, fuel)` |

Aggregates:

- `ai_score` = weighted blend of price, mileage, age, fuel, inverse risk
- `market_score` = average of age + fuel scores
- `confidence` = 0.82 when core fields present, else 0.35–0.55

### Housing / real estate (`category: housing`)

| Factor | Inputs | Rule summary |
|--------|--------|--------------|
| `price_score` | price, sqm, city | m² price vs city benchmark (İstanbul ₺45k/m², Ankara ₺32k/m², …) |
| `location_score` | location string | City tier map (İstanbul 85, İzmir 80, …) |
| `size_score` | sqm, rooms | m²/room ratio bands (ideal 25–45 m²/room) |
| `building_age_score` | `building_age` | ≤5y=90, ≤15y=75, ≤30y=60, else lower |
| `risk_score` | composite | `100 − weighted(location, size, building_age, price)` |

Aggregates:

- `ai_score` = weighted blend of price, location, size, building age, inverse risk
- `market_score` = 60% location + 40% building age
- `confidence` = 0.84 when core fields present

### Analysis output fields

Every analysis run produces:

- `summary`, `pros`, `cons`, `tags`
- `confidence`, `ai_score`, `market_score`, `price_score`, `risk_score`

Category factor scores are encoded in `tags` as `factor:<name>:<score>` for traceability.

## Admin panel badges

The internal admin panel (`admin/ai-listings.html`) shows per-listing badges:

- **Category** — `vehicle` / `housing`
- **AI score** — latest `ai_score`
- **Risk score** — latest `risk_score`
- **Date** — latest analysis `created_at` (YYYY-MM-DD)

Enable locally:

```js
localStorage.setItem('istebul_ai_listings_admin', 'on');
localStorage.setItem('istebul_ai_listings_secret', '<AI_LISTINGS_EDGE_SECRET>');
```

## Limitations

- **Stub market/pricing adapters** — live EVDS/TÜİK/partner benchmarks not connected; `market_score` uses rules, not live macro data.
- **No LLM narration** — summaries are template-driven Turkish text; AI provider adapter remains inactive.
- **Reference heuristics** — vehicle depreciation and housing m² benchmarks are static placeholders, not dealer or MLS feeds.
- **Admin-only** — listings tables are RLS-locked to `service_role`; no public listing access.
- **Edge/client duplication** — edge scoring mirrors `src/ai-listings/scoring/*`; keep both in sync when rules change.

## Next step: real market benchmarks

1. Wire `stub-market-data-adapter` to EVDS (policy rate, CPI, FX) for macro-adjusted `market_score`.
2. Wire `stub-pricing-data-adapter` to open-data / partner APIs for median price by category+city.
3. Align vehicle depreciation with `js/verticals/listing-analysis/listing-analysis-engine.js` live heuristics.
4. Add benchmark version stamps on each analysis row (`analysis_version` + `benchmark_snapshot` in events).
5. Optional LLM layer for `summary`/`pros`/`cons` only — scores remain immutable from rules engine.
