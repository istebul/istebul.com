# @istebul/ai-decision (P8-F)

AI Restaurant Brain — central Decision Engine for GarsonAI.

## Capabilities

- Masa / rezervasyon / menü / kampanya öner
- Garanti tutarı öner
- Yoğunluk / bekleme / mutfak yükü tahmini

## Bootstrap

```ts
import { createAIDecisionEngine } from '@istebul/ai-decision';

const brain = createAIDecisionEngine({ restaurantId: 'demo-cafe' });
const result = await brain.decide({
  kind: 'suggest_table',
  restaurantId: 'demo-cafe',
  partySize: 2,
});
```

Mock default · `remoteCallAttempted: false` · no live LLM.

## Docs

See `docs/P8F_AI_DECISION_ENGINE.md`.
