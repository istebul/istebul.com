# Category Dominance Strategy (P23)

**Question:** How does isteBul become the category leader?

**Answer:** Own the **Decision Platform** layer above listings, OTAs, and rate tables — win on deterministic outcomes + partner closure, not inventory.

Config: `data/ops/category-dominance-strategy.json`  
Admin: **Category Dominance** · CLI: `npm run metrics:category:dominance`  
Deep dives: [COMPETITIVE_MOAT_STRATEGY.md](./COMPETITIVE_MOAT_STRATEGY.md) · [MOAT_ARTICULATION.md](./investor/MOAT_ARTICULATION.md)

---

## Executive summary

| Signal | Verdict |
|--------|---------|
| **Category** | Decision Platform — *karar önce, liste sonra* |
| **Ownership today** | ~42% — emerging auto leader in TR, not national category owner |
| **Strongest moat** | Partner OS (dispatch, SLA, scoring) |
| **Weakest moat** | Brand + data (outcome graph immature) |
| **#1 threat** | Sahibinden / Arabam add AI on top of listings |

---

## Competitor landscape

### Sahibinden (classifieds incumbent)

| | |
|--|--|
| **Wedge** | Inventory, MAU, dealer network |
| **Counter** | TCO + fit score + finance — search there, **decide here** |
| **Win** | Qualified lead completion > listing CTR |

### Arabam (auto vertical classifieds)

| | |
|--|--|
| **Wedge** | Auto listings + dealer CRM |
| **Counter** | Total ownership cost + partner dispatch |
| **Win** | Wizard completed before browsing 20 ads |

### Marketplaces (Hepsiemlak, Booking, …)

| | |
|--|--|
| **Wedge** | Supply + checkout |
| **Counter** | Budget + finance + risk **before** transaction |
| **Win** | Own consideration; deep-link, no inventory build |

### Fintech comparison

| | |
|--|--|
| **Wedge** | Sponsored lowest APR |
| **Counter** | Asset-context payment load in Auto funnel |
| **Win** | Lead = vehicle + score + routed partner |

### Generic AI tools

| | |
|--|--|
| **Wedge** | Free conversational answers |
| **Counter** | Numbers from engine; LLM narrates only; CRM closure |
| **Win** | Repeat sessions + Pro history + outcomes |

### Niche decision tools

| | |
|--|--|
| **Wedge** | Deep single calculator (often US/EU) |
| **Counter** | TR unified consultant + 8-vertical registry |
| **Win** | Cross-vertical habit on one account |

---

## Six moat plans (positioning moat · acquisition · data · partner · brand · product)

### Positioning moat (55%)

Own the name **Decision Platform** in PR, SEO, and sales. Stop sounding like a marketplace.

- Category comparison landings vs Sahibinden / Arabam  
- Message matrix: classifieds = list, banks = product, isteBul = decision  

### Acquisition moat (48%)

Consideration SEO (TCO, hangi araç, finance load) + wizard-first landings + partner co-traffic.

- Gate paid on CAC payback ≤6mo  
- Dealer sends users to **decision**, not more listings  

### Data moat (38%)

Outcome graph: `lead → dispatch → actual_revenue → scoring`. Live feeds when honest.

- Do not fake “live” — simulation transparency is trust  
- Benchmark content: “models that closed in 14d”  

### Partner moat (62%) — **strongest today**

Exclusivity, outcome-weighted score, EN partner kit, dispatch transparency.

- Target: ≥10 endpoints, ≥90% dispatch success  

### Brand moat (35%)

“Sayılar motor, AI anlatır” + E-E-A-T + Pro PDF proof.

- NPS on decision flow; press owns category term  

### Product moat (58%)

decision-consultant, confidence tiers, comparison-store, category registry.

- Ship registry + decision_leads before net-new verticals  

---

## How isteBul becomes category leader

```text
[Trust + Decision IP]     ← defend today (product moat)
        ↓
[Partner OS + outcomes]   ← 6–12 months (partner moat)
        ↓
[Data + acquisition loop] ← 12–18 months
        ↓
[Brand owns "karar için isteBul"] ← composite category ownership
```

**Ownership signal:** Users open isteBul **before** Sahibinden or a bank when making a high-consideration purchase.

---

## Roadmap phases

| Phase | Focus |
|-------|--------|
| **P23.0** ✅ | Audit, admin, snapshot, competitor + moat map |
| **P23.1** | Auto TR beachhead — outcome CRM, comparison SEO, 2 exclusivity pilots |
| **P23.2** | Multi-vertical (ev + finance) + live feed v1 + brand campaign |
| **P23.3** | Series A narrative — public benchmarks, 10+ partners, intl wave 1 |

---

## KPIs

| KPI | Target | Owner |
|-----|--------|-------|
| category_ownership_score | ≥60 by P23.2 | CEO |
| decision_sessions_mau_ratio | ≥1.2 | VP Product |
| partner_dispatch_success | ≥90% | COO |
| outcome_revenue_capture_pct | ≥70% | VP Revenue |
| competitor_comparison_organic_share | top5 × 3 keywords | VP Growth |

---

## Commands

```bash
npm run metrics:category:dominance
node scripts/p23-category-dominance-audit.cjs
```
