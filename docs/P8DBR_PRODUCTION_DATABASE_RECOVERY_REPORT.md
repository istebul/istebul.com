# EPIC P8-DBR — Production Database Recovery Report

**Classification:** Production Release Engineering / PostgreSQL DBA  
**Scope:** Repository analysis + production operation plan only  
**Explicitly out of scope (this document / this PR):** feature code, React/TS, new SQL, migration edits, `db push`, `migration repair`, `schema_migrations` mutation  

**Analysis date:** 2026-07-16  
**Repository tip (GarsonAI):** `20260718_garsonai_p8e_payment_gateway.sql`  
**Stated production `schema_migrations` tip:** ~`20260618`  
**Stated production table fact:** `public.restaurants` exists; listed GarsonAI operational tables below are **not** confirmed present  

---

## Executive verdict

| Decision | Result |
|----------|--------|
| **GO / NO-GO (blind apply)** | **NO-GO** |
| **GO / NO-GO (staged GarsonAI-only after staging dry-run + history plan)** | **CONDITIONAL GO** |
| **Production Readiness Score** | **38 / 100** |

**Why NO-GO for blind CLI apply:** Local/Remote migration history divergence spans far more than GarsonAI. A naive `supabase db push --include-all` would attempt the entire unrecorded chain from ~`20260619` through `20260718` (platform, posts, AI listings, then GarsonAI). That is an uncontrolled multi-domain schema blast radius, not a GarsonAI recovery.

**Why CONDITIONAL GO for a human-owned staged recovery:** The GarsonAI files `20260708`→`20260718` form a coherent, largely idempotent, filename-ordered dependency chain with guarded publication/policy patterns. They can be treated as a **logical recovery unit** after staging rehearsal — but only with an explicit history-reconciliation plan owned by Release Engineering (not executed in this epic).

---

## A) Current Production (as stated + inferred)

### A.1 Stated facts

| Fact | Value |
|------|--------|
| Last recorded migration (approx.) | `20260618` family |
| Confirmed present | `public.restaurants` |
| Confirmed missing / unvalidated | See §D |
| CLI | `supabase migration list` shows Local / Remote divergence |
| CLI push behavior | `supabase db push` requests `--include-all` |

### A.2 Critical inference

`restaurants` existing while remote history ends near `20260618` implies **schema/history desync**:

1. Partial/manual application of `20260708_garsonai_tenant_foundation.sql` (or equivalent DDL) **without** a matching `schema_migrations` row, **or**
2. An earlier ad-hoc create of `restaurants` that happens to match / partially match the GarsonAI tenant model.

Either case means:

- Object presence ≠ migration version presence.
- Idempotent `CREATE TABLE IF NOT EXISTS` on `restaurants` is unlikely to fail, but **column/constraint drift** is unverified.
- Downstream GarsonAI migrations that `ALTER TABLE public.restaurants` (P4, P7-J) are only safe after a column inventory.

### A.3 Production unknowns (must close in PHASE-2)

Before any apply strategy is chosen, production must answer:

1. Exact remote tip version(s) in `supabase_migrations.schema_migrations` (or CLI equivalent).
2. Presence/absence of **every** GarsonAI table in §D (not only the user-listed set).
3. Presence of non-GarsonAI objects expected by `20260619`–`20260706` (to decide whether those were applied out-of-band).
4. Whether `supabase_realtime` publication exists.
5. PITR / backup window status (see `docs/SUPABASE_BACKUP_PITR_VERIFICATION.md` — currently needs manual verification).

---

## B) Current Repository

### B.1 GarsonAI migration chain (canonical order)

Filename sort is the Supabase apply order. Same-day files are ordered lexicographically:

| # | File | Epic |
|---|------|------|
| 1 | `20260708_garsonai_tenant_foundation.sql` | P2-B tenant |
| 2 | `20260709_garsonai_p4_live_restaurant_layer.sql` | P4-A live layer |
| 3 | `20260712_garsonai_p6a_production_database_readiness.sql` | P6-A readiness |
| 4 | `20260713_garsonai_p7e_inventory_foundation.sql` | P7-E inventory |
| 5 | `20260713_garsonai_p7f_reservation_management_foundation.sql` | P7-F reservations |
| 6 | `20260714_garsonai_p7g_table_planner_foundation.sql` | P7-G table planner |
| 7 | `20260714_garsonai_p7h_checkin_engine_foundation.sql` | P7-H check-in |
| 8 | `20260715_garsonai_p7i_payment_foundation.sql` | P7-I payment foundation |
| 9 | `20260716_garsonai_p7j_customer_experience_foundation.sql` | P7-J CX |
| 10 | `20260717_garsonai_p7ka_production_database_hardening.sql` | P7-KA hardening |
| 11 | `20260718_garsonai_p8e_payment_gateway.sql` | P8-E gateway |

