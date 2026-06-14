# Subprocessors & Third-Party Services

**Last reviewed:** Engineering audit for investor data room.  
**Action:** Legal should convert to formal subprocessor schedule with DPAs.

| Vendor | Purpose | Data processed | Region |
|--------|---------|----------------|--------|
| **Supabase** | Database, auth, edge functions | User accounts, leads, analytics, subscriptions | EU/US (project config) |
| **Cloudflare** | CDN, Pages, Workers, Turnstile | HTTP logs, static assets | Global |
| **Stripe** | Payments, subscriptions | Payment method, billing email | IE/US |
| **Groq** | LLM API (`ai-proxy`) — **active default** when `AI_PROVIDER` unset/`groq` | Prompt text (no PII by policy) | US |
| **OpenAI** (conditional) | LLM API (`ai-proxy`) — active **only** when `AI_PROVIDER=openai` in target environment | Prompt text (no PII by policy) | US |
| **Plausible** (optional) | Privacy-friendly analytics | Aggregated page stats | EU |
| **Sentry** (optional) | Error monitoring | Stack traces, user id if set | US/EU |
| **LogRocket** (optional) | Session replay | UI interactions if enabled | US |
| **Telegram** (ops) | Lead alerts | Lead summary messages | — |
| **GitHub** | Source, CI | Code only | US |

### AI provider notes

- **Groq** is the active default AI provider for `/ai-proxy` when `AI_PROVIDER` is unset or `groq`.
- **OpenAI** is a **conditional** subprocessor: active only when `AI_PROVIDER=openai` is set in the target Cloudflare Pages environment (Preview or Production).
- `OPENAI_API_KEY` present alone does **not** route traffic to OpenAI; provider selection is explicit.
- Prompt text may be processed by the selected provider; **no automatic fallback** between Groq and OpenAI.
- Canonical ops runbook: [`docs/AI_PROVIDER.md`](../AI_PROVIDER.md)

**Production OpenAI:** OpenAI should **not** be treated as production-active until `AI_PROVIDER=openai` is intentionally enabled and compliance/deployment gates are complete. **Production OpenAI activation remains NO-GO** until checklist, subprocessor/legal review, and Preview smoke are done.

### KVKK / GDPR (AI vendors)

- Groq and OpenAI are **US vendors**; SCC / Transfer Impact Assessment and legal review are required before production OpenAI activation.
- Update `kvkk.html` / `gizlilik.html` and formal subprocessor schedule when OpenAI is enabled in Production.

## Categories of personal data

- Identity: email, name (auth)
- Contact: phone (lead forms)
- Behavioral: `analytics_events`, cookies (consent-gated)
- Financial: Stripe customer id (not full PAN in app DB)

## Data residency note

Primary application database is the Supabase project (`hjfrcdstbyonmgatgwcc` per deploy workflow). Confirm region in Supabase dashboard for KVKK disclosure.

## User rights (KVKK / GDPR)

Processes described at high level in `kvkk.html` and `gizlilik.html` — **require legal upgrade** for full aydınlatma and GDPR Article 13/14 content.
