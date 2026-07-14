# P7-J Customer Experience Platform

Public customer journey for GarsonAI Restaurant Operating System.

**ERP is back-office only.** This app owns the guest path:

Rezervasyon → Masa → Dijital Menü → Ön Sipariş → Guarantee → Confirmation

## Route

`/r/{restaurantSlug}`

Example: `/r/demo-cafe`

`/r/onay` remains the legacy confirmation shell (P6), not part of this React app.

## Stack

- React + TypeScript + Vite
- Tailwind + shadcn-style UI
- Framer Motion
- Supabase (anon) with `restaurant_id` isolation

## Development

```bash
npm run dev:cx
```

## Build

```bash
npm run build:cx
npm run build
```

Output: `dist/r/` (SPA) while preserving `dist/r/onay/`.
