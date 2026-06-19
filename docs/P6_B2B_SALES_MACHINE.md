# P6 — B2B sales machine (partner revenue)

Productized outbound, CRM touches, partner AE pipeline, objection playbook, pricing talk tracks, and onboarding velocity — aligned with self-serve partner funnel.

## Pillars

| Pillar | Module / data | Output |
|--------|----------------|--------|
| **Outbound assets** | `data/sales/outbound-sequences.json`, `partner-sales-assets.js` | Email / LinkedIn templates with UTM deep links |
| **CRM process** | `partner-sales-crm.js`, admin Partner Başvuruları | `partner_sales_touch`, `growth_crm_touch` events |
| **Partner funnel** | Existing `partner-funnel.js` + AE pipeline in `sales-machine.json` | Status: new → contacted → qualified → integrating → live |
| **Objection handling** | `data/sales/objections.json`, `partner-objections.js` | Playbook on admin + `/partner-planlar.html` |
| **Pricing strategy** | `partner-pricing-strategy.js` + `partner-offers.js` tiers | Tier recommendation, talk tracks, ROI band |
| **Onboarding velocity** | `partner-onboarding-velocity.js` | SLA badges (on track / stuck / overdue) in admin |

## Architecture

```
data/sales/sales-machine.json
data/sales/objections.json
data/sales/outbound-sequences.json
js/features/sales/partner-sales-machine.js   — admin enablement panel
js/features/sales/partner-sales-crm.js       — scoring + touch logging
js/features/sales/partner-sales-assets.js    — outbound templates
js/features/sales/partner-objections.js
js/features/sales/partner-pricing-strategy.js
js/features/sales/partner-onboarding-velocity.js
js/admin-panel.js                            — AE table + enablement
js/corporate/partner-planlar.js              — public objection playbook
```

## Lifecycle

| Flow | Trigger |
|------|---------|
| `partner_sales_cadence` | AE enroll after qualified application (optional via `enrollPartnerSalesCadence`) |

## Analytics

| Event | When |
|-------|------|
| `partner_sales_touch` | Admin logs touch type on application or lead |
| `partner_outbound_sent` | Outbound sequence copy / send logged |
| `partner_objection_view` | Playbook opened (planlar or admin) |
| `growth_crm_touch` | Mirror for growth command center |

## Operations

1. Tune pipeline SLA in `data/sales/sales-machine.json`.
2. Edit objections / outbound JSON; deploy static `data/sales/*`.
3. Admin → **Partner Başvuruları** → enablement panel + skor/hız sütunları.
4. Audit: `node scripts/p6-b2b-sales-machine-audit.cjs`
