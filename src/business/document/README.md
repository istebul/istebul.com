# Document Engine

İSTEBUL Business **Document Engine** — `ReportModel` verisini yerleşim/stil odaklı kanonik `DocumentModel` yapısına dönüştürme sözleşmeleri.

## Architecture Freeze v1.0

Tanım katmanı; PDF/Word/HTML/Markdown üretimi ve dosya kaydı yoktur.

## Dizinler

| Klasör | Amaç |
|--------|------|
| `models/` | DocumentModel ve parça tipleri |
| `ports/` | Motor ve pipeline portları |
| `pipeline/` | Aşama tanımları |
| `registry/` | Profil, yerleşim, stil, tema |
| `constants/` | Sabitler |
| `layouts/` | Yerleşim sözleşmesi |
| `styles/` | Stil / tema sözleşmesi |

Detay: `Document Engine Specification.md`
