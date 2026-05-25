# P15 — AI operational decision assistant

**Goal:** AI-assisted company operations — deterministic recommendations first, optional bounded LLM summary.

## Capabilities

| Capability | Domain | Source |
|------------|--------|--------|
| Growth recommendations | `growth` | Channels, experiments, paid capture |
| Funnel anomaly detection | `funnel` | 24h step drops + CEO conversion crash |
| Churn analysis | `churn` | cancel_at_period_end, churn events |
| Partner quality analysis | `partner` | Dispatch SLA, retry queue, win rate |
| Pricing insights | `pricing` | Pro/annual TRY, MRR, checkout abandon |
| Conversion insights | `conversion` | Wizard, checkout, paid funnel |

## Admin

**Path:** `/admin-panel.html` → **AI Ops Assistant** (`ops-ai-assistant`)

1. Loads shared internal dashboard context (same cache as P14).
2. Renders deterministic insight cards with actionable recommendations.
3. **AI özet üret** — calls `/ai-proxy` with sanitized metrics JSON only (no PII; no invented numbers in prompt rules).

## Architecture

```
internal-dashboard-context.js
        ↓
ops-decision-assistant.js   → buildOpsDecisionBrief()
ops-ai-assistant-views.js   → HTML
ops-ai-narration.js         → /ai-proxy (optional)
```

## Guardrails

- Numbers in AI prompt come only from `buildSanitizedOpsBriefForAi()`.
- Separate session budget: 8 calls/hour (`istebul_ops_ai_narration_budget`).
- Prompt max 2800 chars; Groq proxy rate limit unchanged (25/min/IP).

## Manifest

`data/ops/ops-decision-assistant.json`

## Related

- CEO alerts: `docs/CEO_ALERTING.md`
- Internal dashboards: `docs/INTERNAL_DASHBOARDS.md`
- AI product engine: `docs/AI_DECISION_ENGINE.md`
