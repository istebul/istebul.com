# AI decision commentary upgrade

## Where AI is used

| Surface | Role |
|---------|------|
| `/auto` results | Structured JSON commentary via `/ai-proxy` (Groq) + rule fallback |
| Homepage / SPA | Optional narration (existing `getAiExplanation` pattern in app.js) |
| Admin ops | Groq summary (separate flow) |

Scores, TCO, ranking: **rule engines only** (`auto-ai.js`, `cost-engine.js`, `decision-consultant.js`).

## Architecture

- `js/auto/ai-decision-commentary.js` — schema, prompt, parse, deterministic fallback, UI
- `js/features/moat/ai-explanation-experience.js` — synthesis card + mount slot
- `functions/ai-proxy.js` — `format: structured_commentary` → JSON mode
- Lead optional fields: `ai_summary`, `ai_confidence` (migration `20260527_auto_lead_ai_summary.sql`)

## Safety

- 10s client timeout (`AbortController`)
- No API keys in client bundle
- PII not sent in AI prompt (aggregated profile + scores only)
- Sanitize narrative strips guarantees, prices, rates

## Analytics events

`ai_commentary_requested`, `ai_commentary_success`, `ai_commentary_failed`, `ai_commentary_fallback_shown`, `ai_commentary_expanded`, `ai_next_action_clicked`
