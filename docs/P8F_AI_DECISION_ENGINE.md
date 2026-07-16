# P8-F AI Restaurant Brain (Decision Engine)

GarsonAI merkezi AI Decision Engine — öneri ve tahmin katmanı.

## Amaç

P8-A AI Core + P8-B Knowledge Graph üzerine additive Decision Brain.

- Live LLM yok
- Mock varsayılan
- Provider bağımsız (AI Core factory)
- P8-C Concierge / P8-D Action Engine yalnızca adapter seviyesinde
- SQL / migration / UI yok

## Paket

`src/ai-decision/` → `@istebul/ai-decision`

## Bileşenler

| Bileşen | Rol |
|---------|-----|
| DecisionEngine | Orkestrasyon (`createAIDecisionEngine`) |
| DecisionContext | Snapshot + request bağlamı |
| DecisionScorer | Skor / band yardımcıları |
| RecommendationEngine | Masa, rezervasyon, menü |
| CampaignEngine | Kampanya sıralama |
| GuaranteeEngine | Garanti tutarı |
| PredictionEngine | Yoğunluk, bekleme, mutfak yükü |
| DecisionAudit | P8-A AIAuditLogger köprüsü |

## Karar türleri

`suggest_table` · `suggest_reservation` · `suggest_menu` · `suggest_campaign` · `suggest_guarantee` · `predict_density` · `predict_wait_time` · `analyze_kitchen_load`

## Adapter'lar

- `KnowledgeAdapter` → P8-B
- `CoreProviderAdapter` → P8-A (`getAIProvider`, chat yok)
- `ConciergeAdapter` → P8-C turn duck-type
- `ActionHintsAdapter` → P8-D action id ipuçları (execute yok)

## Test

- `tests/unit/ai-decision-platform.test.mjs`
- `tests/unit/ai-decision-runtime.test.mjs`