**Order confirmation:** `p7e` < `p7f` and `p7g` < `p7h` under the same date prefix — correct dependency orientation.

### B.2 Gap before GarsonAI (why `--include-all` is dangerous)

If remote tip ≈ `20260618`, local also contains **non-GarsonAI** migrations `20260619` … `20260706` (posts, live settings, AI listings, security invoker views, etc.). Those are **outside** this GarsonAI recovery unit but **inside** a blind `--include-all` push.

### B.3 Design properties of the GarsonAI chain

| Property | Observation |
|----------|-------------|
| PostgreSQL `ENUM` types | **None** in this chain (text + `CHECK` constraints) |
| Table creates | Predominantly `CREATE TABLE IF NOT EXISTS` |
| Indexes | Predominantly `CREATE INDEX IF NOT EXISTS` |
| Policies | `DROP POLICY IF EXISTS` then `CREATE POLICY` |
| Triggers (P7-KA) | `DROP TRIGGER IF EXISTS` then `CREATE TRIGGER` |
| Functions | `CREATE OR REPLACE FUNCTION` |
| Realtime | `ALTER PUBLICATION … ADD TABLE` wrapped with `EXCEPTION WHEN duplicate_object` (and P7-KA also skips missing relations) |
| Seeds | Present in 20260708 / 09 / 12 only; use `ON CONFLICT … DO UPDATE` |

---

## C) Dependency Graph

### C.1 Table dependency DAG (create-time)

```
restaurants
├── restaurant_users → auth.users
├── restaurant_settings
├── customers
├── menu_items ──(later)→ menu_categories
├── menu_categories
│   └── products
├── orders → customers
│   └── order_items → orders, menu_items
├── kitchen_events → orders
├── ai_insights
├── whatsapp_messages
├── reservations
│   ├── preorders → reservations (P7-J column)
│   ├── restaurant_tables
│   │   └── reservation_tables → reservations + restaurant_tables
│   ├── reservation_guarantees → reservations
│   │       └── (P7-I) → payment_policies, payment_transactions
│   └── restaurant_waitlist → customers, restaurant_tables, reservations
├── inventory_categories
│   └── inventory_items
├── payment_providers
├── payment_policies
├── payment_transactions → reservations, customers
│   ├── refund_transactions
│   └── payment_audit_logs
├── payment_gateway_configs
├── payment_authorizations → reservations
│   ├── payment_provider_events
│   └── payment_settlements → authorizations, reservations
└── payment_webhooks
```

### C.2 Migration → hard prerequisites

| Migration | Must already exist |
|-----------|-------------------|
| 20260708 | `auth.users` (Supabase Auth) |
| 20260709 | `restaurants`, `restaurant_users` |
| 20260712 | `restaurants`, `menu_items`, `orders`, `whatsapp_messages` (ALTER targets) |
| 20260713 p7e | `restaurants` |
| 20260713 p7f | `restaurants`, **`reservations`** (ALTER + FK) |
| 20260714 p7g | **`restaurant_tables`**, **`orders`** |
| 20260714 p7h | `restaurants`, `customers`, `restaurant_tables`, `reservations` |
| 20260715 p7i | `restaurants`, `reservations`, `customers`; extends `reservation_guarantees` |
| 20260716 p7j | `restaurants`, `preorders`, `restaurant_tables`, `reservations`, `reservation_tables`, `menu_categories`, `menu_items`, `payment_policies`, `reservation_guarantees` |
| 20260717 p7ka | Full P7 table set (triggers/policies/indexes reference them) |
| 20260718 p8e | `restaurants`, `reservations` |

### C.3 Function / trigger dependency layer (P7-KA)

P7-KA installs tenant-integrity triggers on:

`reservation_tables`, `restaurant_waitlist`, `orders`, `inventory_items`, `payment_transactions`, `preorders`, `reservation_guarantees`

