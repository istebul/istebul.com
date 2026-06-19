# Exit & Investment Optionality Report (P11)

**Company:** isteBul · **Stage:** Seed-ready (traction proof in progress)  
**Machine config:** `data/ops/acquisition-exit-optionality.json`  
**Full playbook:** `docs/ACQUISITION_EXIT_OPTIONALITY.md`

---

## Investment thesis (for IC / partner meeting)

isteBul is **decision infrastructure** for high-consideration purchases in Turkey: deterministic scoring, partner HMAC dispatch, and outcome feedback — not classifieds, not a chat wrapper.

**Why investable:** Live product, partner OS, unit economics framework, P7 data room, weekly metric exports.  
**Why not yet priced for exit:** ARR absolute size, incomplete outcome graph, unsigned LOIs.

---

## Valuation framework

| Layer | Weight | Multiple guidance |
|-------|--------|-----------------|
| Pro ARR | 35% | 8–15× |
| Partner revenue (contracted) | 45% | 5–12× |
| Strategic premium (IP + graph) | 20% | +15–40% |

**Use live:** `npm run metrics:investor:pack` — do not use slide assumptions alone.

---

## Three paths

| Path | Raise / outcome | Pre-money (illustrative TRY) | When |
|------|-----------------|------------------------------|------|
| **Bootstrap** | No round | N/A (intrinsic) | Partner CPL funds ops |
| **Seed** | ₺3–8M | ₺12–32M | After 90d readiness gate |
| **Strategic M&A** | Acquisition | ₺25–90M | ARR ≥₺4M + graph proof |

---

## Metrics to show investors (minimum)

1. MRR (Stripe)  
2. Partner pipeline & `actual_revenue`  
3. Qualified leads MoM  
4. Dispatch success %  
5. LTV:CAC (unit economics export)  
6. Outcome capture %  
7. Active partner endpoints  

---

## Strategic buyer map (top)

| Type | Examples | Rationale |
|------|----------|-----------|
| Classifieds | Sahibinden, Arabam | Own decision layer vs AI on listings |
| Banks | Garanti BBVA, İş Bankası, QNB | Scored origination |
| Insurance | Anadolu, Allianz | Attach at decision |
| Automotive groups | Borusan, Otokoç | Dealer digital advisor |
| Fintech comparison | Hangikredi, brokers | Asset-context vs rate table |

---

## 90-day readiness gate

- [ ] 2 signed partner LOIs  
- [ ] Outcome revenue capture ≥70%  
- [ ] Dispatch ≥85% (8 weeks)  
- [ ] Investor pack <7 days old  
- [ ] Stripe + cap table + IP in data room  
- [ ] Seed vs bootstrap IC memo  

---

## Data room exports

```bash
npm run metrics:investor:pack
npm run metrics:exit:optionality
```

Artifacts: `dist/investor-readiness-pack.json`, `dist/acquisition-exit-snapshot.json`

---

## Revenue model upgrades (valuation uplift)

1. Contracted CPL tiers in CRM  
2. Outcome-based bonus fees  
3. Regional exclusivity premium  
4. Pro vertical bundles  
5. Enterprise decision API (bank pilot)

---

## Diligence index

See `docs/investor/DATA_ROOM_INDEX.md` — section **06 — Exit & optionality** (add on commit).
