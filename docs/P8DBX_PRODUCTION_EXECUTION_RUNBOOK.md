# EPIC P8-DBX — Production Execution Runbook

**Document type:** Production apply runbook (ops follow this during release)  
**Audience:** Release Manager · Supabase Architect · PostgreSQL DBA · On-call  
**Upstream analysis:** `docs/P8DBR_PRODUCTION_DATABASE_RECOVERY_REPORT.md`  
**This agent session does not execute:** `db push`, `migration repair`, `schema_migrations` edits, migration authoring, or feature code  

| Field | Value |
|-------|--------|
| Repo tip (GarsonAI) | `20260718_garsonai_p8e_payment_gateway.sql` |
| Stated prod history tip | ~`20260618` |
| Blind `db push --include-all` | **NO-GO** |
| GarsonAI chain | **CONDITIONAL GO** (after this runbook + staging green) |
| Prior readiness (P8-DBR) | 38 / 100 |

---

## Mission

Bring GarsonAI production schema to the repository chain tip (`20260708` → `20260718`) safely, without dragging non-GarsonAI platform migrations into an uncontrolled blast radius.

---

## Roles & RACI (execution window)

| Role | Responsibility |
|------|----------------|
| **Release Manager** | Freeze, go/no-go, abort call, communications |
| **Supabase Architect** | History verification, apply method choice, CLI interpretation |
| **PostgreSQL DBA** | Pre-check inventory, apply supervision, SQL validation, rollback |
| **QA / Smoke owner** | PHASE-5 surface tests (ERP, CX, Concierge, health APIs) |
| **On-call** | Platform non-regression watch (isteBul core site) |

**Dual control:** PHASE-3 production apply requires Release Manager + DBA concurrent approval.

---

## Canonical apply order (do not reorder)

| Step ID | Migration file |
|---------|----------------|
| M-08 | `20260708_garsonai_tenant_foundation.sql` |
| M-09 | `20260709_garsonai_p4_live_restaurant_layer.sql` |
| M-12 | `20260712_garsonai_p6a_production_database_readiness.sql` |
| M-13E | `20260713_garsonai_p7e_inventory_foundation.sql` |
| M-13F | `20260713_garsonai_p7f_reservation_management_foundation.sql` |
| M-14G | `20260714_garsonai_p7g_table_planner_foundation.sql` |
| M-14H | `20260714_garsonai_p7h_checkin_engine_foundation.sql` |
| M-15 | `20260715_garsonai_p7i_payment_foundation.sql` |
| M-16 | `20260716_garsonai_p7j_customer_experience_foundation.sql` |
| M-17 | `20260717_garsonai_p7ka_production_database_hardening.sql` |
| M-18 | `20260718_garsonai_p8e_payment_gateway.sql` |

**Forbidden apply method:** `supabase db push --include-all` against production without a signed Bucket-P (platform) + Bucket-G (GarsonAI) matrix.

**Allowed apply method classes (human ops chooses one, documents in change ticket):**

1. **Staging-first file-ordered apply** of Bucket G only (existing migration file contents, unchanged), then production repeat.  
2. **CLI apply of GarsonAI-only** only after history strategy makes remote tip coherent for those versions — never blind include-all of `20260619`–`20260706`.

History reconciliation (`migration repair` / version marking) is **out of band for the coding agent** and requires its own signed change ticket if used.

---

# PHASE-0 — Freeze

### Objective

Stop schema and GarsonAI-coupled release churn during the recovery window.

### Steps

| # | Action |
|---|--------|
| 0.1 | Announce maintenance window (start/end UTC+3) to eng + ops. |
| 0.2 | Freeze merges that touch `supabase/migrations/**`, GarsonAI ERP/CX data layers, or Supabase project settings. |
| 0.3 | Freeze unrelated production schema experiments. |
| 0.4 | Confirm on-call coverage for isteBul core + GarsonAI. |
| 0.5 | Create change ticket ID; link this runbook + P8-DBR report. |

### Preconditions

- Release Manager assigned.
- Change ticket open.
- No active production incident on core site.

### Success criteria

- Freeze message acknowledged by eng leads.
- No open PRs scheduled to merge migrations during the window.
- Change ticket contains: target project ref, window, abort authority (Release Manager).

### Rollback / abort if failed

- **Do not enter PHASE-1.** Reschedule window.

---

# PHASE-1 — Pre-check

### Objective

