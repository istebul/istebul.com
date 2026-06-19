# Maintainability Audit

**Branch:** `cursor/enterprise-maintainability-0bbd`  
**Goal:** Enterprise-grade clean codebase — reduce coupling, duplication, and fragile paths.

## Implemented (this PR)

| Issue | Fix |
|-------|-----|
| Duplicate `escapeHtml` / safe helpers | `js/core/dom-safe.js` + imports in admin, auto |
| Split storage key namespaces | `js/core/storage-keys.js` + legacy `istebu_*` migration |
| Admin CRM reads blocked by RLS | `admin-action` `list` + `adminList()` in `admin-client.js` |
| Duplicate admin-action client code | `invokeAdminFunction()` shared module |
| Auth error mapping unused | `mapAuthError` wired in `AuthManager` + admin login |
| Inconsistent sign-in | `API.signIn` → Supabase SDK (same as admin) |
| Double login side effects | `completeSessionBootstrap()`; no duplicate `userLoggedIn` on cold load |
| Lead status normalization duplicated | `js/core/lead-status.js` |
| Phone/WhatsApp normalization duplicated | `js/core/phone.js` |
| `window.app` coupling in Auto | `js/core/app-bridge.js` |
| Dead admin modules unclear | Deprecation headers + README in `js/admin/`, `js/features/admin/` |
| Duplicate partner_status block in edge fn | Removed duplicate in `admin-action` |
| Architecture undocumented | `docs/ARCHITECTURE.md` |
| Dead `ListingManager` / `ProfileManager` modules | Removed `js/features/ilan/ilan.js`, `js/features/profil/profil.js`; profile save uses `API.updateProfile` in `account.js` (P0-5) |

## Remaining backlog (prioritized)

### P0 — High risk

1. **Split `js/app.js` (~4k lines)** — extract `decision-assistant/`, `listings/`, `billing/`; keep bootstrap only (see P0-3 modularization plan).

### P1 — Medium

3. **Unify analytics dashboards** — deprecate `auto_events` reads; single `analytics_events` source in admin.
4. **Merge vehicle cost engines** — shared core in `js/engines/`; Auto truth-layer + marketplace simplified wrapper.
5. **UI installer pattern** — replace prototype mutation in `ui.js` with composition.

### P2 — Lower

6. **Consolidate in-app `/admin` route** with `admin-panel` or document boundary permanently.
7. **Remove `js/admin/crm.js`** after confirming no external imports.
8. **Partner callback `prompt()` in admin** — gate behind dev flag.

## Module boundaries (target)

```
js/
  core/          # No UI; shared infra
  features/      # Domain logic (auth, monetization, …)
  ui/            # DOM rendering only
  engines/       # Pure functions
  auto/          # Auto product bundle
  admin-panel.js # Ops admin (canonical)
  app.js         # Main bootstrap (shrink over time)
```

## Verification

```bash
npm run test
npm run test:unit
```

Manual: admin Auto Leads + Auto Analytics load after deploy; main app login + favorites persist across legacy keys.
