# P8-B — Restaurant Knowledge Graph

Shared restaurant knowledge layer for **AI Concierge**, **CRM AI**, **Kitchen AI**, and **WhatsApp AI**.

**No LLM calls.** This package only standardizes restaurant facts into entities, snapshots, and resolver candidates.

Additive: does **not** modify P6 production (`/garson/panel/`), P7 ERP/CX apps, or create Supabase tables.

## Architecture

```
Existing Garson tables (read-only adapters)
        ↓
KnowledgeSource (InMemory today / Supabase later)
        ↓
KnowledgeBuilder → KnowledgeSnapshot (nested object)
        ↓
KnowledgeService (cache + query facade)
        ↓
KnowledgeResolver (query → candidates → prompt block)
        ↓
AIOrchestrator → PromptBuilder → Provider
```

## Restaurant Snapshot

Single object AI modules consume:

```
Restaurant Snapshot
 ├─ diningRooms[] → tables[]
 ├─ menu (categories → items)
 ├─ campaigns
 ├─ businessHours / holidays
 ├─ paymentPolicies
 ├─ loyaltyRules / customers (CRM slice)
 ├─ staff / reservations / inventory
 └─ occupancy (bugünkü yoğunluk)
```

## Knowledge Resolver

Example: `"4 kişilik sessiz masa"`

1. Load / reuse Restaurant Snapshot  
2. Parse constraints (party size, quiet, outdoor, …) — heuristic, no LLM  
3. Score table / menu / campaign candidates  
4. Emit `promptBlock` for AI Core system prompt  

## AI Core integration

```ts
import { createAICore } from '../ai-core/index.ts';
import { createRestaurantKnowledge } from '../restaurant-knowledge/index.ts';

const { resolver } = createRestaurantKnowledge();
const ai = createAICore({ provider: 'mock' }, { knowledgeResolver: resolver });

await ai.orchestrate({
  moduleId: 'reservation',
  restaurantId: 'demo-lokanta',
  userMessage: '4 kişilik sessiz masa',
});
```

Default `createAICore()` **omits** the resolver → P8-A behavior unchanged.

## Entities

Restaurant, DiningRoom, Table, MenuCategory, MenuItem, Reservation, Customer, Campaign, Staff, BusinessHours, Holiday, PaymentPolicy, LoyaltyRule

## Queries

`restaurant`, `tables`, `menu`, `reservation`, `crm`, `inventory`, `payments`

## Supabase

See `sources/existing-tables.ts`. P8-B documents existing table mappings only — **no new migrations**.

## Quality

```bash
npx tsc -p src/restaurant-knowledge/tsconfig.json --noEmit
npm run lint
npm run type-check
```