plus token assignment on `reservations`.

**Implication:** P7-KA is not optional “nice hardening” for a complete recover-to-tip; it is the integrity/CX-token layer expected by later CX behavior. Skipping it leaves schema objects from P8-E creatable, but CX/hardening guarantees incomplete.

---

## Per-migration object inventory + gate

Legend: **PASS** = safe to include in staged GarsonAI recovery unit (after prerequisites). **WARNING** = proceed with checks. **BLOCKER** = must not apply until precondition resolved.

### 1) `20260708_garsonai_tenant_foundation.sql` — **WARNING**

| Category | Objects |
|----------|---------|
| Tables | `restaurants`, `restaurant_users`, `restaurant_settings` |
| Enums | none |
| Functions | none |
| Triggers | none |
| Publication | none |
| Policies | 6 (member read/update/manage) |
| Indexes | slug/status/user/restaurant |
| FK | `restaurant_users`→`restaurants`,`auth.users`; `restaurant_settings`→`restaurants` |
| Seed | demo `restaurants` + `restaurant_settings` (`ON CONFLICT`) |

**Gate rationale:** Production already has `restaurants`. Idempotent create should not fail, but **column/CHECK drift** vs repo DDL is unverified → WARNING (not PASS).

### 2) `20260709_garsonai_p4_live_restaurant_layer.sql` — **PASS** (after 08)

| Category | Objects |
|----------|---------|
| Tables | `customers`, `menu_items`, `orders`, `order_items`, `kitchen_events`, `ai_insights`, `whatsapp_messages` |
| Functions | `garson_current_user_restaurant_ids()` |
| Publication | `orders`, `ai_insights`, `kitchen_events` (+ replica identity) |
| Policies | 14 member R/W |
| Indexes | per-table restaurant / status / order indexes |
| FK | all tenant → `restaurants`; order graph → customers/orders/menu_items |
| Seed | menu_items, customers |
| ALTER | `restaurants` phone/address/subscription_plan; `restaurant_users` role check expands to include `staff` |

### 3) `20260712_garsonai_p6a_production_database_readiness.sql` — **PASS** (after 09)

| Category | Objects |
|----------|---------|
| Tables | `menu_categories`, `products`, `reservations`, `preorders` |
| Publication | `reservations`, `preorders` |
| Policies | 8 |
| FK | categories/products/reservations/preorders → restaurants; products → menu_categories |
| ALTER | `menu_items` (+category/stock/active), `orders` (+line_items/total), `whatsapp_messages` (+phone/body) |
| Seed | categories, reservations, preorders, products |

### 4) `20260713_garsonai_p7e_inventory_foundation.sql` — **PASS** (after 08)

| Category | Objects |
|----------|---------|
| Tables | `inventory_categories`, `inventory_items` |
| Publication | both |
| Policies | 4 |
| FK | → restaurants; items → categories |

Independent of reservations; only needs tenant root.

### 5) `20260713_garsonai_p7f_reservation_management_foundation.sql` — **PASS** (after 12)

| Category | Objects |
|----------|---------|
| Tables | `restaurant_tables`, `reservation_tables`, `reservation_guarantees` |
| Publication | all three |
| Policies | 6 |
| FK | reservation_tables → reservations + restaurant_tables; guarantees → reservations |
| ALTER | extensive `reservations` guest/ops columns + status/arrival checks |

**BLOCKER if run before P6-A:** `ALTER TABLE public.reservations` / FK to missing `reservations`.

### 6) `20260714_garsonai_p7g_table_planner_foundation.sql` — **PASS** (after p7f + p4)

| Category | Objects |
|----------|---------|
| Tables | none (ALTER-only) |
| ALTER | `restaurant_tables` status/layout; `orders.table_id` FK → restaurant_tables |
| Indexes | table status; orders.table_id |
| Publication | re-add `restaurant_tables` (duplicate-safe) |

### 7) `20260714_garsonai_p7h_checkin_engine_foundation.sql` — **PASS** (after p7f + p4 + p6a)

| Category | Objects |
|----------|---------|
| Tables | `restaurant_waitlist` |
| Publication | waitlist |
| Policies | 2 |
| FK | → restaurants, customers, restaurant_tables, reservations |
| ALTER | `reservations.party_source` + check |

