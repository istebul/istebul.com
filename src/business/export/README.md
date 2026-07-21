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
| `pipeline/runtime/` | Pipeline Runtime (PR-106A) — doğrulama + iskelet ExportModel |
| `modelBuilder/runtime/` | Export Model Builder (PR-106B) — formatlardan bağımsız projeksiyon |
| `registry/` | Profil, format, şablon, artifact |
| `constants/` | Sabitler |
| `formats/` | Format kayıt sözleşmesi |
| `templates/` | Şablon kayıt sözleşmesi |

Detay: `Export Engine Specification.md`

## Pipeline Runtime (PR-106A)

`ExportPipelineRuntime` frozen aşamaları koordine eder:

1. **Export Validation** (`export-dogrulama`) — gerçek kaynak doğrulama
2. Format / Template / Composition / Artifact — structured `not-implemented`
3. **Export Result** (`export-sonuc`) — her durumda geçerli `ExportResult`

Validation başarılıysa bag'e iskelet `ExportModel` yazılır. Renderer, format dosyası ve bayt üretimi yoktur.

## Export Model Builder (PR-106B)

`ExportModelBuilderRuntime` DocumentModel / DashboardResult üzerinden formatlardan bağımsız `ExportModel` üretir (projection only).

- Parçalar: Metadata, Content, Document / Dashboard / Report / Section / Widget / KPI References
- Pipeline bag: `exportModelRuntimeResult` + iskelet `bag.exportModel`
- PR-106A orchestrator dosyalarına dokunmaz (`applyExportModelBuilderToPipelineResult`)
