# P8 Category Expansion — Executive Summary

**Scope:** ev · tatil · finans · sigorta · education  
**Status:** Strategy locked; implementation starts at **Faz 0 (platform foundation)**.

---

## One-liner

Turn the homepage **Karar Asistanı** (already strong on ev + tatil) into a **five-vertical revenue graph** by generalizing Auto’s lead → CRM → partner pattern—then launch education as the sixth monetizable wedge.

---

## Readiness snapshot

| Vertical | Product today | Revenue today | Next milestone |
|----------|---------------|---------------|----------------|
| **Ev** | Full wizard, cost engine | Simulation only | `/konut/` + `decision_leads` |
| **Tatil** | Full wizard, 42 destinations | Simulation only | `/tatil/` + OTA intake |
| **Finans** | Embedded loan compare | Auto finance leads | `/finans/` standalone |
| **Sigorta** | Cost lines + CRM stage | Partner stub | Branş wizard + products DB |
| **Education** | None | None | Pilot catalog + wizard |

---

## Sequencing (do not skip)

1. **Faz 0** — `category-registry`, `decision_leads`, CRM vertical filter *(blocks everything)*  
2. **Faz 1** — Ev + Tatil production parity *(highest ROI, code-ready)*  
3. **Faz 2** — Finans + Sigorta + cross-sell *(highest B2B CPL)*  
4. **Faz 3** — Education *(needs data partners)*  
5. **Faz 4** — Pro all-vertical bundle  

Full detail: [`EXPANSION_STRATEGY_ROADMAP.md`](./EXPANSION_STRATEGY_ROADMAP.md) · JSON: [`data/platform/expansion-roadmap.json`](../data/platform/expansion-roadmap.json).

---

## Investor link

Aligns with `data/investor/growth-story.json` **phase_2** (“Konut / tatil production parity”, “Standalone kredi & sigorta”). Education extends TAM narrative without changing Auto-first GTM in phase_0–1.

---

## Audit

```bash
node scripts/p8-category-expansion-audit.cjs
```

Included in `npm test`.
