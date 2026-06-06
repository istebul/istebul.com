# AI Listings — Admin Bulk Import Pipeline (Sprint-8)

Internal admin-only bulk import for seed and manual listings via CSV or JSON. **Public publishing remains disabled.**

## Access control

- Panel: `admin/ai-listings.html` (hidden unless `localStorage.istebul_ai_listings_admin === 'on'`)
- Edge API: `POST /listings/import` requires `x-ai-listings-secret`
- No homepage, category route, or anonymous access

## CSV format example

```csv
category,title,description,price,currency,location,source_url,images,attributes
vehicle,Toyota Corolla,Clean sedan,950000,TRY,İstanbul,https://example.com/car,https://cdn.example/a.jpg|https://cdn.example/b.jpg,"{""year"":2020,""mileage"":45000}"
housing,Merkez Daire,2+1,2500000,TRY,Ankara,,,"{""sqm"":95,""rooms"":3}"
```

- First row must be headers (supported field names only)
- `images`: pipe-separated URLs (`|`) or JSON array string
- `attributes`: JSON object string

## JSON format example

```json
[
  {
    "category": "vehicle",
    "title": "Honda Civic",
    "description": "Well maintained",
    "price": 820000,
    "currency": "TRY",
    "location": "İzmir",
    "source_url": "https://example.com/listing/1",
    "images": ["https://cdn.example/1.jpg"],
    "attributes": { "year": 2019, "fuel": "benzin" }
  }
]
```

## Limits

| Limit | Value |
|-------|-------|
| Max rows per import | 100 |
| Max content size | 512 KB (UTF-8 bytes) |
| Invalid rows | Skipped — never written |

## Validation rules

| Field | Rule |
|-------|------|
| `category` | Required |
| `title` | Required |
| `price` | Numeric, ≥ 0 if present |
| `source_url` | http/https only if present |
| `attributes` | Valid JSON object if present |
| `images` | Array (JSON or pipe-separated) if present |

Parser output (`buildImportPreview`):

- `total_count`
- `valid_rows` / `invalid_rows` (counts)
- `row_errors` — `{ row, messages[] }`
- `normalized_rows` — only valid rows

## Edge API

`POST /listings/import`

```json
{
  "format": "csv",
  "content": "category,title\nvehicle,Example",
  "analyze": false
}
```

### Behavior

1. Validate request (`format`, `content` size)
2. Parse and normalize rows
3. Create **only valid** listings with `source_type: "admin_import"` and `status: "draft"`
4. Write `listing_imported` event per created listing
5. If `analyze: true`, run deterministic analysis pipeline per listing and emit `listing_analyzed`

### Response summary

```json
{
  "ok": true,
  "data": {
    "total_count": 3,
    "created_count": 2,
    "invalid_count": 1,
    "analyzed_count": 2,
    "created_ids": ["..."],
    "errors": [{ "row": 2, "messages": ["title is required"] }]
  }
}
```

## Analyze option

When `analyze: true`:

- Runs the same deterministic edge analysis pipeline as `POST /listings/:id/analyze`
- Does not change listing status
- Increments `analyzed_count` in the import summary
- Analysis failures are reported in `errors` without rolling back created listings

## Admin panel workflow

1. Paste CSV or JSON into the import textarea
2. Select format (CSV / JSON)
3. Optionally enable **Run deterministic analysis after import**
4. Click **Preview** — shows total, valid, invalid rows and row-level errors
5. **Import valid rows** is disabled until preview shows at least one valid row

Warning shown in panel: *Internal admin import only. Public publishing remains disabled.*

## Safety posture

- Import is inactive by default (module + admin panel gating unchanged)
- `approved` status does not enable public visibility
- Invalid rows are never persisted
- Content size and row count caps prevent abuse

## Future partner API import plan

Sprint-8 is admin-only. A future sprint may add:

- Authenticated partner API with scoped import tokens
- Async job queue for large batches (>100 rows)
- Webhook callbacks for import completion
- Separate `source_type: "partner_import"` with partner_id attribution
- Pre-import duplicate detection against `source_url`

Until then, partners should not receive import endpoints or public listing exposure.

## Related docs

- [ADMIN_QA_WORKFLOW.md](./ADMIN_QA_WORKFLOW.md) — post-import review workflow
- [ADMIN_TEST_PANEL.md](./ADMIN_TEST_PANEL.md) — enabling the internal panel
- [EDGE_FUNCTION_API.md](./EDGE_FUNCTION_API.md) — full edge API reference