### 8) `20260715_garsonai_p7i_payment_foundation.sql` — **WARNING**

| Category | Objects |
|----------|---------|
| Tables | `payment_providers`, `payment_policies`, `payment_transactions`, `refund_transactions`, `payment_audit_logs`, **`reservation_guarantees` (IF NOT EXISTS re-declare)** |
| Publication | all payment tables + guarantees |
| Policies | 12 (includes guarantee policies again) |
| ALTER | guarantee payment linkage columns |

**WARNING:** Duplicate `CREATE TABLE IF NOT EXISTS reservation_guarantees` vs P7-F. Safe if P7-F already applied (no-op create + additive columns). Unsafe only if someone invents an out-of-order apply that creates a thinner P7-I shape without P7-F constraints — do not reorder.

### 9) `20260716_garsonai_p7j_customer_experience_foundation.sql` — **PASS** (after p7i)

| Category | Objects |
|----------|---------|
| Tables | none |
| Functions | `garson_public_restaurant_id_by_slug` |
| Policies | 11 public/anon CX policies |
| ALTER | restaurant public profile fields; preorder reservation/customer fields |

**WARNING note (non-blocking):** Broadens anon write surface (reservation/preorder/guarantee insert). Security review before production apply is mandatory, but not a DDL blocker.

### 10) `20260717_garsonai_p7ka_production_database_hardening.sql` — **WARNING**

| Category | Objects |
|----------|---------|
| Functions | 12 (`garson_set_updated_at`, token helpers, CX getter, 7 enforce_* tenant guards) |
| Triggers | token assign + 7 tenant enforcers + dynamic `updated_at` triggers |
| Policies | replaces/tightens several CX read/insert policies |
| Indexes | unique access/request tokens; composite ops indexes; unique provider_tx; partial unique active policy |
| Publication | re-ensures P7 set (skips missing tables; catches duplicates) |
| ALTER | token columns; amount checks; expanded guarantee status check |

**WARNING:** Highest behavioral density. DDL is idempotent-minded, but trigger enforcement will reject cross-tenant bad rows. Staging must validate with clean demo seeds.

### 11) `20260718_garsonai_p8e_payment_gateway.sql` — **PASS** (after p7i + reservations)

| Category | Objects |
|----------|---------|
| Tables | `payment_gateway_configs`, `payment_authorizations`, `payment_webhooks`, `payment_provider_events`, `payment_settlements` |
| Publication | all five |
| Policies | 10 |
| FK | → restaurants; auth/events/settlements → authorizations/reservations |

---

## D) Missing Tables (grouped by migration)

Using the operator-provided missing list, mapped to first-creating migration.  
*(Plus related tables created in the same files that were not listed but should be verified.)*

### `20260708` — tenant

| Listed missing? | Table |
|-----------------|-------|
| (present) | `restaurants` ✓ |
| unlisted / verify | `restaurant_users`, `restaurant_settings` |

### `20260709` — P4 live

| Listed missing | Table |
|----------------|-------|
| ✓ | `customers` |
| ✓ | `menu_items` |
| ✓ | `orders` |
| ✓ | `order_items` |
| unlisted / verify | `kitchen_events`, `ai_insights`, `whatsapp_messages` |

### `20260712` — P6-A

| Listed missing | Table |
|----------------|-------|
| ✓ | `menu_categories` |
| ✓ | `reservations` |
| unlisted / verify | `products`, `preorders` |

### `20260713` p7e — inventory

| Listed missing | Table |
|----------------|-------|
| ✓ | `inventory_categories` |
| ✓ | `inventory_items` |

### `20260713` p7f — reservation management

| Listed missing | Table |
|----------------|-------|
| ✓ | `restaurant_tables` |
| ✓ | `reservation_tables` |
| ✓ | `reservation_guarantees` |

### `20260714` p7g — table planner

No new tables (ALTER-only). Depends on `restaurant_tables` + `orders`.

### `20260714` p7h — check-in

| Listed missing | Table |
|----------------|-------|
| ✓ | `restaurant_waitlist` |

### `20260715` p7i — payment foundation

| Listed missing | Table |
|----------------|-------|
| ✓ | `payment_providers` |
| ✓ | `payment_policies` |
| ✓ | `payment_transactions` |
| unlisted / verify | `refund_transactions`, `payment_audit_logs` |