Prove backup readiness and capture a baseline of what production actually has.

### Steps

| # | Action |
|---|--------|
| 1.1 | Verify Supabase Backup / PITR status in Dashboard; update evidence log in `docs/SUPABASE_BACKUP_PITR_VERIFICATION.md` (manual). |
| 1.2 | Record last backup timestamp + retention window. |
| 1.3 | Confirm restore authority (who can trigger PITR). |
| 1.4 | Capture baseline: remote migration tip via `supabase migration list` (archive stdout to change ticket). |
| 1.5 | Capture baseline table presence for GarsonAI names (restaurants through payment_settlements — full list in §Post-apply SQL). |
| 1.6 | Capture `restaurants` column inventory (drift check vs M-08 + later ALTERs). |
| 1.7 | Name-collision check: any existing `payment_*` tables from platform migration `20260617_payment_infrastructure_iyzico_paytr.sql` vs GarsonAI P7-I/P8-E names. |
| 1.8 | Confirm `supabase_realtime` publication exists. |
| 1.9 | Ensure staging project is available (prod clone preferred). |

### Preconditions

- PHASE-0 freeze complete.
- Operator has Dashboard + CLI link access (no secrets in chat/repo).

### Success criteria

| Check | Pass rule |
|-------|-----------|
| Backup/PITR | Status known (`enabled` or explicit accepted risk signed by Release Manager) |
| Baseline artifacts | migration list + table inventory attached to ticket |
| `restaurants` | Present; column drift noted (blocker if incompatible with M-09/M-16 ALTERs) |
| Payment name collision | No conflicting non-GarsonAI `payment_*` shapes under same names — **or** signed exception |
| Staging | Ready for dry-run |

### Rollback / abort if failed

| Failure | Decision |
|---------|----------|
| Backup/PITR unknown and risk not signed | **ABORT** — no PHASE-2 |
| Incompatible `restaurants` drift | **ABORT** — escalate Architect; do not apply |
| Conflicting `payment_*` schemas | **ABORT** — schema-compare ticket first |
| No staging | **ABORT** production path; staging-only may continue for rehearsal |

---

# PHASE-2 — History Verification

### Objective

Separate “what CLI thinks” from “what objects exist”; produce the apply matrix.

### Steps

| # | Action |
|---|--------|
| 2.1 | Diff Local vs Remote from `supabase migration list`. |
| 2.2 | Bucket **P**: files `20260619` … `20260706` (platform / non-GarsonAI). |
| 2.3 | Bucket **G**: files M-08 … M-18 (GarsonAI only). |
| 2.4 | For each Bucket G file: mark `{objects present \| missing \| partial}`. |
| 2.5 | For Bucket P: mark `{already reflected \| unknown \| must not apply now}`. |
| 2.6 | Sign strategy: **Track A = schema apply Bucket G only**; **Track B = history reconcile later** (separate ticket). |
| 2.7 | Explicitly record: production will **not** run blind `--include-all`. |
| 2.8 | DBA + Architect dual-sign the matrix. |

### Preconditions

- PHASE-1 baselines attached.
- P8-DBR dependency order accepted.

### Success criteria

- Signed matrix exists with every M-08…M-18 row classified.
- Bucket P marked **out of scope** for this window (unless a row is proven required — then escalate; do not improvise).
- Track A / Track B owners named.

### Rollback / abort if failed

| Failure | Decision |
|---------|----------|
| Matrix incomplete | **STOP** — no PHASE-3 |
| Disagreement on Bucket P | **STOP** — Architect decision required |
| Someone proposes blind include-all | **REJECT** — remain NO-GO |

---

# PHASE-3 — Migration Apply

### Objective

Apply Bucket G in canonical order on **staging first**, then production, with per-step gates.

### 3.A Staging dry-run (mandatory)

| # | Action |
|---|--------|
| 3A.1 | Apply M-08 … M-18 in order on staging (existing file contents only; no edits). |
| 3A.2 | After each file (or after each epic group: 08 / 09 / 12 / 13E+13F / 14G+14H / 15 / 16 / 17 / 18), run mini existence check for that file’s tables. |
| 3A.3 | Run abbreviated PHASE-4 validation on staging. |
| 3A.4 | Run abbreviated PHASE-5 smoke on staging (ERP + CX at minimum). |
| 3A.5 | Record duration, errors, and “green” sign-off. |

