# P8-D — AI Action Engine

AI Concierge konuşma sonunda gerçek (auditable) işlemler çalıştırır.

```
Intent → ActionParser → ActionRegistry → Knowledge validate → Execute → Audit
                                                              ↘ Rollback
```

## Bootstrap

```ts
import { createAIActionEngine } from '@istebul/ai-actions';

const engine = createAIActionEngine({ restaurantId: 'demo-cafe' });

const result = await engine.execute({
  actionId: 'create_reservation',
  payload: {
    restaurantId: 'demo-cafe',
    date: '2026-07-16',
    time: '20:00',
    partySize: 2,
    tableId: 'M4',
  },
});
```

## Action Registry

| Family | Actions |
|--------|---------|
| ReservationAction | create_reservation, update_reservation |
| TableAssignmentAction | assign_table, change_table |
| PreorderAction | create_preorder, update_preorder |
| GuaranteeAction | apply_guarantee |
| PaymentAction | prepare_payment (**no live charge**) |
| CampaignAction | apply_campaign |
| SummaryAction | create_reservation_summary |

## Rules

- P6 / P7 / P8-A/B/C behavior unchanged
- Knowledge Graph validates tables before assign
- Every action audited via P8-A `AIAuditLogger`
- Reservation Engine is in-memory (KG `createReservation` factory)