### `20260716` p7j — CX

No new tables.

### `20260717` p7ka — hardening

No new tables.

### `20260718` p8e — gateway

| Listed missing | Table |
|----------------|-------|
| ✓ | `payment_gateway_configs` |
| ✓ | `payment_authorizations` |
| ✓ | `payment_webhooks` |
| ✓ | `payment_provider_events` |
| ✓ | `payment_settlements` |

---

## E) Risk Matrix

| Risk | Likelihood | Impact | GarsonAI chain mitigation | Residual |
|------|------------|--------|---------------------------|----------|
| Duplicate CREATE TABLE | Med | Low | `IF NOT EXISTS` | Column drift if table created differently |
| Duplicate POLICY | High on re-run | Low | `DROP POLICY IF EXISTS` | Momentary policy gap during drop/create |
| Duplicate INDEX | Med | Low | `IF NOT EXISTS` | Name collision with different definition (rare) |
| Duplicate TRIGGER | Med on re-run | Low | `DROP TRIGGER IF EXISTS` (P7-KA) | Brief window without trigger |
| Duplicate FUNCTION | Med | Low | `CREATE OR REPLACE` | Signature/behavior change replaces silently |
| Duplicate PUBLICATION membership | High on re-run | Low→Med | `EXCEPTION WHEN duplicate_object` | If publication missing, some files NOTICE-skip |
| ALTER missing relation | **High if order broken / partial chain** | **High** | Strict order in §F | **Primary operational blocker class** |
| FK dependency failure | High if order broken | High | DAG in §C | Same |
| Enum collision | **None observed** | — | No `CREATE TYPE … AS ENUM` | N/A |
| RLS collision / over-permissive CX | Med | High (security) | P7-J then P7-KA tightens | Review anon policies before GO |
| Realtime publication collision | Med | Low | guarded ADD TABLE | Channel consumers may appear after apply |
| Blind `--include-all` non-GarsonAI blast | **High if used** | **Critical** | Do not use for GarsonAI recovery | See §6 |
| Seed upsert side effects | Low–Med | Low | `ON CONFLICT DO UPDATE` | May refresh demo rows |
| History still diverged after object apply | **Certain without repair** | High (ops) | Separate history plan | CLI remains noisy |
| P7-I re-declare `reservation_guarantees` | Low if order kept | Med if reordered | Keep p7f before p7i | Documented WARNING |

---

## 6) History divergence — does it block this chain?

### Short answer

| Question | Answer |
|----------|--------|
| Does Local/Remote divergence block **naive** `supabase db push`? | **Yes.** CLI wants `--include-all` because remote lacks version rows for many local files. |
| Does divergence mean GarsonAI DDL is **technically impossible** to apply? | **No.** The SQL files are a self-contained, ordered, mostly idempotent chain. |
| Can GarsonAI be treated as a **separate safe logical chain**? | **Yes, as a DBA-owned recovery unit** — *not* as “ignore history and hope CLI is fine.” |
| Does applying objects without history reconciliation finish the job? | **No.** Objects and `schema_migrations` must eventually converge, or future deploys remain hazardous. |

### Technical justification

1. **Supabase CLI applies by migration history, not by “missing tables.”** If remote tip is `20260618`, `--include-all` schedules every later local file — including non-GarsonAI platform migrations — not only `*_garsonai_*`.
2. **Object presence without version rows** (e.g. `restaurants`) proves history is already untrustworthy. Repair/marking strategies exist in Supabase ops practice, but **are explicitly forbidden in this epic** and must be planned (not executed) under PHASE-2/3 by humans.
3. **GarsonAI files do not depend on `20260619`–`20260706` objects** for their CREATE/FK graph (they depend on Auth + their own prior GarsonAI tables). That supports isolating GarsonAI as a logical unit *for schema recovery planning*.
4. **Isolation ≠ free pass.** Applying GarsonAI SQL out-of-band without a recorded history strategy leaves the next engineer facing the same divergence, plus new objects. That is operational debt, not recovery completion.

### Recommendation (planning only)

- **Do not** use blind `db push --include-all` as the GarsonAI recovery tool.
- **Do** plan a **two-track** recovery:
  - **Track A — Schema:** ordered GarsonAI unit on staging → production (human-approved).
  - **Track B — History:** reconcile version rows only after Track A evidence, via an approved ops change (separate change ticket; not this PR).

