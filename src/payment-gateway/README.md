# @istebul/payment-gateway (P8-E)

Payment Gateway Integration for GarsonAI — Strategy providers, authorization lifecycle, reservation guarantee, webhook foundation, Concierge bridge.

## Providers

Stripe · iyzico · PayTR · Mock — all via Strategy Pattern. **No real API keys required.**

## Lifecycle

`pending → authorized → captured → released → refunded` (+ `expired` / `cancelled`)

## Concierge bridge

```ts
import { createConciergePaymentBridge } from '@istebul/payment-gateway';

const bridge = createConciergePaymentBridge({ restaurantId: 'demo-cafe' });
const result = await bridge.runFromTurn(turn);
// result.conversationMessage → append to chat
```

## Docs

See `docs/P8E_PAYMENT_GATEWAY.md`.
