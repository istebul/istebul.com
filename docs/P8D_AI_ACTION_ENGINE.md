# P8-D AI Action Engine

AI Concierge’nin konuşma sonunda gerçek işlemler yapmasını sağlayan Action katmanı.

## Amaç

P8-A AI Core + P8-B Restaurant Knowledge Graph + P8-C AI Concierge üzerine additive inşa.

- Canlı ödeme alma yok
- Gerçek provizyon yok
- Sadece Action katmanı + in-memory Reservation Engine

## Paket

`src/ai-actions/` → `@istebul/ai-actions`

## Akış

```
AI / Concierge Intent
        ↓
ActionParser
        ↓
ActionRegistry
        ↓
Knowledge Validator (masa dolu → fail)
        ↓
ActionHandler.execute
        ↓
ReservationEngine (in-memory)
        ↓
ActionAudit → AIAuditLogger
```

## Action Registry

| Registry adı | ActionId |
|--------------|----------|
| ReservationAction | create_reservation, update_reservation |
| TableAssignmentAction | assign_table, change_table |
| PreorderAction | create_preorder, update_preorder |
| GuaranteeAction | apply_guarantee |
| PaymentAction | prepare_payment (skipped / no live) |
| CampaignAction | apply_campaign |
| SummaryAction | create_reservation_summary |

## Reservation entegrasyonu

`ReservationEngine` KG `createReservation` entity factory ile uyumlu in-memory store.
İleride P7 `submitCustomerReservation` veya public API adapter’ı `ReservationActionPort` üzerinden bağlanır — Action kodu değişmez.

## Knowledge doğrulaması

`KnowledgeActionValidator`:

- masa `available` değilse → reject
- kapasite yetersizse → reject
- aynı tarih açık rezervasyonda masa çakışması → reject

## Audit

Her execute/rollback `action.{actionId}` decision type ile loglanır (`tags: p8d, ai-actions`).

## Concierge köprüsü (additive)

P8-C değiştirilmez. Caller:

```ts
const turn = await concierge.chat(msg);
const action = await engine.executeFromTurn(turn);
```

## Test

- `tests/unit/ai-actions-platform.test.mjs`
- `tests/unit/ai-actions-runtime.test.mjs` — success / failure / rollback
