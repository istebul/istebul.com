# Risk Register (Investor Due Diligence)

| ID | Risk | Severity | Mitigation | Status |
|----|------|----------|------------|--------|
| R1 | **Simulated pricing** — not live market feeds | High | Truth layer + provider roadmap; disclose in product | Open |
| R2 | **Financial advice regulation** — decision outputs perceived as advice | Medium | Disclaimers, no binding offers, “simulation” labels | Partial |
| R3 | **KVKK / GDPR** — thin legal pages | Medium | Legal counsel; cookie policy; DPA | Open |
| R4 | **Partner revenue** — estimated vs contracted | High | LOIs, actual_revenue discipline, audits | Open |
| R5 | **AI hallucination** — trust loss | Medium | Rule engine + `sanitizeAiNarrative` | Mitigated |
| R6 | **Single-market concentration** (Turkey) | Medium | Global i18n foundation, EN/DE/AR routes | In progress |
| R7 | **Supabase/CF vendor lock-in** | Medium | `PRODUCTION_RESILIENCE_AUDIT.md`; backup/PITR; runbook | Partial |
| R8 | **Analytics undercount** — consent gate | Medium | Server-side events; optional analytics-free mode doc | Open |
| R9 | **Key person / founder dependency** | High | Document ops runbooks; hire GTM + eng | Founder |
| R10 | **Competition** — incumbents add AI | Medium | Moat on workflow + partners + data | Ongoing |
| R11 | **Churn unknown** — limited subscription history | Medium | Stripe cohort reporting | Open |
| R12 | **Security incident** | Medium | Launch audit, RLS, webhooks; no pen test yet | Partial |
| R13 | **Doc drift** (Netlify vs Cloudflare) | Low | `DATA_ROOM_INDEX` + Cloudflare deploy docs | Mitigated |
| R14 | **Monolith `app.js`** — velocity risk | Medium | `MAINTAINABILITY_AUDIT` roadmap | Open |

## Regulatory subprocessors

See `SUBPROCESSORS.md`. Investors should confirm DPAs with Supabase, Stripe, Groq, Cloudflare.

## Insurance / liability

Terms of use are minimal — **not investor-grade**. Counsel should add limitation of liability and arbitration before scale.