---

## F) Execution Order (schema unit)

Strict order for the GarsonAI recovery unit:

1. `20260708_garsonai_tenant_foundation.sql`
2. `20260709_garsonai_p4_live_restaurant_layer.sql`
3. `20260712_garsonai_p6a_production_database_readiness.sql`
4. `20260713_garsonai_p7e_inventory_foundation.sql`
5. `20260713_garsonai_p7f_reservation_management_foundation.sql`
6. `20260714_garsonai_p7g_table_planner_foundation.sql`
7. `20260714_garsonai_p7h_checkin_engine_foundation.sql`
8. `20260715_garsonai_p7i_payment_foundation.sql`
9. `20260716_garsonai_p7j_customer_experience_foundation.sql`
10. `20260717_garsonai_p7ka_production_database_hardening.sql`
11. `20260718_garsonai_p8e_payment_gateway.sql`

**Do not skip** 08/09/12 even if some objects appear present — use them as idempotent alignment steps after column inventory.

**Do not reorder** same-day pairs.

---

## Production Release Plan

### PHASE-1 — Hazırlık (Preparation)

1. Freeze production schema changes unrelated to this recovery.
2. Confirm PITR/backup eligibility and last backup timestamp (Dashboard; update `docs/SUPABASE_BACKUP_PITR_VERIFICATION.md` evidence log).
3. Snapshot inventory queries (read-only) for:
   - `schema_migrations` tip(s)
   - `information_schema.tables` for all tables in §D
   - column lists for `restaurants`, and any partially present GarsonAI tables
   - `pg_publication_tables` for `supabase_realtime`
4. Stand up / refresh a **staging** project restored from production (preferred) or schema-cloned.
5. Appoint Release Owner + DBA + on-call; define abort criteria (any unexpected DROP risk, FK explosion, RLS lockdown of critical platform tables).
6. Explicitly forbid in the change window: feature deploys that assume missing GarsonAI tables.

### PHASE-2 — History doğrulama (History validation)

1. Run `supabase migration list` against production and staging; archive output.
2. Classify every local file after remote tip into:
   - **Already reflected in objects** (applied out-of-band)
   - **Missing objects**
   - **Unknown / needs deep compare**
3. Separate buckets:
   - Bucket G: `*_garsonai_*` `20260708`–`20260718`
   - Bucket P: platform `20260619`–`20260706` (out of GarsonAI unit)
4. Decide history strategy **on paper only** for this epic (examples of strategy classes — not executed here):
   - mark-as-applied for migrations proven already present
   - apply-then-record for truly missing migrations
   - never mix “mark” and “apply” without evidence
5. Exit criteria: written matrix of file → {present|missing|partial} signed by DBA.

### PHASE-3 — Apply stratejisi (Apply strategy)

**Selected strategy class:** Staged **GarsonAI-only schema unit** (Track A), after staging green.  
**Rejected strategy class:** Blind production `db push --include-all`.

Staging procedure (human ops; not performed by this agent):

1. Apply Bucket G **in §F order** on staging.
2. After each file (or after each epic group), run smoke queries from PHASE-4.
3. Record wall-clock duration and errors.
4. Only if staging is clean: schedule production maintenance window.
5. Production: same order, same verification gates; abort on first unexpected error.
6. Track B (history reconciliation) only after Track A object verification — separate approval.

### PHASE-4 — Smoke test

Minimum read-only / write-sandbox checks post-apply (staging first):

1. **Existence:** all §D tables + unlisted companions (`preorders`, `products`, `kitchen_events`, `ai_insights`, `whatsapp_messages`, `refund_transactions`, `payment_audit_logs`, `restaurant_users`, `restaurant_settings`).
2. **FK:** insert/delete dry-run in a transaction that rolls back for a demo restaurant (or use existing demo seed ids).
3. **RLS:** authenticated member can read own restaurant rows; anon CX path behaves as designed for public slug read (no cross-tenant leak).
4. **Realtime:** target tables listed in publications without duplicate errors.
5. **P7-KA:** `reservations.access_token` unique indexes exist; tenant triggers present on enforce targets.
6. **P8-E:** gateway tables empty-but-writable under member policies; no live provider calls required.
7. **Non-regression:** core isteBul platform tables used by production site still queryable (leads, posts, etc.).

