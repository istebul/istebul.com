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

## Route

Production build output: `/garson/erp/`

## Data

- **P7-B:** Dashboard reads live Supabase data filtered by `restaurant_id`
- Tenant list from `restaurant_users` + `restaurants` (shared Garson auth session)
- Realtime channel on `orders` table (`garson:{restaurant_id}:erp-dashboard`)

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
