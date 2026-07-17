# Report Engine

İSTEBUL Business **Report Engine** — `DecisionResult` verisini kanonik `ReportModel` yapısına dönüştürme sözleşmeleri.

## Architecture Freeze v1.0

Tanım katmanı; PDF/Word/PPT/dashboard üretimi yoktur.

## Dizinler

| Klasör | Amaç |
|--------|------|
| `models/` | ReportModel ve parça tipleri |
| `ports/` | Motor ve pipeline portları |
| `pipeline/` | Aşama tanımları |
| `registry/` | Profil, bölüm, referans, şablon köprüsü |
| `constants/` | Sabitler |
| `sections/` | Bölüm şablon sözleşmesi |

Detay: `Report Engine Specification.md`
