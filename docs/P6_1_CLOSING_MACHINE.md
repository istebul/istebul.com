# P6.1 — Partner closing machine

AE-facing collateral to move partner applications from discover → close → live.

## Asset pack

| Asset | File | Surface |
|-------|------|---------|
| **Sales deck** | `data/sales/partner-sales-deck.json` | 7 slides + speaker notes |
| **Pricing sheet** | `data/sales/pricing-sheet.json` | Tier bands + comparison + talk track |
| **Objection handling** | `data/sales/objections.json` | Playbook (incl. closing category) |
| **Onboarding docs** | `data/sales/onboarding-docs.json` | Kickoff, integration, commercial, ops |
| **Email templates** | `data/sales/email-templates.json` | discover → live stages |
| **Follow-up flows** | `data/sales/follow-up-flows.json` | Status-triggered cadences |

Registry: `data/sales/closing-machine.json`

## UI

- **Full kit:** `/partner-closing-kit.html` (`noindex`) — copy buttons per slide/email/doc
- **Admin:** Partner Başvuruları → enablement panel → “Tam closing kiti aç”

## Code

```
js/features/sales/partner-closing-machine.js
js/corporate/partner-closing-kit.js
```

## Follow-up ↔ lifecycle

| Flow | Lifecycle |
|------|-----------|
| `ae_new_application` | `partner_sales_cadence` |
| `ae_qualified_close` | proposal emails + outbound D7 |
| `ae_integrating_velocity` | `stalled_onboarding` sequence |

## Analytics

- `partner_closing_kit_view` — kit page open (consent)

## Audit

`node scripts/p6-1-closing-machine-audit.cjs`
