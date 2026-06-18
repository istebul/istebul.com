# Supabase Backup/PITR Verification

**Project ref:** `hjfrcdstbyonmgatgwcc`  
**Site:** https://www.istebul.com  
**Created:** 2026-06-18

---

## Status

| Field | Value |
|-------|--------|
| **Current status** | `NEEDS MANUAL VERIFICATION` |
| **Last verified** | `NOT VERIFIED IN REPO` |
| **Owner role** | Ops / Founder |
| **Evidence location** | `docs/investor/DATA_ROOM_INDEX.md` · this file · external data room evidence slot |
| **Scope** | Supabase managed backups, PITR, logical restore drill |
| **Do not store** | secrets, database dumps, customer PII, production data exports |

---

## Why this exists

- Closes the **R-A1 P0** action in `docs/PRODUCTION_RESILIENCE_AUDIT.md`: *Supabase backup/PITR doğrulama + dokümantasyon*.
- Operational evidence template for PITR and logical restore steps already described in `docs/RESILIENCE_RUNBOOK.md` (§5 Data recovery, §8 Weekly checklist).
- **This file is an evidence log template only.** It does **not** claim that backups or PITR are enabled until a verifier completes the manual checklist and updates the evidence log below.

---

## Manual verification checklist

Complete outside the repo (Supabase Dashboard). Do not paste secrets or connection strings here.

1. Open **Supabase Dashboard** → Project → **Database** → **Backups** (or **Point in Time Recovery**).
2. Confirm plan eligibility for managed backups / PITR (Pro or higher as applicable).
3. Record whether **PITR** appears enabled or not (do not assume from this doc).
4. Note **last backup** timestamp shown in Dashboard.
5. Note **retention window** (days) shown in Dashboard.
6. Confirm a **restore target** can be selected (new project or PITR point — UI only; do not run restore in this step unless doing a scheduled drill).
7. Confirm verifier has appropriate **access role** (Owner or delegated ops).
8. Capture evidence screenshot with a stable filename (e.g. `supabase-backup-pitr-YYYY-MM-DD.png`) stored in data room / secure ops storage — **not** in this public repo if it contains account identifiers beyond project ref.
9. Set **verification date** (ISO `YYYY-MM-DD`).
10. Set **verifier** name/role and short **notes** (plan tier, retention, any blockers).

---

## Evidence log

| Date | Environment | Verified by | Backup status | PITR status | Restore drill status | Evidence reference | Notes |
|------|-------------|-------------|---------------|-------------|----------------------|--------------------|-------|
| YYYY-MM-DD | production | TBD | TBD | TBD | not-run | TBD | Initial placeholder; do not claim enabled until manually verified |

**Status values (suggested):** `enabled` · `disabled` · `unknown` · `not-applicable` · `not-run`

---

## RPO/RTO targets

Referenced from `docs/PRODUCTION_RESILIENCE_AUDIT.md` §4.3 (recommended targets, not yet operationally proven):

| Metric | Target | Verification state |
|--------|--------|-------------------|
| **RPO** (data) | ≤ 1 hour | **Pending operational verification** — requires PITR/backup enabled confirmation + evidence log |
| **RTO** (platform) | ≤ 4 hours | **Pending drill** — requires successful restore drill to staging or isolated project |
| **RTO** (read-only marketing) | ≤ 30 min | Static/CF cache only; separate from DB restore |

These targets are **not** validated by this document until the evidence log and restore drill template below are completed with real dates and results.

---

## Restore drill template

Use for staging or isolated Supabase project only. Do not run against production without explicit ops approval.

| Field | Value |
|-------|--------|
| **Drill date** | YYYY-MM-DD |
| **Environment** | staging / isolated-restore-project |
| **Source backup / PITR timestamp** | YYYY-MM-DD HH:MM UTC |
| **Restore target** | project name / ref (no connection strings) |
| **Tables checked** | e.g. `auto_leads`, `subscriptions`, `profiles` (row counts only) |
| **Integrity checks** | sample row checksums, `metrics:ops` smoke, edge smoke |
| **Duration** | e.g. 45 min |
| **Issues** | none / describe |
| **Result** | PASS / FAIL |
| **Rollback / cleanup** | delete temp project / document retention |
| **Approver** | name / role |

**Checklist:**

- [ ] Drill date recorded
- [ ] Non-production restore target used
- [ ] Source backup or PITR timestamp documented
- [ ] Critical tables row-count sanity check
- [ ] Integrity checks executed (no PII pasted into repo)
- [ ] Duration and issues noted
- [ ] Result PASS or FAIL recorded
- [ ] Rollback/cleanup completed
- [ ] Approver signed off
- [ ] Summary row added to **Evidence log** (`Restore drill status` column)

---

## Quarterly review

- Every **quarter**, repeat the **Manual verification checklist** and update the **Evidence log**.
- Attach or reference a fresh Dashboard screenshot in the data room evidence slot.
- Review RPO/RTO targets against actual retention and last drill duration.
- **Do not** mark status as `verified` or claim PITR/backup enabled in investor materials until this quarterly review is complete and the evidence log reflects real dates and statuses.

---

## Explicit non-goals

This document and its introducing PR:

- Do **not** take a production DB dump.
- Do **not** run a restore drill.
- Do **not** change Supabase project settings.
- Do **not** configure off-site backup (e.g. `pg_dump` to R2/S3 — see R-A9 in `docs/PRODUCTION_RESILIENCE_AUDIT.md`).
- Do **not** contain secrets, API keys, connection strings, tokens, or customer PII.

---

## Next operational step

1. **Outside repo:** Supabase Dashboard → Database → Backups/PITR — complete manual verification and fill the **Evidence log** row.
2. **Separate ops task / follow-up PR:** Run staging restore drill; complete **Restore drill template**; update evidence log `Restore drill status`.
3. **Quarterly:** Repeat verification and evidence update per **Quarterly review**.

**Related:** `docs/PRODUCTION_RESILIENCE_AUDIT.md` · `docs/RESILIENCE_RUNBOOK.md` · `docs/investor/RISK_REGISTER.md` (R7)
