# Design System v4 — Premium Polish (Quality Tour 2)

**Commit:** `Polish premium UI quality after Design System v4 restore`

## CSS strategy

- New layer: `css/istebul-ds-v4-polish.css` (imported from `istebul-design-system-v4.css`)
- No new `!important` rules
- Does not remove v4 restore; extends it with zone-specific polish
- Legacy vertical CSS kept; polish overrides only where contrast/spacing failed

## Conflicts cleaned / avoided

| Area | Issue | Fix |
|------|--------|-----|
| Category cards | White bg + dark text colors from legacy | Scoped `.ib-home-categories-premium` typography |
| Konut hero metrics | Low label/value contrast | Dashboard-style metric cards, mono values |
| Konut wizard | Dark-on-dark form | White step/side panels, light inputs |
| Finans results | Dark `ib-premium-block` on light page | Light blocks + white KPI cards |
| Finans hero dash | Muddy gray cards | Higher contrast labels `#94a3b8`, values `#fff` |
| Auto results | Inherit dark page noise | Light `auto-v2` panel/KPI polish |
| Global | Horizontal overflow risk | `overflow-x: clip` + max-width guards |

## Pages improved

| Page | Improvements |
|------|----------------|
| `/` (index) | Hero gradient refinement, dashboard grid, category cards, live stats, CTA shadow |
| `/auto/` | Header, v2 panel/KPI contrast |
| `/konut/` | Hero 6-metric dashboard, wizard/side panel light premium, results/konut-v2 KPIs |
| `/tatil/` | Hero dashboard cards, premium KPI blocks |
| `/finans/` | Hero dash cards, score band, results dashboard KPIs |
| `/admin-panel.html` | Page padding, table contrast, form control height |
| Account (index `#account-root`) | Profile card light surface + readable text |

## Contrast fixes

- Dark hero: `#FFFFFF` / `#CBD5E1` secondary
- Light sections: `#111827` / `#6B7280`
- Konut metric labels: `#94a3b8` → values `#ffffff`
- Finans/Tatil KPI results: white cards, dark values
- No gray-on-gray category copy on homepage grid

## Responsive (375 / 768 / 1440)

- Mobile: single-column hero/dashboard, 2-col category chips, housing/finans hero stack
- Tablet: 2-col category grid, housing layout single column
- Desktop 1440+: container max 1180px, hero grid balance
- Modals/dropdowns: `max-width: calc(100vw - 2rem)` on small screens

## Tests

| Command | Result |
|---------|--------|
| `npm run build` | Run in CI |
| `npm test` | May fail bundle budget (pre-existing) |

## Remaining risk

- Auto runtime uses separate `ib-car.css` bundle; polish touches `auto-v2` only where classes exist in DOM
- Housing page remains dark shell with light wizard islands — intentional hybrid
- Multiple legacy imports in `style.css` still loaded on homepage; future dedup optional
