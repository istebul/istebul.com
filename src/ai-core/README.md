# P8-A — GarsonAI AI Core Platform

Additive TypeScript AI foundation under `src/ai-core/`.

**Does not modify** P6 production (`/garson/panel/`), P7 ERP/CX apps, UI, or Supabase schemas.

## Goals

- Every GarsonAI module calls AI through this core — never OpenAI / Groq / xAI SDKs directly.
- Strategy Pattern providers; switching is one line.
- P8-A ships stubs + memory + prompt registry + audit/token abstractions — **no live LLM calls**.

## Quick start

```ts
import { createAICore } from '../src/ai-core/index.ts';

// One-line provider strategy selection
const ai = createAICore({ provider: 'mock' });

await ai.upsertRestaurantContext('rest_1', { name: 'Demo Lokanta', city: 'İstanbul' });
await ai.upsertCustomerContext('cust_1', { displayName: 'Ayşe', allergies: ['fındık'] });

const result = await ai.orchestrate({
  moduleId: 'reservation',
  conversationId: 'conv_1',
  restaurantId: 'rest_1',
  customerId: 'cust_1',
  userMessage: 'Bu akşam 4 kişilik masa var mı?',
  variables: { party_size: 4, date: '2026-07-14', time: '20:00' },
});
```

Switch provider later:

```ts
const ai = createAICore({ provider: 'groq' }); // still stub in P8-A
```

## Layout

| Path | Role |
|------|------|
| `interfaces/` | `LLMProvider`, `EmbeddingProvider`, `ModerationProvider` |
| `providers/` | `openai`, `groq`, `xai`, `mock` stubs + factory |
| `services/` | Orchestrator, PromptBuilder/Registry, TokenCounter, ConversationMemory, AIAuditLogger |
| `prompts/` | Per-module templates (reservation, menu, crm, kitchen, waiter, payments, customer, inventory) |
| `memory/` | Conversation, restaurant-context, customer-context models |
| `storage/` | Supabase-ready store interfaces + in-memory implementations |

## Quality

```bash
npx tsc -p src/ai-core/tsconfig.json --noEmit
npm run lint
npm run type-check
```

## Explicit non-goals (P8-A)

- No real OpenAI / Groq / xAI HTTP
- No Supabase migration / tables
- No UI changes
- No P6 / P7 rewires yet (modules adopt in later P8 tickets)
