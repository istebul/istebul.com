# Subprocessors & Third-Party Services

**Last reviewed:** Engineering audit for investor data room.  
**Action:** Legal should convert to formal subprocessor schedule with DPAs.

| Vendor | Purpose | Data processed | Region |
|--------|---------|----------------|--------|
| **Supabase** | Database, auth, edge functions | User accounts, leads, analytics, subscriptions | EU/US (project config) |
| **Cloudflare** | CDN, Pages, Workers, Turnstile | HTTP logs, static assets | Global |
| **Stripe** | Payments, subscriptions | Payment method, billing email | IE/US |
| **Groq** | LLM API (`ai-proxy`) | Prompt text (no PII by policy) | US |
| **Plausible** (optional) | Privacy-friendly analytics | Aggregated page stats | EU |
| **Sentry** (optional) | Error monitoring | Stack traces, user id if set | US/EU |
| **LogRocket** (optional) | Session replay | UI interactions if enabled | US |
| **Telegram** (ops) | Lead alerts | Lead summary messages | — |
| **GitHub** | Source, CI | Code only | US |

## Categories of personal data

- Identity: email, name (auth)
- Contact: phone (lead forms)
- Behavioral: `analytics_events`, cookies (consent-gated)
- Financial: Stripe customer id (not full PAN in app DB)

## Data residency note

Primary application database is the Supabase project (`hjfrcdstbyonmgatgwcc` per deploy workflow). Confirm region in Supabase dashboard for KVKK disclosure.

## User rights (KVKK / GDPR)

Processes described at high level in `kvkk.html` and `gizlilik.html` — **require legal upgrade** for full aydınlatma and GDPR Article 13/14 content.