### PHASE-5 — Rollback planı

PostgreSQL DDL rollback is **not** a simple reverse migration for this chain.

| Layer | Rollback approach |
|-------|-------------------|
| Prefer | **PITR / restore to pre-window backup** if apply causes platform impact |
| Partial GarsonAI failure mid-chain | **Stop.** Do not continue. Assess whether partial objects are usable; prefer restore over hand-dropping interdependent tables |
| Dropping GarsonAI tables manually | Last resort only; FK order reverse of §C; **high risk** of missing dependent objects; not recommended vs PITR |
| RLS/policy only regressions | Re-apply last known-good policy set from repo file for that epic (still a controlled ops action) |
| History mistakes | Correct only under a dedicated history ticket; do not improvise `schema_migrations` edits during incident |

**Abort rule:** Any error on ALTER of a shared platform table outside GarsonAI → immediate abort + restore evaluation.

---

## G) Rollback Strategy (summary)

1. **Primary:** PITR / project restore to pre-maintenance checkpoint.  
2. **Secondary:** Leave partial GarsonAI schema in place only if smoke tests prove non-impact to platform traffic; schedule forward-fix.  
3. **Tertiary:** Controlled reverse drop of GarsonAI-only tables in reverse dependency order — **avoid** unless restore unavailable.  
4. Never rollback by re-running unordered SQL or by deleting `schema_migrations` rows ad hoc.

---

## H) GO / NO-GO

| Path | Decision |
|------|----------|
| Production `supabase db push --include-all` now | **NO-GO** |
| Production apply of GarsonAI unit without staging rehearsal | **NO-GO** |
| Production apply without backup/PITR confirmation | **NO-GO** |
| Staging apply of GarsonAI unit in §F order | **GO** (planning-approved) |
| Production GarsonAI unit after staging green + PHASE-2 matrix signed | **CONDITIONAL GO** |
| History repair / `schema_migrations` updates | **NO-GO in this epic** (separate ops ticket required) |

---

## I) Production Readiness Score

| Dimension | Score (0–10) | Notes |
|-----------|--------------|-------|
| Migration chain completeness in repo | 10 | Tip at P8-E; chain contiguous |
| Idempotency / guard quality | 8 | Strong IF NOT EXISTS / policy drops / pub guards |
| Production history integrity | 2 | Tip ~20260618 vs objects (`restaurants`) desync |
| Missing-table gap closure | 2 | Large GarsonAI surface absent |
| Non-GarsonAI divergence control | 2 | `--include-all` blast radius |
| Staging evidence | 0 | Not produced in this epic |
| Backup/PITR evidence | 3 | Template exists; manual verification pending |
| Security (CX anon policies) review sign-off | 4 | Policies exist in SQL; no prod sign-off recorded |
| Rollback preparedness | 5 | PITR path known; not verified |
| Ops runbook clarity (this report) | 8 | Plan documented |

**Weighted readiness: 38 / 100 — NOT READY for production apply.**

---

## Appendix — Operator checklist (read-only discovery)

Use in PHASE-1/2 (operators run these; this epic does not). Intent only — no migration SQL authored here:

1. List remote migration versions / CLI `migration list`.  
2. List `public` tables matching GarsonAI names in §D.  
3. Diff `restaurants` columns vs `20260708` + later ALTERs (P4, P7-J, P7-KA).  
4. Confirm `supabase_realtime` publication exists.  
5. Confirm no unexpected tables already named like payment_* from older platform payment migrations (`20260617_payment_infrastructure_iyzico_paytr.sql` is a **different** domain — name-collision review required before P7-I/P8-E).

### Name-collision note (platform vs GarsonAI)

Repository also contains `20260617_payment_infrastructure_iyzico_paytr.sql` (pre-GarsonAI). Before applying P7-I/P8-E, operators must verify there is **no conflicting** `payment_*` table shape already in production under the same names. If platform payment tables exist with different schemas, that becomes a **BLOCKER** elevating readiness failure until a human schema-compare is completed.

---

## Document control

| Field | Value |
|-------|--------|
| Epic | P8-DBR |
| Artifact type | Production Database Recovery Report |
| Code changes | none |
| SQL authored | none |
| Migrations modified | none |
| Apply performed | none |
| Next human gate | PHASE-1 inventory + staging dry-run approval |
