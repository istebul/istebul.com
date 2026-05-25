# Decision record template (DR-YYYY-NNN)

Copy into `data/ops/decision-log.json` → `records[]`.

## Required fields

| Field | Description |
|-------|-------------|
| `id` | `DR-2026-###` unique |
| `type` | `strategy` \| `product` \| `growth` \| `revenue` \| `ops` \| `incident` |
| `status` | `proposed` \| `approved` \| `superseded` \| `incident_closed` |
| `title` | One-line decision |
| `owner` | Role id from startup operating mode |
| `decidedAt` | ISO date or null if proposed |
| `context` | Why now |
| `options` | Array of alternatives considered |
| `decision` | What we chose (null if proposed) |
| `consequences` | What changes for team/customers |
| `reviewBy` | Date to revisit |

## Optional

- `rice`: `{ reach, impact, confidence, effort }` for product/growth bets
- `linkedArtifacts`: paths to docs, PRs, metrics
- `incident`: `{ severity, timeline, actionItems[] }` for type=incident

## Example

```json
{
  "id": "DR-2026-010",
  "type": "growth",
  "status": "approved",
  "title": "Pause paid channel X for 30 days",
  "owner": "vp_growth",
  "decidedAt": "2026-05-24",
  "context": "CAC > 2× target for 14 days.",
  "options": ["Cut budget 50%", "Pause entirely", "Change creative only"],
  "decision": "Pause entirely; reallocate to lifecycle.",
  "consequences": "No new ads on X; weekly growth review tracks recovery.",
  "reviewBy": "2026-06-24",
  "rice": { "reach": 6, "impact": 1, "confidence": 0.9, "effort": 0.5, "score": 10.8 }
}
```

## Rules

1. MRR, pricing, partner economics → record **before** ship.
2. CRO experiments > 2 weeks → approved record or linked experiment id.
3. SEV1/SEV2 → `type: incident` within 48h of close.
