# P8-C AI Concierge

GarsonAI’ın ilk gerçek AI modülü — misafir sohbeti.

## Amaç

P8-A AI Core + P8-B Restaurant Knowledge Graph üzerinde çalışan Concierge akışı.

- Canlı LLM anahtarı zorunlu değil
- Mock provider ile tam akış çalışır
- `provider: 'openai' | 'groq' | 'xai'` tek satırla açılabilir

## Route

`/r/{restaurantSlug}/concierge`

P7 journey içindeki `ConciergeStep` placeholder **değiştirilmedi** (P7 davranış koruması).
P8-C ayrı deep-link yüzeyidir.

## Akış

```
Landing (/r/{slug})
        ↓
AI Concierge (/r/{slug}/concierge)
        ↓
Doğal dil konuşması
        ↓
Restaurant Knowledge Snapshot
        ↓
Knowledge Resolver
        ↓
Concierge PromptBuilder (Snapshot + Memory + Intent)
        ↓
AI Core (orchestrate, moduleId: customer)
        ↓
Provider (mock → smart reply | future live LLM)
        ↓
AI Response + öneri kartları
```

## Intentler

| Intent | Örnek |
|--------|--------|
| create_reservation | “Bugün için rezervasyon oluştur” |
| suggest_table | “Romantik masa öner” |
| change_party_size | “4 kişiye çıkar” |
| suggest_datetime | “Uygun saat öner” |
| suggest_menu | “Menü öner” |
| create_preorder | “Ön sipariş oluştur” |
| suggest_campaign | “Kampanyalar” |
| show_reservation_summary | “Rezervasyon özeti göster” |

## Conversation Memory

`restaurantSlug`, tarih, saat, kişi sayısı, salon, masa, ön sipariş, kampanya.

## Mock Provider

`ConciergeMockResponder` Knowledge Resolver adaylarına göre Türkçe örnek cevap üretir.

`remoteCallAttempted = false`

## Gelecek LLM geçişi

```ts
createAIConcierge({ restaurantSlug: 'demo-cafe', provider: 'openai' })
// veya 'groq' | 'xai'
```

Concierge / Prompt / Memory / Resolver kodu değişmez — P8-A Provider Strategy canlı adapter’ları açınca aynı yol kullanılır.

## Paket

`src/ai-concierge/` → `@istebul/ai-concierge`

## Test

- `tests/unit/ai-concierge-platform.test.mjs`
- `tests/unit/ai-concierge-runtime.test.mjs`

## Kurallar

- P6 production’a dokunulmadı
- P7 ve P8-A/B varsayılan davranışları korunur
- Tamamen additive
