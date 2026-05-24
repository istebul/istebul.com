# P3 — Decision Moat (Implemented)

## Scope

| Pillar | Implementation |
|--------|----------------|
| AI differentiation | Deterministic scores + LLM narration only; moat page + Auto trust copy |
| Product moat | Closed-loop partner OS + decision session linkage |
| Data moat | `moat_segment_benchmarks` view + `decision-intelligence` API |
| Feedback loop | `decision_feedback` table + Auto UI + analytics events |
| **P3.2 Outcome data moat** | `outcome_signal_events` + `outcome-capture` edge + unified ingest |
| **P3.3 Product feedback intelligence** | `product_feedback` + lightweight UX loop + intelligence events |
| Scoring intelligence | `calibrateLeadScore()` in `auto-intake` from segment win rates |
| Outcome intelligence | Auto results strip + admin segment table |
| Competitive positioning | `karar-moat.html` + `category-positioning.js` |

## P3.2 — Outcome data moat architecture

Defensible loop: **user events → partner outcomes → feedback → CRM states** → rule-based segment calibration (not generative model training).

### Signal types

| Signal | Typical source |
|--------|----------------|
| `vehicle_recommended_selected` | Auto UI (shortlist, teklif) |
| `lead_submitted` | `auto-intake` |
| `lead_closed` | `partner-callback`, CRM |
| `partner_sale` | Partner webhook / CRM |
| `financing_accepted` | User prequal + partner `funded` |
| `user_satisfaction` | Decision feedback |
| `recommendation_usefulness` | Decision feedback |
| `confidence_accuracy` | Feedback + match score metadata |

### Data flow

```
user events (outcome-capture.js → outcome-capture)
partner outcome events (partner-callback → outcome_signal_events)
feedback events (decision-intelligence → outcome_signal_events)
CRM outcome states (admin-action auto_leads update)
        ↓
moat_segment_benchmarks + calibrateLeadScore()
```

### Privacy (KVKK)

- `sanitizeOutcomeProperties()` blocks email, phone, name, IBAN, free-text notes in signal payloads.
- RLS denies direct table access; admin reads via service role only.
- No marketing copy claiming “AI learns from your data” — calibration is deterministic.

## Key paths

- `js/features/moat/*` — client moat modules (`outcome-capture.js`, `outcome-capture-shared.js`)
- `supabase/functions/outcome-capture/` — public user signal ingest
- `supabase/functions/decision-intelligence/` — benchmarks + feedback + feedback→signals
- `supabase/functions/_shared/outcome-capture.ts` — shared ingest + mapping
- `supabase/functions/_shared/scoring-intelligence.ts` — shared calibration rules
- `supabase/migrations/20260604_p3_decision_moat.sql` — schema + view
- `supabase/migrations/20260605_p3_2_outcome_data_moat.sql` — outcome signals

## Ops

1. Apply migrations on Supabase production.
2. Deploy edge functions: `decision-intelligence`, `outcome-capture`.
3. Partner outcomes (`partner-callback`) and CRM updates feed signals — without volume, calibration stays in `insufficient_outcome_data` mode (honest).

## P3.3 — Product feedback intelligence loop

Surfaces (collapsed by default, no spam):

| Surface | Mount point |
|---------|-------------|
| Sonuç ekranı | Auto results `#auto-moat-feedback-root` |
| E-posta | Lifecycle CTA `?product_feedback=email` → auto expand |
| Geçmiş | `/gecmis` history list prepend |
| Partner sonrası | Lead success modal `#auto-partner-feedback-root` |

Questions: faydalı mı, sonunda ne yaptınız, satın alma, alternatif seçim.

Events: `feedback_requested`, `feedback_submitted`, `recommendation_success`, `recommendation_rejected`.

Paths:

- `js/features/moat/product-feedback.js` + `product-feedback-shared.js`
- `supabase/functions/_shared/product-feedback.ts`
- `supabase/migrations/20260606_p3_3_product_feedback_intelligence.sql`
- `decision-intelligence` action `product_feedback`

## Honest limits

- Benchmarks require ≥3 leads per segment (k-anonymity).
- Calibration delta is capped (±8 / ±6 / +4 rules) — not ML black box.
- Listing depth moat still depends on catalog/truth layer (separate from P3).
