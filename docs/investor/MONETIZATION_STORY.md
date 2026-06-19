# Monetization Story

**Headline:** Hybrid SaaS + marketplace — we monetize trust in the **decision moment**, not page views.

**Config:** `data/investor/monetization-story.json` · **Unit economics:** `UNIT_ECONOMICS.md`

---

## Revenue engines

| Stream | Type | Status | Investor line |
|--------|------|--------|---------------|
| **isteBul Pro** | Recurring | Live | Predictable ARR; ₺299/mo · ₺2,870/yr · 7-day trial |
| **Partner leads (CPL)** | Transactional | Live | Scales with partner density; CRM tracks actuals |
| **Premium reports** | Add-on | Partial | ARPU uplift when merchandised on results |
| **Finance / insurance affiliate** | Affiliate | Early | Neutral comparison → bank/insurer CPL |
| **B2B API** | Platform | Roadmap | Dealer groups license decision engine (phase 3) |

---

## How money moves (live today)

### Pro

```
Visitor → checkout → Stripe → subscriptions → investor-kpis MRR
```

### Partner

```
Wizard → auto-intake → dispatch → webhook → CRM actual_revenue
```

**Blended signal:** `Blended ARR ≈ Pro ARR + Σ partner actual_revenue`

---

## Pricing bands (partner — validate with contracts)

| Tier | CPL band (TRY) |
|------|----------------|
| Starter | ₺5,000–8,000 |
| Growth | ₺8,000–12,000 |
| Enterprise | Custom capacity |

---

## Revenue quality at scale (targets)

| Mix | Target % |
|-----|------------|
| Recurring (Pro) | 40% |
| Partner | 55% |
| Other | 5% |

Early stage may be **partner-heavy** — disclose mix from live exports.

---

## Diligence proof

1. `npm run metrics:investor`  
2. Admin → **Investor KPIs**  
3. Offline: partner LOI / CPL term sheets  
4. Stripe dashboard MRR vs computed MRR reconciliation
