# International Expansion Audit (P22)

**Goal:** Global readiness after Turkey — structured audit, priority markets, phased roadmap, and domain strategy.

Config: `data/ops/international-expansion-audit.json`  
Admin: **International Expansion** · CLI: `npm run metrics:international:audit`  
Foundation doc: [GLOBAL_EXPANSION_READINESS.md](./GLOBAL_EXPANSION_READINESS.md)

---

## Executive summary

| Signal | Verdict |
|--------|---------|
| **Platform spine** | Medium (≈58% avg pillar score) — routing, currency display, RTL exist |
| **Content & legal** | TR-first — blocks wave 1 without EN/DE copy + GDPR pack |
| **Payments** | Display multi-currency; Stripe charge currency not fully wired |
| **First wave** | **Germany (de)** → **UK (en+GBP)** → **UAE (ar)** |
| **Domain strategy** | Keep **istebul.com** + `/en` `/de` `/ar` until export MRR justifies ccTLD |

---

## Pillar audit

### i18n (65%)

| | |
|--|--|
| **Current** | `locale-registry`, `i18n.js`, 4 locales, path prefixes |
| **Gaps** | Most UI TR-hardcoded; AI prompts TR-first |
| **Mitigation** | Top-50 strings; `data/i18n/decision/{locale}.json`; prompt locale |
| **Quick win** | `data/i18n/locales.json` (shipped) |

### Currency (80%)

| | |
|--|--|
| **Current** | `formatMoney()`; TRY/USD/EUR/SAR Pro display |
| **Gaps** | Stripe Price IDs still TR-centric |
| **Mitigation** | `getStripeCurrencyForLocale()` in checkout |
| **Quick win** | `pricing-localization.js` (shipped) |

### Localization (55%)

| | |
|--|--|
| **Current** | RTL, dates, localized pricing UI |
| **Gaps** | Marketing/legal TR-only; Auto labels not extracted |
| **Mitigation** | Per-locale landing JSON; L10n EN+DE |
| **Quick win** | Router + `_redirects` (shipped) |

### Compliance (45%)

| | |
|--|--|
| **Current** | KVKK, cookie consent, retention schedule |
| **Gaps** | No GDPR EN; no DPA; vertical regs TR-only |
| **Mitigation** | EN privacy/cookie; counsel per market |
| **Quick win** | Investor data room legal index |

### Payments (60%)

| | |
|--|--|
| **Current** | Stripe webhook, portal, Pro TRY live |
| **Gaps** | USD/EUR/SAR display ≠ charge; no Stripe Tax |
| **Mitigation** | Price IDs per market; Stripe Tax |
| **Quick win** | Localized display on /en /de |

### Legal assumptions (40%)

| | |
|--|--|
| **Current** | TR terms, simulation disclaimers |
| **Gaps** | EN/DE binding ToS; EU consumer rights |
| **Mitigation** | Market-specific ToS review |
| **Quick win** | `loi-template.md` EN |

### Partner portability (70%)

| | |
|--|--|
| **Current** | HMAC dispatch, endpoints, retry, SLA monitor |
| **Gaps** | TRY economics; manual settlement; TR onboarding |
| **Mitigation** | Region tier config; EN partner kit |
| **Quick win** | Webhook docs + dispatch logs |

### Category portability (50%)

| | |
|--|--|
| **Current** | Auto E2E; ev/tatil partial |
| **Gaps** | No category registry; TR market data |
| **Mitigation** | Registry + `decision_leads` |
| **Quick win** | P8 expansion roadmap |

### SEO architecture (58%)

| | |
|--|--|
| **Current** | hreflang map; `data/seo/locales.json` |
| **Gaps** | Thin EN landings; incomplete sitemap alternates |
| **Mitigation** | `landing-pages.{locale}.json`; GSC per locale |
| **Quick win** | SEO alternates config |

### Domain strategy (72%)

| | |
|--|--|
| **Current** | Single domain + path locales; Cloudflare CDN |
| **Gaps** | No ccTLD; x-default = tr |
| **Mitigation** | Path-first; ccTLD redirect later |
| **Quick win** | No subdomain split Phase 1 |

---

## Priority markets (recommended)

| Rank | Country | Locale | Currency | Wave | Why |
|------|---------|--------|----------|------|-----|
| **1** | **Germany** | de | EUR | 1 | Locale + EUR in stack; EU #1 auto; TCO culture fit |
| **2** | **United Kingdom** | en | GBP | 1 | English live; high spend; add RHD catalog |
| **3** | **UAE** | ar | AED | 1 | RTL ready; premium market; GCC hub |
| 4 | Poland | en → pl | PLN | 2 | Near TR; growing EU; add pl later |
| 5 | Netherlands | en | EUR | 2 | English OK; leasing / TCO fit |
| 6 | Saudi Arabia | ar | SAR | 2 | SAR priced; bundle with GCC |
| 7 | United States | en | USD | 3 | Huge TAM; defer — competition + compliance |
| 8 | France | fr | EUR | 3 | Large EU; needs fr locale (not built) |

**Not recommended first:** US, France, Japan — higher effort / lower infra match vs DE+EN+AR.

---

## Global readiness roadmap

### P22.0 (shipped)

- Audit JSON + admin page + snapshot script

### P22.1 — Wave 1 (DE + UK + UAE)

- [ ] Stripe EUR / GBP / AED Price IDs  
- [ ] EN + DE UI strings (top 50 + Planlar)  
- [ ] GDPR EN privacy + cookie policy  
- [ ] DE/EN SEO landing pages  
- [ ] Partner kit English  

### P22.2 — Wave 2 (PL + NL + GCC)

- [ ] `pl` locale + PLN  
- [ ] Category registry MVP  
- [ ] Partner settlement ledger  

### P22.3 — Wave 3 (US + FR)

- [ ] US vehicle catalog  
- [ ] `fr` locale  
- [ ] Optional `istebul.de` → `/de` redirect  

---

## KPIs

| KPI | Target | Owner |
|-----|--------|-------|
| Full locales (en+de) | ≥2 | VP Product |
| Stripe charge currencies | ≥3 | VP Revenue |
| hreflang route coverage | ≥80% | VP Growth |
| Export MRR share | >15% | CEO |

---

## Verify

```bash
npm test
node scripts/p22-international-expansion-audit.cjs
npm run metrics:international:audit
```
