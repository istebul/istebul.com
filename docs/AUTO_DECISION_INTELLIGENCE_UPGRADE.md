# Auto Decision Intelligence Platform Upgrade

Production-safe incremental upgrade for `/auto/` — stack unchanged.

## Phase summary

| Phase | Scope | Key files |
|-------|--------|-----------|
| 1 | Ownership intelligence (TCO + depreciation) | `js/auto/cost-engine.js`, `js/auto/depreciation-engine.js`, `js/auto/auto-cost-engine.js` (re-export) |
| 2 | Trust & data transparency | `js/auto/ownership-transparency.js` |
| 3 | Recommendation intelligence + matrix | `js/auto/recommendation-intelligence.js`, `js/auto/auto-ai.js` |
| 4 | AI expert commentary lanes | `js/features/moat/ai-explanation-experience.js` |
| 5 | Premium UX CSS | `css/auto.css` |
| 6 | Provider bridge (no fake offers) | `js/auto/providers/*` |
| 7 | Lead qualification | Lead modal, `supabase/migrations/20260525_auto_lead_qualification.sql`, `auto-intake` |
| 8 | Analytics | `auto-app.js`, `auto-intake` ALLOWED_EVENTS |
| 9 | Hardening | escapeHtml on renders, existing null guards preserved |
| 10 | Validation | `npm test`, `npm run build` |

## Risks & mitigation

| Risk | Mitigation |
|------|------------|
| Breaking `estimateAnnualCost` imports | `auto-cost-engine.js` re-exports `buildOwnershipCosts` / `estimateAnnualCost` |
| CRM schema | Nullable columns only; notes fallback in intake |
| Fake partner offers | Adapters declare `hasLiveApi: false`; CTA opens lead modal only |
| AI hallucination | Facts/estimates/AI lanes separated; scores unchanged |

## Tests

- `tests/unit/auto-cost-engine.test.mjs`
- `tests/unit/auto-recommendation-intelligence.test.mjs`
- `tests/unit/decision-insight-panels.test.mjs` (existing)
- `tests/unit/ai-explanation-experience.test.mjs` (updated)

## Wizard additions

- `city_ratio` (şehir / dengeli / otoyol)
- `ownership_months` (12–48 ay)

## Analytics events

`auto_comparison_opened`, `auto_explanation_expanded`, `auto_financing_cta_clicked`, `auto_insurance_cta_clicked`, `auto_advisor_cta_clicked`, `auto_dealer_cta_clicked`
