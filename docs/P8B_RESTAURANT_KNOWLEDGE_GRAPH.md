# P8-B Restaurant Knowledge Graph

## Amaç

AI Concierge, CRM AI, Kitchen AI ve WhatsApp AI’ın kullanacağı **ortak restoran bilgi katmanı**.

Bu modül **hiçbir LLM çağrısı yapmaz** — yalnızca restoran bilgisini standartlaştırır.

## Mimari

```
AIOrchestrator
    ↓ (optional)
KnowledgeResolver
    ↓
Restaurant Snapshot + adaylar
    ↓
PromptBuilder (system block)
    ↓
Provider (stub / future live)
```

Paket: `src/restaurant-knowledge/`

| Katman | Rol |
|--------|-----|
| `entities/` | Standart domain modelleri |
| `sources/` | KnowledgeSource + mevcut tablo haritası + InMemory |
| `queries/` | Snapshot üzerinde tip güvenli sorgular |
| `services/` | Builder / Snapshot / Service / Resolver |

### Kurallar

- P6 production koduna dokunulmadı
- P7 ERP/CX ve P8-A AI Core varsayılan davranışı bozulmadı (resolver opsiyonel DI)
- Tamamen additive
- Yeni Supabase tablosu yok

## Snapshot yapısı

`KnowledgeBuilder` düz bundle’ı iç içe `RestaurantSnapshot`’a çevirir:

1. Restaurant profili  
2. Salonlar → masalar  
3. Menü (kategori → item)  
4. Kampanyalar  
5. Çalışma saatleri + tatiller  
6. Ödeme politikaları  
7. CRM müşteri dilimi + loyalty  
8. Personel / rezervasyonlar / envanter  
9. Bugünkü yoğunluk (`occupancy`)

`KnowledgeSnapshot` bu objeyi dondurulmuş okuma yüzeyi olarak sarar.

## Resolver

`KnowledgeResolver.resolve({ restaurantId, query })`:

1. Snapshot yükler (`KnowledgeService`)  
2. Heuristik constraint parse (`4 kişilik`, `sessiz`, `teras`, …)  
3. `scoreTableCandidates` / `scoreMenuCandidates` / kampanya skorları  
4. `promptBlock` + `summary` üretir  

LLM adımı AI Core Provider’dadır — Knowledge Graph yalnızca bağlam hazırlar.

## AI entegrasyon noktaları

| Nokta | Durum |
|-------|--------|
| `AIOrchestratorOptions.knowledgeResolver` | Opsiyonel port |
| `orchestrate()` system parts | Resolver varsa prompt block ekler |
| `createAICore()` varsayılanı | Resolver yok → P8-A ile aynı |
| `createRestaurantKnowledge()` | Demo seed + service + resolver |

Port arayüzü (`RestaurantKnowledgeResolverPort`) `src/ai-core` içinde tanımlanır; `restaurant-knowledge` implement eder — döngüsel paket bağımlılığı yoktur.

## Gelecek AI modülleri

| Modül | Knowledge kullanımı |
|-------|---------------------|
| Concierge / CX chat | Resolver → masa/menü adayları |
| Reservation AI | Snapshot occupancy + tables |
| Menu intelligence | Menu graph + inventory stock |
| CRM scoring | Customer + loyalty rules |
| Kitchen priority | Open reservations + menu prep |
| Waiter floor coach | Tables + staff assignments |
| WhatsApp AI | Aynı snapshot / resolver |
| Payments advisor | PaymentPolicy blokları |

Sonraki adımlar (ayrı ticket):

1. Supabase read adapter (`KnowledgeSource` implementasyonu) — mevcut tablolar  
2. CX `ConciergeStep` → `createAICore({ knowledgeResolver })` köprüsü  
3. Token-budget truncation politikası  
4. Canlı provider açılınca aynı prompt injection yolu

## Test

- `tests/unit/restaurant-knowledge-platform.test.mjs` — scaffold + no-LLM guard  
- `tests/unit/restaurant-knowledge-runtime.test.mjs` — snapshot / resolver / orchestrator wiring  
