# Decision Intelligence Benchmarks — Manual P3 Moat Migration Ops Closure

**Date:** 2026-06-19  
**Type:** Ops-only closure (manual Supabase production action)  
**Main HEAD at record:** `5c0106a3` (`feat(auto): mount karar mahkemesi beta in results detail`)  
**Supabase project ref:** `hjfrcdstbyonmgatgwcc`  
**Final verdict:** **OPS FIX VERIFIED / DATA SPARSE**

---

## Summary

Production `decision-intelligence?action=benchmarks` returned HTTP 500 because the P3 decision moat schema (columns and `moat_segment_benchmarks` view) was not present in the live Supabase database. The migration block from `supabase/migrations/20260604_p3_decision_moat.sql` was applied manually via the Supabase SQL Editor. Post-migration verification confirmed all required objects and columns exist. Production smoke now returns HTTP 200 with a valid JSON fallback payload (`source: computed_fallback`, empty benchmarks). Karar Mahkemesi 2B-2 remains fully closed and unrelated to this incident.

---

## Incident

| Field | Detail |
|-------|--------|
| Symptom | `GET /functions/v1/decision-intelligence?action=benchmarks&segment=…` returned HTTP 500 with HTML error body |
| Route context | `https://www.istebul.com/auto/` |
| Test segment | `vehicle_offer\|1m-2m\|suv\|hybrid` |
| Endpoint | `/functions/v1/decision-intelligence?action=benchmarks&segment=vehicle_offer\|1m-2m\|suv\|hybrid` |
| Isolation | Ambient `Unexpected token '<'` observed elsewhere; not tied to benchmarks endpoint or HTTP ≥400 in latest smoke |

---

## Scope

**In scope for this ops closure:**

- Manual application of P3 decision moat migration SQL on production Supabase
- Post-migration schema verification
- Production smoke verification of benchmarks endpoint
- This documentation record

**Out of scope (explicitly not changed in this ops action):**

- Application runtime code, edge functions, or Cloudflare deploy
- Repo migration re-run or CI migration pipeline
- Karar Mahkemesi 2B-2 (already closed; production smoke PASS)
- Secret or env value rotation
- Data backfill or benchmark population

---

## Root Cause

Manual dashboard verification confirmed missing production schema objects required by the `decision-intelligence` benchmarks action:

| Missing object / column | Impact |
|-------------------------|--------|
| `public.moat_segment_benchmarks` (VIEW) | Benchmarks query failed |
| `public.auto_leads.segment_key` | Segment filtering / view dependency failed |
| `public.auto_leads.top_match_score` | View aggregation column missing |

**Environment presence (values not recorded):**

| Variable | Present |
|----------|---------|
| `SUPABASE_URL` | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | yes |

The edge function and application code expected P3 moat schema from `20260604_p3_decision_moat.sql`, but that migration had not been applied to production prior to this manual action.

---

## Manual Production Action

**Method:** Supabase Dashboard → SQL Editor (production project `hjfrcdstbyonmgatgwcc`)

**Action:** Applied the P3 decision moat migration block corresponding to `supabase/migrations/20260604_p3_decision_moat.sql`, including:

- `auto_leads` column additions (`segment_key`, `top_match_score`, `decision_session_id`, `confidence_tier`, `scoring_calibration_delta`, and related P3 moat fields)
- `decision_feedback` table (if not already present)
- `moat_segment_benchmarks` view definition
- Associated indexes and grants/revokes as defined in the migration

**Not performed:** Migration re-run via CLI, deploy trigger, or any repo/workflow change.

---

## Verification

Post-migration checks in Supabase SQL Editor:

| Check | Result |
|-------|--------|
| `public.auto_leads` exists | pass |
| `public.decision_feedback` exists | pass |
| `public.moat_segment_benchmarks` exists as VIEW | pass |
| `auto_leads.segment_key` column | pass |
| `auto_leads.top_match_score` column | pass |
| `auto_leads.decision_session_id` column | pass |
| `auto_leads.confidence_tier` column | pass |
| `auto_leads.scoring_calibration_delta` column | pass |
| View `SELECT` (sample) | success, 0 rows |
| Fallback query `SELECT` | success, 0 rows |

---

## Production Smoke Result

| Assertion | Observed |
|-----------|----------|
| Route | `https://www.istebul.com/auto/` |
| Segment | `vehicle_offer\|1m-2m\|suv\|hybrid` |
| HTTP status | **200** (previously 500) |
| Content-Type | `application/json` |
| Response `ok` | `true` |
| Response `source` | `computed_fallback` |
| Response `benchmarks` | `[]` |
| Response `segment` | `null` |
| HTML error body | gone |
| Main auto results render | PASS |
| Outcome panel | sparse fallback (expected with zero benchmark rows) |

**Final verdict:** **OPS FIX VERIFIED / DATA SPARSE**

---

## User-visible Impact

- **Before fix:** Benchmarks-dependent UI paths could fail or show errors when the endpoint returned 500 / HTML.
- **After fix:** Endpoint responds with valid JSON fallback; main Auto results render PASS. Outcome/benchmark panels show sparse fallback content because no segment benchmark rows exist yet (expected until outcome volume accumulates).
- **Karar Mahkemesi:** No user-visible regression; unrelated to this incident.

---

## Karar Mahkemesi Relation

Karar Mahkemesi 2B-2 is **fully closed** with production smoke **PASS** at main HEAD `5c0106a3`. This benchmarks ops fix addresses a separate ambient production issue (missing P3 moat schema). No Karar Mahkemesi code paths, flags, or verification scope were modified in this ops action.

---

## Remaining Notes

- Ambient `Unexpected token '<'` may still appear in unrelated client/network paths; latest smoke did not associate it with the benchmarks endpoint or any HTTP ≥400 on the verified route.
- Benchmark data remains empty (`0` rows in view and fallback queries). The API correctly returns `computed_fallback` rather than erroring.
- Migration is now applied in production manually; repo migration file `20260604_p3_decision_moat.sql` should be treated as already satisfied for this project ref (avoid blind re-apply without idempotency review).

---

## Follow-up Recommendations

1. **Migration hygiene:** Ensure future Supabase deploys track applied migrations so P3 moat schema is not missing on new environments.
2. **Data moat seeding:** As partner outcomes and lead volume grow, `moat_segment_benchmarks` will populate organically; monitor for transition from `computed_fallback` to computed segment benchmarks.
3. **Ambient parse error:** Investigate `Unexpected token '<'` separately if it persists; not blocking benchmarks endpoint per latest smoke.
4. **Documentation cross-ref:** See `docs/P3_DECISION_MOAT.md` for architecture context and `docs/SUPABASE_MIGRATION_APPLY.md` for standard migration apply procedure on future changes.
