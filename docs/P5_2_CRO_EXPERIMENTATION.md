# P5.2 — CRO experimentation framework

Continuous conversion optimization via deterministic A/B tests across six surfaces.

## Zones

| Zone | Surfaces | Primary metric |
|------|----------|----------------|
| **hero** | `/`, `/auto/` | `hero_cta_click` |
| **cta** | Home, metodoloji, planlar | `cta_click` |
| **wizard** | Auto wizard | `wizard_step_advance` |
| **pricing** | Home pricing, `/planlar` | `checkout_start` |
| **trust** | Trust section + rail | `trust_block_view` |
| **checkout** | Paywall, upgrade buttons | `checkout_start` |

## Architecture

```
data/growth/experiments.json     — active tests + variants
data/growth/cro-framework.json   — zone definitions + metric aliases
js/features/growth/cro-experiment-framework.js  — assignment + apply layers
js/features/growth/growth-experiments.js        — exposure + conversion tracking
js/runtime/growth-ops.js          — click / IO hooks + dynamic refresh
```

## Variant layers

Per variant you can set:

- `copy` — selector → label text (`.growth-exp-label` span)
- `classes` — selector → CSS hook classes
- `attributes` — selector → data attributes for analytics
- `trust` — trust headlines / rail copy

Assignment is sticky per `experiment_id` in `localStorage` (`istebul_growth_experiment_variants`).

## Analytics events

| Event | When |
|-------|------|
| `growth_experiment_exposure` | Variant applied (consent required) |
| `growth_experiment_conversion` | Primary metric fires for that experiment |

Conversion is **scoped**: only experiments whose `primaryMetric` / `metrics` match the fired event are attributed.

## Operations

1. Edit `data/growth/experiments.json` (weights must sum to 100 per experiment).
2. Deploy static assets + ensure selectors exist (`data-cro-*`, `data-hero-cta-primary`, etc.).
3. Monitor **Platform Analytics → Growth Command Center** in admin.
4. Export: `npm run metrics:growth:command`

## Adding a test

```json
{
  "id": "my_test_q3",
  "zone": "pricing",
  "status": "active",
  "surfaces": ["/planlar"],
  "primaryMetric": "checkout_start",
  "variants": [
    { "id": "control", "weight": 50, "copy": { "[data-pricing-cta-pro]": "Control" } },
    { "id": "b", "weight": 50, "copy": { "[data-pricing-cta-pro]": "Variant B" } }
  ]
}
```

Set `status` to `paused` to stop assignment without removing history.

## CI

`node scripts/p5-2-cro-experimentation-audit.cjs` (in `npm test`).
