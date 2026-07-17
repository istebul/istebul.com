# Analysis Engine

İSTEBUL Business **Analysis Engine** — `BusinessDataset` üzerinde KPI, kural ve bulgu odaklı analizin çekirdek sözleşmeleri.

## Architecture Freeze v1.0

Bu PR: modeller, portlar, pipeline aşamaları, boş registry iskeletleri.

## Bu PR’da yok

AI / LLM, dashboard, grafik, PDF/Word/PPT, UI, HTTP, veritabanı, gerçek KPI ve kural yürütme.

## Dizinler

| Klasör | Amaç |
|--------|------|
| `models/` | AnalysisRequest, AnalysisResult, … |
| `ports/` | IAnalysisEngine, IKPIEngine, … |
| `pipeline/` | Aşama tanımları |
| `registry/` | Analysis, Rule, Finding, KPI köprüsü |
| `constants/` | Engine sabitleri |
| `rules/` | Kural sözleşmeleri |
| `kpis/` | KPI hesaplama sözleşmeleri |

Detay: `Analysis Engine Specification.md`
