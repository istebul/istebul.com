# Phase 3A — Decision Category Cards

## Goal

Transform category result cards from generic listing-style surfaces into **category-specific AI-assisted decision cards**, without changing score/TCO/risk engines, Supabase, or production renderers in this phase.

## Principles

| Rule | Implementation |
|------|----------------|
| Engines own numbers | `decisionScore` is passed through from `scenario.score` — never recomputed in adapters |
| AI narrates only | `buildDecisionInsight()` reads engine context; no new scoring |
| Shadow mode first | New modules are not wired into live UI in 3A-1 |
| Backward compatible | `_source` preserves the original engine scenario object |

## Architecture

```
Engine output (unchanged)
    ↓
DecisionCategoryCardAdapter (pure function)
    ↓
DecisionCategoryCardViewModel
    ↓
[3A-2+] Renderer behind feature flag
```

### Module map

| Path | Role |
|------|------|
| `js/features/decision-cards/decision-category-card-contract.js` | ViewModel contract + shared assembly helpers |
| `js/features/decision-cards/decision-category-card-signals.js` | Per-category signal labels and tone helpers |
| `js/features/decision-cards/adapters/*.js` | Category adapters (read-only mapping) |
| `js/features/decision-cards/adapters/index.js` | Registry + `adaptCategoryCard()` |

## ViewModel contract

```typescript
interface DecisionCategoryCardViewModel {
  categoryId: 'araba' | 'konut' | 'tatil' | 'finansman' | 'sigorta' | 'kasko';
  scenarioId: string;
  title: string;
  decisionScore: number;           // passthrough from scenario.score
  recommendationLevel: 'proceed' | 'proceed_with_caution' | 'wait' | 'avoid';
  signals: Signal[];               // max 4
  aiExplanation: {
    summary, why, risk, nextStep, disclaimer,
    source: 'engine' | 'llm'
  };
  pros: string[];
  cautions: string[];
  cta: { primary, secondary? };
  _source: object;                 // original engine scenario
}
```

## Adapter input

```typescript
interface DecisionCardAdapterInput {
  scenario: object;    // engine scenario card (required for happy path)
  engine?: object;     // full engine result (sigorta/kasko/auto/konut V2)
  state?: object;      // wizard form state
  metrics?: object;    // category metrics (konut DTI, auto TCO, etc.)
}
```

## Category signal vocabulary

| Category | Primary signals |
|----------|-----------------|
| Sigorta | Prim bandı, Koruma, Teminat, Verimlilik, Genel risk |
| Kasko | Prim bandı, Teminat, Onarım riski, Prim verimliliği |
| Finansman | Aylık yük, Nakit baskısı, Finansman uyumu, Toplam geri ödeme |
| Tatil | Tahmini maliyet, Uygunluk, Profil, Bütçe uyumu |
| Konut | Aylık etki, Toplam etki, Risk etkisi, DTI |
| Araba | Aylık maliyet, Yakıt, İkinci el, Uygunluk |

## Rollout plan

| Phase | Scope | Production impact |
|-------|-------|-------------------|
| **3A-1** | Contract + adapters + unit tests | None (shadow) |
| **3A-2** | Renderer + CSS + `?decision_cards=1` on sigorta/kasko | Opt-in only — **implemented** |
| **3A-3** | Finansman + tatil | Opt-in |
| **3A-4** | Konut + araba | Opt-in |
| **3A-5** | Marketplace listing card signal strip | Low |
| **3A-6** | Homepage category cards | Marketing layer |

## Usage (development)

```javascript
import { buildSigortaResults, buildEngineResult } from '../features/sigorta/sigorta-engine.js';
import { adaptSigortaCard } from '../features/decision-cards/adapters/sigorta-adapter.js';

const state = { insurance_type: 'saglik', age: 38, budget_level: 'orta' };
const results = buildSigortaResults(state);
const engine = buildEngineResult(state);

const viewModel = adaptSigortaCard({
  scenario: results[0],
  engine,
  state
});

// viewModel.decisionScore === results[0].score (passthrough)
// viewModel._source === results[0]
```

## Out of scope (3A-1)

- Router changes
- Supabase schema or queries
- Changes to `vertical-decision-app.js`, `auto-app.js`, `listings-ui.js`
- New LLM calls or score engines
- Visible UI changes
