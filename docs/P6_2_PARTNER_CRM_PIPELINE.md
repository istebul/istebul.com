# P6.2 — Partner CRM pipeline (sales predictability)

Seven-stage AE pipeline for `partner_applications.status` with weighted win forecast.

## Stages

| Stage | P(win) | Typical next action |
|-------|--------|---------------------|
| **lead** | 5% | Outbound + ICP |
| **qualified** | 15% | BANT → schedule demo |
| **demo** | 35% | Deck + dispatch demo |
| **pilot** | 55% | 5-lead pilot + webhook |
| **negotiation** | 75% | Quote / SOW |
| **won** | 100% | Live endpoint |
| **lost** | 0% | Nurture or close |

## Data & code

- `data/sales/partner-crm-pipeline.json` — SLAs, probabilities, legacy map
- `js/features/sales/partner-crm-pipeline.js` — normalize, forecast, admin board
- Migration `20260612_partner_crm_pipeline_p62.sql` — DB constraint + backfill

### Legacy mapping

| Old | New |
|-----|-----|
| new, contacted | lead |
| qualified | qualified |
| integrating | pilot |
| live | won |
| rejected | lost |

## Self-serve progression

1. Application submit → **lead**
2. Onboarding step 2 (qualification) → **qualified**
3. Step 3 (lead needs) → **demo**
4. Webhook / test payload → **pilot**
5. Admin endpoint provision → **negotiation**
6. Manual / go-live → **won**

## Admin

Partner Başvuruları: funnel board (counts + weighted forecast), stage dropdown, `partner_crm_stage_change` analytics.

## Audit

`node scripts/p6-2-partner-crm-pipeline-audit.cjs`