**Staging success criteria:** all M-08…M-18 applied; PHASE-4 core checks green; no platform regression on staging clone.  
**Staging failure →** do **not** open production PHASE-3B; fix forward on staging only.

### 3.B Production apply (only after 3.A green)

For **each** migration step M-08 → M-18:

| Field | Rule |
|-------|------|
| **Precondition** | Prior step success criteria met; DBA online; abort channel open |
| **Action** | Apply that single migration file’s SQL as-is (operator method per change ticket) |
| **Success criteria** | File completes without error; tables/alters expected for that step exist; no unexpected drops |
| **On failure** | **STOP chain immediately.** Do not continue to next file. Enter PHASE-6 |

#### Per-step gate table (production)

| Step | Preconditions | Success criteria | Failure → rollback decision |
|------|---------------|------------------|-----------------------------|
| M-08 | Auth available; freeze on | `restaurants` / `restaurant_users` / `restaurant_settings` exist or already compatible | STOP → PHASE-6; prefer PITR if shared damage |
| M-09 | M-08 OK; `restaurants` OK | `customers`,`menu_items`,`orders`,`order_items` (+ kitchen/ai/whatsapp) exist; function `garson_current_user_restaurant_ids` exists | STOP → PHASE-6 |
| M-12 | M-09 OK | `menu_categories`,`reservations`,`preorders`,`products` exist; `menu_items`/`orders` altered | STOP → PHASE-6 |
| M-13E | M-08 OK | `inventory_categories`,`inventory_items` exist | STOP → PHASE-6 |
| M-13F | M-12 OK (`reservations`) | `restaurant_tables`,`reservation_tables`,`reservation_guarantees` exist | STOP → PHASE-6 |
| M-14G | M-13F + M-09 (`orders`) | `restaurant_tables.status` / layout cols; `orders.table_id` present | STOP → PHASE-6 |
| M-14H | M-13F + customers | `restaurant_waitlist` exists | STOP → PHASE-6 |
| M-15 | reservations + customers | `payment_providers`,`payment_policies`,`payment_transactions` (+ refunds/audit) exist; guarantees extended | STOP → PHASE-6 |
| M-16 | payment policies + preorders + tables | restaurant CX columns; CX helper function; CX policies present | STOP → PHASE-6 (policy-only issues may be forward-fix if DBA signs) |
| M-17 | full P7 table set | tokens/indexes/triggers/enforce functions present | STOP → PHASE-6 |
| M-18 | reservations exist | five gateway tables exist + RLS enabled | STOP → PHASE-6 |

### Preconditions (PHASE-3 overall)

- PHASE-2 matrix signed.
- Staging 3.A green.
- Backup/PITR confirmed or risk accepted in writing.

### Success criteria (PHASE-3 overall)

- All M-08…M-18 applied on production without abort.
- Immediate existence spot-check for listed missing tables: pass.
- Release Manager records “Track A schema complete.”

### Rollback / abort if failed

See **PHASE-6**. Default: **stop + evaluate PITR**; never skip ahead.

---

# PHASE-4 — Post Apply Validation

### Objective

Prove schema shape, constraints, RLS enablement, and realtime membership before product smoke.

### Steps

| # | Action |
|---|--------|
| 4.1 | Run **SQL control suite** (§SQL kontrolleri below) — read-only / inventory. |
| 4.2 | Confirm no unexpected DROP of platform tables. |
| 4.3 | Confirm GarsonAI RLS enabled on new tables. |
| 4.4 | Confirm publication membership for operational tables. |
| 4.5 | Confirm P7-KA triggers exist on enforce targets. |
| 4.6 | Spot-check demo seed restaurant slug still resolvable (if seed path used). |
| 4.7 | Architect signs “schema validation green.” |

### Preconditions

- PHASE-3B complete (or staging-only validation during 3.A).

### Success criteria

- All required tables present (list below).
- Critical functions present: `garson_current_user_restaurant_ids`, `garson_public_restaurant_id_by_slug`, `garson_set_updated_at`, enforce_* set.
- Unique indexes on reservation tokens present.
- No blocking errors in control suite.

### Rollback / abort if failed

| Failure class | Decision |
|---------------|----------|
| Missing core tables (`orders`/`reservations`/payments) | PHASE-6 → PITR preferred |
| Missing only P8-E gateway tables | Stop product GO for payments; optional forward-fix if Architect signs partial GO |
| Trigger/function missing (P7-KA) | No CX/ERP write GO until fixed or restored |
| Platform table regression | **Immediate PHASE-6 PITR** |

