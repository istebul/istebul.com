# EPIC-570B — Restore platform navigation inside Business

**Epic:** EPIC-570B  
**Status:** Implemented  
**Depends on:** EPIC-570A (header/hero isolation — no DS v4 / premium CSS on Business)

## Goal

Business pages use shared platform navigation so Business remains one product inside the isteBul platform.

## Behavior

| Requirement | Implementation |
|-------------|----------------|
| ISTEBUL logo → `/` | `BusinessPlatformNav` brand link (`data-platform-home`) |
| Platform nav visible | Sticky `.ib-biz-platform-nav` above the Business shell |
| Business branding preserved | Sidebar brand → `/business/`; platform badge “Business” |
| No duplicate headers | Single platform nav; sidebar no longer links to platform home |
| No routing regression | `BUSINESS_ROUTES` / nav items unchanged |
| No DS/premium reload | Styles scoped in `css/business-page.css` under Business tokens |

## Layout

```
.ib-business-frame
  ├── .ib-biz-platform-nav   (Ana sayfa / İSTEBUL AI / GarsonAI / Business)
  └── .ib-biz-shell
        ├── .ib-biz-sidebar  (Business product menu)
        └── .ib-biz-shell__main
              ├── .ib-biz-topbar
              └── #business-app-content
```

## Key files

- `src/business/components/BusinessPlatformNav.ts`
- `src/business/layouts/BusinessLayout.ts`
- `src/business/components/BusinessSidebar.ts`
- `css/business-page.css`
- `tests/unit/business-mvp-foundation.test.mjs`
