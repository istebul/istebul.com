# Competitor Attack Scenario (P24)

**Scenario:** Large players try to copy isteBul — listing AI, bank comparison, generic auto GPTs, VC-backed clones.

**Strategy:** defensible company strategy — defend **outcomes + partner OS + deterministic decision IP**, not feature parity.

Config: `data/ops/competitor-attack-scenario.json`  
Admin: **Competitor Defense** · CLI: `npm run metrics:competitor:attack`  
Related: [CATEGORY_DOMINANCE_STRATEGY.md](./CATEGORY_DOMINANCE_STRATEGY.md) · [COMPETITIVE_MOAT_STRATEGY.md](./COMPETITIVE_MOAT_STRATEGY.md)

---

## Executive summary

| Signal | Verdict |
|--------|---------|
| **Defense readiness** | ~52% — partner strong; data & brand weak |
| **Response window** | 90 days to compound outcome graph + exclusivity |
| **Hardest to copy** | Partner dispatch + CRM outcomes + calibrated scoring |
| **Fastest copy risk** | Generic AI UI (immediate, shallow) |
| **Investor line** | Copycats ship chat; we ship closed-loop economics |

---

## Attack scenarios

### Sahibinden launches listing AI (high likelihood)

| | |
|--|--|
| **Their play** | GPT on listings — "hangi araç", price hints, keep MAU in inventory |
| **Copy depth** | Shallow — no TCO, neutral finance, dispatch |
| **Counter** | *Listeleyici AI ≠ karar motoru* — search there, decide here |
| **Defense** | Product + growth — comparison landing within 14d |

### Bank adds credit comparison (medium–high)

| | |
|--|--|
| **Their play** | In-app APR tables; push own origination |
| **Copy depth** | Medium — single-product bias |
| **Counter** | Total ownership + neutral multi-offer in vehicle context |
| **Defense** | Partner + data — lead router to banks, not bank competitor |

### generic AI enters automotive vertical (high, immediate)

| | |
|--|--|
| **Their play** | ChatGPT/Gemini plugins, free car advisor GPTs |
| **Copy depth** | Shallow — no numbers engine or CRM closure |
| **Counter** | *Sayılar motor, AI anlatır* — Pro history + partner outcomes |
| **Defense** | Brand + product — methodology audits vs ChatGPT |

### VC-backed rival (medium, 9–18 months)

| | |
|--|--|
| **Their play** | Clone wizard; burn on paid + dealer BD; undercut CPL |
| **Copy depth** | Deep attempt — still lacks ops maturity |
| **Counter** | Outcome data + exclusivity — they ship v1, we ship closed loop |
| **Defense** | Partner + distribution — no CAC arms race |

Also tracked: **Arabam AI bundle**, **marketplace super-app** tab.

---

## defense plan (six pillars: product · data · growth · brand · partner · distribution)

### Product defense (58%)

- LLM cannot override score/price — tested guardrails  
- Category registry before new verticals  
- Do **not** build listings when Sahibinden copies  

### Data defense (38%)

- Outcome graph: `lead → dispatch → actual_revenue`  
- Exclusive feeds; honest simulation labels  
- Benchmark SEO when N>100 closed deals  

### Growth defense (48%)

- Own TCO / consideration SEO  
- Competitor comparison pages (Sahibinden, Arabam, ChatGPT)  
- CAC payback ≤6mo — do not match clone burn  

### Brand defense (35%)

- Own **Decision Platform** in PR  
- Influencer: same prompt, isteBul vs ChatGPT numbers  
- E-E-A-T methodology reviews  

### partner defense (62%) — strongest pillar

- 6–12mo exclusivity; outcome-weighted score  
- Dispatch ≥90%; win-rate dashboards  
- EN partner kit vs clone BD  

### Distribution defense (45%)

- Dealer embed/widget — decision CTA, not more listings  
- Partner API switching cost  
- Decline shallow super-app integrations  

---

## War-game matrix

| Attack | Primary | Secondary | Do not |
|--------|---------|-----------|--------|
| Sahibinden AI | product | growth | Build inventory |
| Bank compare | partner | data | Become a bank |
| Generic AI | brand | product | Generic chat race |
| VC-backed | partner | distribution | Paid CAC war |
| Arabam bundle | growth | product | Dealer-biased scores |

---

## Response playbook

1. **Detect (0–2w)** — SEO/PR signals; CEO alert on funnel CR −20% or dispatch <85%  
2. **Respond (2–8w)** — Run `ifAttacked` plays; one public methodology artifact; freeze new verticals  
3. **Compound (3–12mo)** — Outcome benchmarks; exclusivity scale; Series A defensible narrative  

---

## Commands

```bash
npm run metrics:competitor:attack
node scripts/p24-competitor-attack-audit.cjs
```
