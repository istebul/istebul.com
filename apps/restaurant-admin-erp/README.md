# P7 Restaurant Admin ERP Dashboard

Additive React admin shell for GarsonAI. **Does not modify** the existing P6 production panel (`/garson/panel/`), webhooks, AI, Kitchen, or WhatsApp flows.

## Stack

- React 19 + TypeScript
- Vite 6
- Tailwind CSS 3 + shadcn-style UI primitives
- Supabase JS (live data, RLS + realtime)
- Lucide React
- Framer Motion
- Recharts

## Routes

| Path | Module |
|------|--------|
| `/garson/erp/` | Dashboard (P7-B) |
| `/garson/erp/orders` | Orders (P7-C) |
| `/garson/erp/reservations` | Reservations (P7-F) |
| `/garson/erp/tables` | Table Planner (P7-G) |
| `/garson/erp/menu` | Menu listing (P7-D) |
| `/garson/erp/inventory` | Inventory listing (P7-E) |

## Data

- **P7-B:** Dashboard reads live Supabase data filtered by `restaurant_id`
- **P7-C:** Orders list/detail/status with realtime
- **P7-F:** Reservations KPI/list/drawer + guarantee/preorder/table-planning prep (no payment capture)
- **P7-G:** Interactive floor plan (salons, table cards, status model, realtime)
- **P7-D:** Menu categories + items listing (read-only; CRUD later)
- **P7-E:** Inventory categories + items listing (read-only; no stock decrement)
- Tenant list from `restaurant_users` + `restaurants` (shared Garson auth session)
- Realtime channels: `erp-dashboard`, `erp-orders`, `erp-reservations`, `erp-tables`, `erp-menu`, `erp-inventory`

## Development

```bash
npm run dev:erp
```

Requires `/env.js` (or `VITE_SUPABASE_*`) and an authenticated GarsonAI session (`istebul-auth-garson-v1`).

## Build

```bash
npm run build:erp
npm run build
```