---

## SQL kontrolleri (post-apply)

Operators run these in SQL Editor / `psql` against the target project.  
**Intent:** verification only. Do not paste secrets. Do not modify `schema_migrations` here.

### 4.S1 — Required tables exist

Verify `to_regclass` / `information_schema.tables` for:

**Tenant:** `restaurants`, `restaurant_users`, `restaurant_settings`  
**Ops:** `customers`, `menu_items`, `menu_categories`, `products`, `orders`, `order_items`, `kitchen_events`, `ai_insights`, `whatsapp_messages`  
**Reservations:** `reservations`, `preorders`, `restaurant_tables`, `reservation_tables`, `reservation_guarantees`, `restaurant_waitlist`  
**Inventory:** `inventory_categories`, `inventory_items`  
**Payments P7-I:** `payment_providers`, `payment_policies`, `payment_transactions`, `refund_transactions`, `payment_audit_logs`  
**Gateway P8-E:** `payment_gateway_configs`, `payment_authorizations`, `payment_webhooks`, `payment_provider_events`, `payment_settlements`

**Pass:** every name present in `public`.

### 4.S2 — Column drift (critical)

- `restaurants`: expect P4 fields (`phone`,`address`,`subscription_plan`) and P7-J public profile fields (`description`,`cover_image_url`,`logo_url`,`city`,`working_hours`, …).
- `orders`: expect `line_items`, `total`, `table_id`.
- `reservations`: expect guest/ops fields + `access_token` / `reservation_request_token` (P7-KA).
- `reservation_guarantees`: expect payment linkage columns (`payment_policy_id`,`payment_transaction_id`,`currency`, …).

**Pass:** columns present; no blocking NOT NULL violations on existing rows.

### 4.S3 — Functions

Confirm existence of:

- `garson_current_user_restaurant_ids`
- `garson_public_restaurant_id_by_slug`
- `garson_set_updated_at`
- `garson_new_access_token`
- `garson_reservations_assign_tokens`
- `garson_cx_get_reservation_by_access_token`
- `garson_enforce_reservation_tables_tenant`
- `garson_enforce_waitlist_tenant`
- `garson_enforce_orders_table_tenant`
- `garson_enforce_inventory_category_tenant`
- `garson_enforce_payment_transactions_tenant`
- `garson_enforce_preorders_tenant`
- `garson_enforce_reservation_guarantees_tenant`

### 4.S4 — Triggers (sample)

Confirm triggers such as:

- `trg_garson_reservations_assign_tokens` on `reservations`
- `trg_garson_reservation_tables_tenant` on `reservation_tables`
- `trg_garson_waitlist_tenant` on `restaurant_waitlist`
- `trg_garson_orders_table_tenant` on `orders`
- `trg_garson_payment_transactions_tenant` on `payment_transactions`
- `trg_garson_preorders_tenant` on `preorders`
- `trg_garson_reservation_guarantees_tenant` on `reservation_guarantees`

### 4.S5 — RLS

For each new GarsonAI table: `relrowsecurity = true` (RLS enabled).  
Spot-check policy names exist (member read/write and CX public policies where expected).

### 4.S6 — Realtime publication

For `supabase_realtime`, confirm membership (as applicable) for:  
`orders`, `reservations`, `preorders`, `restaurant_tables`, `reservation_tables`, `reservation_guarantees`, `restaurant_waitlist`, inventory tables, payment foundation tables, P8-E gateway tables.

### 4.S7 — History note (observe only)

Record whether remote migration versions now include M-08…M-18.  
If objects exist but versions do not: **Track B still open** — do not improvise repairs in this window unless a pre-signed history ticket is active.

### 4.S8 — Platform non-regression (sample)

Confirm core platform relations still queryable (examples used by isteBul; adjust to known prod set): leads / posts / site_settings as applicable.  
**Pass:** no missing critical platform tables that existed in PHASE-1 baseline.

---

# PHASE-5 — Smoke Test

### Objective

Prove product surfaces can read/write against the recovered schema in a safe order.

### Smoke order (mandatory sequence)

```
restaurants
  → orders
  → reservations
  → tables
  → payments
  → customer experience (CX)
  → erp (full nav sweep)
  → concierge
```

### 5.1 restaurants

