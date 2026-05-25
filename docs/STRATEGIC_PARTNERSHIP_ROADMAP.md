# Strategic Partnership Roadmap (P26)

**Goal:** Distribution + monetization acceleration through seven partner lanes — without becoming a marketplace or bank.

Config: `data/ops/strategic-partnership-roadmap.json`  
Admin: **Partnerships** · CLI: `npm run metrics:partnerships:roadmap`  
Ops: `data/partner/partner-ops.json` · Sales: `data/sales/partner-sales-deck.json`

---

## North star

| Axis | Target |
|------|--------|
| **Distribution** | Partner-referred sessions ≥15% of decision traffic |
| **Monetization** | Partner-attributed revenue ≥40% of B2B pipeline |
| **Ops** | Dispatch success ≥90%; ≥10 active endpoints |

---

## Wave sequence (acceleration)

| Wave | Partner types | Why |
|------|---------------|-----|
| **1** | **Bayiler** + **Finans şirketleri** | Live dispatch; highest CPL velocity |
| **2** | **bankalar** + **Sigorta** | Enterprise $ + attach after decisions |
| **3** | **API providers** + **Marketplace'ler** | Data moat + distribution without inventory |
| **4** | **Affiliate networks** | Volume only after outcome graph disciplined |

---

## Seven partner types

### 1. Bayiler (rank 1 — first motion)

| | |
|--|--|
| **Maturity** | Live |
| **Score** | 82% |
| **Distribution** | Embed, showroom QR, co-branded TCO PDF |
| **Monetization** | CPL hot lead, HMAC webhook, exclusivity pilot |
| **Integration** | `partner_endpoints` + `auto-intake` · 2–4 weeks |

### 2. Finans şirketleri (rank 2)

| | |
|--|--|
| **Score** | 78% |
| **Monetization** | Highest B2B CPL; asset-context leads |
| **Distribution** | Finance step in ev/arac results |
| **Blocker** | BDDK pack + daily rate sync |

### 3. Bankalar (wave 2)

| | |
|--|--|
| **Score** | 68% |
| **Monetization** | CPL + referral fee; long cycle |
| **Play** | Neutral multi-offer; mortgage from ev |
| **Timeline** | 3–6 months procurement |

### 4. Sigorta (wave 2)

| | |
|--|--|
| **Score** | 63% |
| **Play** | Attach kasko/DASK/seyahat post-decision |
| **Blocker** | Prim truth + branş wizard |

### 5. Marketplace'ler (wave 3 — distribution lever)

| | |
|--|--|
| **Score** | 70% distribution-heavy |
| **Play** | "Search there, decide here" — embed CTA |
| **Do not** | Build listings |

### 6. API providers (wave 3 — data lever)

| | |
|--|--|
| **Score** | 64% |
| **Play** | Exclusive TR catalog → `liveProvidersEnabled` |
| **Effect** | CPL pricing power + trust |

### 7. affiliate networks (wave 4 — gated)

| | |
|--|--|
| **Score** | 58% |
| **Gate** | `min_lead_score` + outcome postback |
| **Risk** | Junk traffic / brand dilution |

---

## BD motions

- **5 hot leads free** → paid CPL in 30d  
- **Webhook week** → live endpoint &lt;15m p95  
- **6mo exclusivity** → outcome SLA  
- **Embed POC** → distribution MOU  

---

## Scoring dimensions (weights)

Distribution lift **25%** · Monetization lift **25%** · Integration speed **20%** · Strategic fit **15%** · Data acceleration **15%**

---

## Commands

```bash
npm run metrics:partnerships:roadmap
node scripts/p26-strategic-partnership-audit.cjs
```
