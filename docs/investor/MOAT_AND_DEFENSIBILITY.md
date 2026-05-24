# Moat & Defensibility

**Strategic playbook (TR, competitor-by-competitor):** `docs/COMPETITIVE_MOAT_STRATEGY.md`

## Core thesis

isteBul competes on **decision quality and trust**, not inventory size. Listings marketplaces optimize for supply; banks optimize for origination. isteBul optimizes for **aligned recommendations** with explainable economics.

## Moat layers

### 1. Decision IP (software)

| Asset | Location | Defensibility |
|-------|----------|---------------|
| Multi-factor scoring | `js/engines/decision-consultant.js` | High — tested, documented |
| Confidence ≠ score | `computeConfidenceMeta()` | Differentiated UX |
| Anti-hallucination | LLM cannot set price/score | Trust / regulatory |
| TCO engines | `js/engines/cost-engine.js`, `auto-cost-engine.js` | Medium |

### 2. Data layer

| Asset | Location | Defensibility |
|-------|----------|---------------|
| Vehicle catalog + cost truth | Supabase migrations | Medium — expandable |
| Finance offers | `finance_offers` | Medium — partner-dependent |
| Simulation mode | `market-data.js` | **Low until live feeds** |

**Path to data moat:** Exclusive dealer feeds, OEM APIs, aggregated anonymized outcomes (“models that closed in 14 days”).

### 3. Network / operations

| Asset | Description |
|-------|-------------|
| Partner dispatch | Automated lead routing + retry + callback |
| CRM + revenue fields | Closed-loop learning on win rates |
| Lead scoring | Server-side in `auto-intake` |

**Flywheel:** More leads → better partner SLAs → better consumer outcomes → higher conversion.

### 4. Platform optionality

- 8-vertical roadmap with shared registry (in progress)
- Global locale + pricing localization foundation
- Pro subscription across verticals

## What is NOT a moat (be honest in diligence)

- Generic LLM wrappers (commoditized)
- Static SEO pages alone
- UI polish without retention data
- Estimated partner revenue without contracts

## Competitive positioning

| Competitor type | Their wedge | isteBul counter |
|-----------------|-------------|-----------------|
| Classifieds | Inventory | Decision + TCO + finance fit |
| Bank calculators | Single product | Neutral multi-bank comparison |
| OEM configurators | Brand bias | Neutral ranking + alternatives |
| ChatGPT | Generic advice | Deterministic numbers + CRM |

## IP protection recommendations

1. Document algorithms in data room (this repo + `AI_DECISION_ENGINE.md`)
2. Trade secret policy for scoring weights
3. Consider TR patent on “confidence-separated decision scoring” (counsel)
4. Partner exclusivity clauses by region/vertical