| Check | How |
|-------|-----|
| Tenant row readable | Supabase client / SQL: select demo or known restaurant by `slug` |
| Settings linkage | `restaurant_settings` row for restaurant (if seeded) |
| Production bootstrap | Panel/ERP load does not hard-fail on missing `restaurants` |

**Pass:** slug resolves; no 5xx from health paths that probe `restaurants`.

### 5.2 orders

| Check | How |
|-------|-----|
| ERP Orders page | `/garson/erp/orders` loads; list query against `orders` succeeds (empty OK) |
| Dashboard widgets | `/garson/erp/` order counts do not error |
| Optional write | Create test order in staging; production only if Release Manager allows write smoke |

**Pass:** read path green; no schema errors in browser/network.

### 5.3 reservations

| Check | How |
|-------|-----|
| ERP Reservations | `/garson/erp/reservations` loads |
| Related | guarantees / preorders queries do not 400/500 on missing relation |

**Pass:** page + API read green.

### 5.4 tables

| Check | How |
|-------|-----|
| ERP Tables | `/garson/erp/tables` loads (`restaurant_tables`) |
| Check-in | `/garson/erp/checkin` loads (`restaurant_waitlist` + reservations) |

**Pass:** both pages green.

### 5.5 payments

| Check | How |
|-------|-----|
| ERP Payments | `/garson/erp/payments` — providers/policies/transactions readable |
| ERP Payment Gateways | `/garson/erp/payment-gateways` — gateway configs readable |
| Live capture | **Not required** (mock/foundation); do not call live Stripe/iyzico/PayTR |

**Pass:** pages load; no missing-table errors. Live provider calls remain out of scope.

### 5.6 customer experience (CX)

| Check | How |
|-------|-----|
| Landing | `/r/{slug}` (e.g. `/r/demo-cafe`) loads restaurant public profile |
| Reservation journey | CX can read menu categories / items / policies as designed |
| Confirmation shell | `/r/onay` still serves (static shell non-regression) |

**Pass:** public landing usable; no hard schema failures.

### 5.7 erp (full nav sweep)

Walk enabled nav from `apps/restaurant-admin-erp` config:

| Route | Path |
|-------|------|
| Dashboard | `/garson/erp/` |
| Orders | `/garson/erp/orders` |
| Reservations | `/garson/erp/reservations` |
| Tables | `/garson/erp/tables` |
| Check-in | `/garson/erp/checkin` |
| Payments | `/garson/erp/payments` |
| Payment Gateways | `/garson/erp/payment-gateways` |
| Menu | `/garson/erp/menu` |
| Inventory | `/garson/erp/inventory` |

**Pass:** each enabled page loads without schema-missing failures.

### 5.8 concierge

| Check | How |
|-------|-----|
| Concierge route | `/r/{slug}/concierge` loads |
| Intent path | Mock/local decision path works without live LLM |
| Guarantee/payment bridge | Mock only — no live charge |

**Pass:** page loads; conversation scaffold does not crash on DB reads.

### 5.9 Legacy panel / kitchen (non-regression)

| Surface | Path |
|---------|------|
| Panel home | `/garson/panel/` |
| Orders / kitchen / WhatsApp (as deployed) | `/garson/panel/siparisler`, `/garson/panel/mutfak`, `/garson/panel/whatsapp`, `/garson/mutfak/` |
| Auth shells | `/garson/giris`, `/garson/demo` |

**Pass:** no new hard failures attributable to schema apply.

### Preconditions

- PHASE-4 green (or explicit partial-GO scope signed).

### Success criteria

- Smoke sequence 5.1→5.8 complete with recorded results.
- Zero Sev-1 platform regressions.
- Payment live capture not exercised.

### Rollback / abort if failed

| Failure | Decision |
|---------|----------|
| ERP/CX cannot read core tables | PHASE-6 |
| Only gateway UI fails | Partial NO-GO on payments; core may still CONDITIONAL GO if signed |
| Concierge-only UI bug without DB error | Product bug ticket — not automatic DB rollback |
| Core isteBul site broken | **Immediate PHASE-6 PITR** |

---

## API endpointleri (test list)

Test **after** schema validation. Prefer staging first; production with auth as appropriate.

### Garson Cloudflare / Pages functions

| Endpoint | Method | Expect |
|----------|--------|--------|
| `/garson/api/ai/health` | GET | JSON health payload; must not fail solely due to missing GarsonAI tables (config may still be env-dependent) |
| `/garson/api/whatsapp/health` | GET | Health JSON; DB probe on `restaurants` should succeed once tenant table healthy |
| `/garson/api/whatsapp/webhook` | OPTIONS/GET as deployed | No unexpected 500 from schema absence (do not send prod traffic bursts) |

