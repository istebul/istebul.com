# isteBul — Investor One-Pager

## One line

**isteBul is an AI decision platform for high-consideration purchases** — starting with automotive in Turkey, expanding to housing, credit, insurance, and travel.

## Problem

Consumers make ₺500K–₺3M decisions (vehicle, home, finance) with fragmented tools: classifieds show listings, banks show rates, nobody unifies **fit, total cost, finance load, and risk** in one transparent workflow.

## Solution

- **Rule-based decision engine** with explainable scores (not black-box AI prices)
- **LLM narration layer** only for summary — cannot override deterministic numbers
- **Lead → partner dispatch** for monetization (dealers, finance, insurance)
- **isteBul Pro** subscription for advanced analysis and unlimited comparison

## Business model (hybrid SaaS + marketplace)

| Stream | Mechanism | Stage |
|--------|-----------|--------|
| **Pro subscription** | Stripe · ₺299/mo · ₺2,870/yr | Live |
| **Partner leads** | Auto intake → webhook dispatch → CRM | Live |
| **Premium reports** | Pro-gated exports | Partial |
| **Affiliate / finance** | Attribution + partner CPL | Early |

## Traction signals (instrumented)

- First-party analytics: auth, checkout, auto funnel, partner dispatch (`analytics_events`)
- CRM: `auto_leads` with estimated/actual revenue, pipeline stages
- Admin **Investor KPIs** dashboard + JSON export script

*Investors should request latest `investor-metrics-snapshot.json` — not static numbers in this doc.*

## Defensibility

1. **Proprietary scoring** — multi-factor match + confidence model (`decision-consultant.js`)
2. **Truth-layer catalog** — vehicle cost profiles + finance offers (Supabase)
3. **Operational moat** — partner dispatch, circuit breaker, audit logs
4. **Expansion platform** — locale registry, vertical roadmap (8 categories)

## Market & expansion

- **Now:** Turkey automotive decision + lead gen
- **Next:** Konut/tatil production parity, standalone kredi/sigorta
- **Global:** i18n foundation (tr/en/de/ar), hreflang SEO

## Team / ask

*[Founder fills: team, round size, use of funds, milestones]*

## Contact

- Product: https://www.istebul.com  
- Data room: `docs/investor/DATA_ROOM_INDEX.md`
