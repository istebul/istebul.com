# P3 — Decision Moat (Implemented)

## Scope

| Pillar | Implementation |
|--------|----------------|
| AI differentiation | Deterministic scores + LLM narration only; moat page + Auto trust copy |
| Product moat | Closed-loop partner OS + decision session linkage |
| Data moat | `moat_segment_benchmarks` view + `decision-intelligence` API |
| Feedback loop | `decision_feedback` table + Auto UI + analytics events |
| Scoring intelligence | `calibrateLeadScore()` in `auto-intake` from segment win rates |
| Outcome intelligence | Auto results strip + admin segment table |
| Competitive positioning | `karar-moat.html` + `competitive-positioning.js` |

## Key paths

- `js/features/moat/*` — client moat modules
- `supabase/functions/decision-intelligence/` — public benchmarks + feedback ingest
- `supabase/functions/_shared/scoring-intelligence.ts` — shared calibration rules
- `supabase/migrations/20260604_p3_decision_moat.sql` — schema + view

## Ops

1. Apply migration on Supabase production.
2. Deploy edge function `decision-intelligence`.
3. Partner outcomes (`partner-callback`) feed the outcome graph — without wins, calibration stays in `insufficient_outcome_data` mode (honest).

## Honest limits

- Benchmarks require ≥3 leads per segment (k-anonymity).
- Calibration delta is capped (±8 / ±6 / +4 rules) — not ML black box.
- Listing depth moat still depends on catalog/truth layer (separate from P3).
