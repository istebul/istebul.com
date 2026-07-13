# P7-A Restaurant Admin ERP Dashboard

Additive React admin shell for GarsonAI. **Does not modify** the existing P6 production panel (`/garson/panel/`), webhooks, AI, Kitchen, or WhatsApp flows.

## Stack

- React 19 + TypeScript
- Vite 6
- Tailwind CSS 3 + shadcn-style UI primitives
- Lucide React
- Framer Motion
- Recharts (placeholder charts with mock data)

## Route

Production build output: `/garson/erp/`

## Development

```bash
npm run dev:erp
```

Vite dev server runs on port 5173 with base `/garson/erp/`.

## Build

Included in the root production pipeline:

```bash
npm run build:erp
# or full repo build
npm run build
```

## Multi-tenant context

`TenantProvider` exposes `restaurant_id` and mock tenant switching. Real Supabase/API wiring is intentionally deferred.
