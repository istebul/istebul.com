# P8-A AI Core Platform — Architecture

## AI Architecture

GarsonAI modules (reservation, menu, CRM, kitchen, waiter, payments, customer, inventory) share a single **AI Core** under `src/ai-core/`.

Call flow:

```
Module → AIOrchestrator → PromptRegistry + PromptBuilder
                       → ConversationMemory / RestaurantContext / CustomerContext
                       → LLMProvider (Strategy)
                       → TokenUsageStore + AIAuditLogger
```

No module should import OpenAI/Groq/xAI SDKs. Provider swap happens only inside AI Core via Strategy factory.

P8-A is **additive**: P6 production panel and P7 ERP/CX apps are untouched. Supabase tables are **not** created; storage interfaces are ready for later repositories.

## Provider Strategy

Interfaces:

- `LLMProvider.complete()`
- `EmbeddingProvider.embed()`
- `ModerationProvider.moderate()`

Concrete stubs: `openai-provider`, `groq-provider`, `xai-provider`, `mock-provider`.

Factory (one-line switch):

```ts
createAICore({ provider: 'openai' | 'groq' | 'xai' | 'mock' })
```

All providers set `remoteCallAttempted: false` — no network in P8-A.

## Prompt Registry

`PromptRegistry` seeds from `BUILTIN_PROMPTS`. Every module resolves prompts with `getForModule(moduleId)`.

Templates live under `prompts/` with `{{variable}}` placeholders rendered by `PromptBuilder`.

## Conversation Memory

`ConversationMemory` + `memory/conversation` keep turn history behind `MemoryStore`.

Default: `InMemoryMemoryStore`. Future: Supabase repository implementing the same interface.

## Restaurant & Customer Context

Ready models:

- `RestaurantContext` — name, cuisine, hours, policies, highlights
- `CustomerContext` — allergies, dietary, loyalty, favorites

Orchestrator injects both into the system prompt block before provider.complete().

## AI Orchestrator

`AIOrchestrator.orchestrate()` is the single entry:

1. Resolve module prompt
2. Load / upsert contexts
3. Build messages (+ conversation history)
4. Call provider strategy (stub)
5. Estimate + log token usage
6. Append conversation turns
7. Write audit decision log

## Token Usage & Audit

- `TokenCounter` — heuristic estimate (`estimated: true`)
- `TokenUsageStore` — append/list abstraction
- `AIAuditLogger` — decision log preparation

No production tables yet.

## Future AI Modules

Adoption pattern for later P8 tickets:

1. Import `createAICore` / `AIOrchestrator`
2. Call `orchestrate({ moduleId })` — do not add provider SDKs in the module
3. Optionally register custom prompts via `PromptRegistry.register()`
4. Swap live providers when network adapters are implemented (still behind Strategy)

Planned consumers: reservation AI, menu intelligence, CRM scoring, kitchen priority, waiter floor coach, payment policy advisor, CX chat, inventory alerts — all through this core.