### Supabase Data API (PostgREST) — authenticated member session

Exercise `select` (limit 1) against:

`restaurants`, `orders`, `order_items`, `reservations`, `restaurant_tables`, `reservation_tables`, `reservation_guarantees`, `restaurant_waitlist`, `menu_categories`, `menu_items`, `inventory_items`, `payment_providers`, `payment_policies`, `payment_transactions`, `payment_gateway_configs`, `payment_authorizations`

**Pass:** `200` or empty `[]` — not `42P01` / schema cache miss for missing relation.

### Supabase Data API — anon CX path (careful)

Against public slug restaurant only:

- read `restaurants` via CX policies
- read `menu_categories` / `menu_items`
- read `payment_policies` (public read policy)
- **Do not** bulk-insert spam reservations in production; use staging for write smokes

### Platform payment functions (non-GarsonAI — regression only)

These use platform tables (`payment_orders`, etc.), **not** GarsonAI P7/P8 tables. Spot-check only that they still respond as before:

- `create-payment-session` / `paytr-create-payment-session` / webhooks — **no live money movement** in this window unless already standard ops.

### Client packages (optional local)

If ops runs unit smokes in CI clone (not production DB):  
`tests/unit/payment-gateway-*.test.mjs`, `ai-actions` / `ai-concierge` runtime tests — mock only; does not prove production schema.

---

## UI ekranları (test list)

### ERP (`basename /garson/erp`)

1. `/garson/erp/` — Dashboard  
2. `/garson/erp/orders` — Orders  
3. `/garson/erp/reservations` — Reservations  
4. `/garson/erp/tables` — Tables  
5. `/garson/erp/checkin` — Check-in / waitlist  
6. `/garson/erp/payments` — Payments foundation  
7. `/garson/erp/payment-gateways` — P8-E gateways  
8. `/garson/erp/menu` — Menu  
9. `/garson/erp/inventory` — Inventory  

### CX (`basename /r`)

1. `/r/demo-cafe` (or production slug) — landing  
2. `/r/{slug}/concierge` — AI Concierge  
3. `/r/onay` — confirmation shell non-regression  

### Legacy Garson surfaces

1. `/garson/panel/` and key subpages (siparişler, mutfak, rezervasyonlar, whatsapp, menü, müşteriler)  
2. `/garson/mutfak/`  
3. `/garson/giris`, `/garson/demo`, `/garson/basvuru` as smoke shells  

### Platform non-regression (sample)

- Homepage `/`  
- One vertical wizard smoke (e.g. auto or finans) — ensure unrelated site still works  

---

# PHASE-6 — Rollback Decision

### Objective

Decide restore vs forward-fix within minutes of a failed gate.

### Decision tree

```
Failure detected
  ├─ Platform / shared schema impact?
  │    YES → PITR / restore to pre-window checkpoint (PRIMARY)
  │    NO  ↓
  ├─ Mid-chain GarsonAI failure (tables half-applied)?
  │    YES → STOP apply; prefer PITR if write traffic already hit new tables
  │          else freeze feature flags / avoid ERP writes; schedule forward-fix
  │    NO  ↓
  ├─ Payments/gateway-only gap?
  │    YES → Partial NO-GO payments; core CONDITIONAL GO possible with sign-off
  │    NO  ↓
  └─ UI-only / env-only?
       YES → product ticket; DB rollback not indicated
```

### Steps

| # | Action |
|---|--------|
| 6.1 | Freeze further migration applies. |
| 6.2 | Classify failure (platform / mid-chain / partial / UI). |
| 6.3 | Release Manager chooses: **PITR** · **freeze+forward-fix** · **partial GO**. |
| 6.4 | If PITR: execute per Supabase Dashboard procedure; re-run PHASE-1 baselines. |
| 6.5 | If forward-fix: open defect ticket; do not mark production GO. |
| 6.6 | Communicate status; end or restart window. |

### Preconditions

- Failure evidence (error text, step ID, timestamp) captured.

### Success criteria

- Decision recorded with owner + timestamp.
- System either restored to known-good or explicitly frozen with no silent partial GO.

### Rollback / abort if failed

- If PITR itself fails: escalate to Supabase support / founder; keep write freeze on GarsonAI surfaces.

