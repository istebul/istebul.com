# P8-C — AI Concierge

GarsonAI’ın ilk gerçek misafir AI modülü.

```
Landing → /r/{slug}/concierge → Intent → Memory
  → Restaurant Knowledge Snapshot → Knowledge Resolver
  → Concierge PromptBuilder → AI Core → Provider → Response
```

## Bootstrap

```ts
import { createAIConcierge } from '@istebul/ai-concierge';

const concierge = createAIConcierge({
  restaurantSlug: 'demo-cafe',
  provider: 'mock', // later: 'openai' | 'groq' | 'xai'
});

const turn = await concierge.chat('İki kişilik romantik masa öner');
// turn.remoteCallAttempted === false
```

## Intentler

- rezervasyon oluştur
- masa öner
- kişi sayısı değiştir
- tarih/saat öner
- menü öner
- ön sipariş oluştur
- kampanya öner
- rezervasyon özeti göster

## Memory

Oturum boyunca: `restaurantSlug`, tarih, saat, kişi sayısı, salon, masa, ön sipariş, kampanya.

## Mock provider

Canlı LLM anahtarı gerekmez. Mock, Knowledge Resolver sonucuna göre akıllı Türkçe cevap + öneri kartları üretir (`remoteCallAttempted = false`).

## Kurallar

- P6 production’a dokunmaz
- P7 CX journey `ConciergeStep` placeholder’ı değiştirmez
- P8-A / P8-B varsayılan davranışını bozmaz (kendi DI wiring’i)
