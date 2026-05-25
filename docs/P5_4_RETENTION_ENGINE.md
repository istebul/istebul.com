# P5.4 — Retention engine (LTV)

Client-side retention layer: reactivation, habit loops, saved decisions, revisit prompts, and lifecycle enrollment tuned for LTV.

## Pillars

| Pillar | Module | Behavior |
|--------|--------|----------|
| **Reactivation** | `retention-reactivation.js` | UTM / email winback (`utm_medium=reactivation`, `reactivation_ltv`, etc.) |
| **Habit loops** | `retention-habits.js` | Weekly visits, streak milestones, weighted engagement score |
| **Saved decisions** | `retention-saved-decisions.js` | Local snapshots after auto results; revisit analytics |
| **Revisit triggers** | `retention-revisit.js` | Inactivity tiers (3d / 7d / 14d) + banner + lifecycle enroll |
| **Lifecycle optimization** | `retention-lifecycle-optimizer.js` | Flow picker by context (saved decisions, churn, streak) |

## Architecture

```
data/growth/retention-framework.json
js/features/growth/retention-ltv.js          — orchestrator (initRetentionLtvEngine)
js/features/growth/retention-engine.js      — return visits + base engagement
js/runtime/growth-ops.js                    — bootstrap on enterprise UX
js/runtime/growth-bootstrap.js              — early UTM reactivation capture
css/growth-retention.css                    — revisit banner
```

## Lifecycle flows (public enroll)

| Flow ID | Use case |
|---------|----------|
| `reactivation_ltv` | 14d+ inactive, email winback |
| `habit_loop_reminder` | Soft inactivity, engagement nudges |
| `saved_decision_revisit` | User has saved auto decisions |

Server definitions: `supabase/functions/_shared/lifecycle-flows.ts`.

## Analytics events

| Event | When |
|-------|------|
| `retention_return_visit` | Gap ≥ 1 day since last visit |
| `retention_decision_saved` | Auto results snapshot stored |
| `retention_decision_revisited` | User opens saved decision |
| `retention_reactivation_land` | Reactivation UTM landing |
| `retention_revisit_prompt` | Inactivity banner shown |
| `retention_revisit_triggered` | Lifecycle enroll from trigger |
| `retention_habit_*` | Weekly visit, actions, milestones |

## Operations

1. Tune thresholds in `data/growth/retention-framework.json`.
2. Deploy static assets + edge functions (`lifecycle-enroll`).
3. Monitor retention funnel in admin Growth / Executive KPIs.
4. Audit: `node scripts/p5-4-retention-engine-audit.cjs`
