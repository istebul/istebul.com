# AI Decision Engine — World-Class Consultant Layer

## Architecture

| Layer | Responsibility | Hallucination control |
|-------|----------------|----------------------|
| **Decision Consultant** (`js/engines/decision-consultant.js`) | Rule-based scoring, confidence, reasons, risks | Deterministic; no LLM |
| **Auto recommend** (`js/auto/auto-ai.js`) | Catalog filter → score → TCO → rank | Numbers only from consultant + cost engine |
| **Karar Asistanı** (`js/app.js`) | Category scoring + optional AI narrative | LLM cannot override `score`, `price`, `yearlyCost` |
| **Narration** (`/ai-proxy`, Groq) | Turkish summary / refinement | `sanitizeAiNarrative`; prompt forbids numbers |

## Confidence model

`confidence` on Auto cards is **not** the match score. `computeConfidenceMeta()` blends:

- Match factor strength (from breakdown)
- Data quality (truth vs estimate catalog costs)
- Catalog coverage
- Budget clarity
- Price-in-band signal

Tiers: `high` | `medium` | `review` with explicit disclaimers.

## Explanation UX

- **Auto**: methodology strip, rank intelligence, expandable score breakdown, confidence semantics, **P3.5 karar asistanı paneli** (structured reasoning + TCO + trade-offs + uncertainty), Pro LLM synthesis only.
- **Assistant**: score breakdown per recommendation; AI extras show disclaimer that numbers are rule-based.
- **Comparison**: score factors + cost breakdown when added from Auto.

## Data health honesty

`createDecisionDataHealth()` caps confidence when `liveProvidersEnabled` is false and labels simulation mode clearly.

## Finance widgets

Auto finance blocks are labeled **simulation**; no hardcoded “%3.19” rate claims in UI.

## Tests

`tests/unit/decision-consultant.test.mjs` — scoring, confidence independence, sanitization, methodology.

## Future (P4)

Unify main `arac` assistant scoring with `scoreVehicleMatch()` to single source of truth.
