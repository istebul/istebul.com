# Export Engine

İSTEBUL Business **Export Engine** — `DocumentModel` / `DashboardModel` girdilerinden `ExportResult` ve artifact sözleşmeleri.

## Architecture Freeze v1.0

Tanım katmanı; gerçek PDF/DOCX/XLSX/PPTX/HTML/CSV veya dosya kaydı yoktur.

## Dizinler

| Klasör | Amaç |
|--------|------|
| `models/` | ExportRequest, ExportResult, … |
| `ports/` | Motor ve pipeline portları |
| `pipeline/` | Aşama tanımları |
| `registry/` | Profil, format, şablon, artifact |
| `constants/` | Sabitler |
| `formats/` | Format kayıt sözleşmesi |
| `templates/` | Şablon kayıt sözleşmesi |

Detay: `Export Engine Specification.md`