**Do not:** drop GarsonAI tables ad hoc as first response.  
**Do not:** edit `schema_migrations` during incident unless a pre-signed history ticket already covers it.

---

# PHASE-7 — Production GO

### Objective

Declare production database recovery complete for GarsonAI Track A (schema), and open/close Track B (history).

### GO checklist (all must be true)

| # | Gate |
|---|------|
| 7.1 | PHASE-0…5 complete with artifacts in change ticket |
| 7.2 | PHASE-4 SQL controls green |
| 7.3 | PHASE-5 smoke sequence green (or signed partial scope) |
| 7.4 | No Sev-1 platform regressions |
| 7.5 | Live payment capture still disabled / mock-default (expected) |
| 7.6 | Track B history status explicitly: **OPEN** or **CLOSED** with ticket |
| 7.7 | Release Manager + DBA dual-sign Production GO |

### Outcomes

| Outcome | Meaning |
|---------|---------|
| **FULL GO** | Track A schema complete; smoke green; Track B closed or accepted with dated plan ≤ next ops window |
| **CONDITIONAL GO** | Schema usable for ERP/CX reads; history still diverged (Track B open); no blind CLI push yet |
| **NO-GO** | Any Sev-1, failed mid-chain, or unsigned backup risk |

### Post-GO actions

1. Lift freeze selectively (eng merges).  
2. Schedule Track B history reconciliation if OPEN.  
3. Update ops calendar; attach this runbook execution log.  
4. Do **not** enable live payment providers in this GO unless a separate payment go-live ticket exists.

---

## Execution log template (copy into change ticket)

| Phase | Start | End | Owner | Result (PASS/FAIL) | Notes |
|-------|-------|-----|-------|--------------------|-------|
| 0 Freeze | | | | | |
| 1 Pre-check | | | | | |
| 2 History | | | | | |
| 3A Staging | | | | | |
| 3B Production | | | | | |
| 4 Validation | | | | | |
| 5 Smoke | | | | | |
| 6 Rollback (if any) | | | | | |
| 7 GO decision | | | | FULL / CONDITIONAL / NO-GO | |

Per-migration production log:

| Step | Start | End | Result | Error | DBA initials |
|------|-------|-----|--------|-------|--------------|
| M-08 | | | | | |
| M-09 | | | | | |
| M-12 | | | | | |
| M-13E | | | | | |
| M-13F | | | | | |
| M-14G | | | | | |
| M-14H | | | | | |
| M-15 | | | | | |
| M-16 | | | | | |
| M-17 | | | | | |
| M-18 | | | | | |

---

## Release Readiness Score

Score answers: **Are we ready to run this runbook against production?**  
(Not the same as “schema already healthy.”)

| Dimension | Weight | Score (0–10) | Weighted |
|-----------|--------|--------------|----------|
| Runbook completeness (phases, gates, rollback) | 15% | 9 | 1.35 |
| Canonical order + forbidden methods documented | 10% | 10 | 1.00 |
| Backup/PITR evidence in hand | 15% | 3 | 0.45 |
| Signed history matrix (PHASE-2) | 15% | 2 | 0.30 |
| Staging dry-run completed | 20% | 0 | 0.00 |
| SQL validation suite defined | 10% | 9 | 0.90 |
| Smoke surfaces (API/UI) enumerated | 10% | 9 | 0.90 |
| Dual-control / abort authority clear | 5% | 9 | 0.45 |
| **Total** | 100% | — | **5.35 → 54 / 100** |

### Score interpretation

| Score | Meaning |
|-------|---------|
| 0–39 | Do not schedule production window |
| 40–59 | **Runbook ready; execution not ready** — complete PHASE-1/2 + staging first |
| 60–79 | CONDITIONAL — production window allowed after staging green |
| 80–100 | FULL GO path plausible |

**Current Release Readiness Score: 54 / 100**  
**Decision:** Runbook is operable for the team, but **production apply remains NO-GO until staging dry-run + signed history matrix land** (expected jump to ≥70 after 3.A green).

---

## Document control

| Field | Value |
|-------|--------|
| Epic | P8-DBX |
| Artifact | Production Execution Runbook |
| Depends on | P8-DBR Recovery Report |
| Code / SQL migrations authored | none |
| Apply executed in-repo | none |
| Next action for humans | Execute PHASE-0 → PHASE-1 on staging calendar; fill execution log |
