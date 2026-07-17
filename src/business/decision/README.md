# Decision Engine

İSTEBUL Business **Decision Engine** — `AnalysisResult` verisini karar destek çıktısına (`DecisionResult`) dönüştürecek çekirdek sözleşmeler.

## Architecture Freeze v1.0

Bu PR: modeller, portlar, pipeline, boş registry’ler, strateji sözleşmesi.

## Bu PR’da yok

LLM, prompt, AI provider, dashboard, PDF/Word/PPT, HTTP, veritabanı, UI, gerçek karar üretimi.

## Dizinler

| Klasör | Amaç |
|--------|------|
| `models/` | DecisionRequest, DecisionResult, … |
| `ports/` | IDecisionEngine, … |
| `pipeline/` | Aşama tanımları |
| `registry/` | Decision, Recommendation, Risk, Strategy |
| `constants/` | Engine sabitleri |
| `strategies/` | Strateji sözleşmesi |

Detay: `Decision Engine Specification.md`
