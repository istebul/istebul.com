# BusinessDataset

İSTEBUL Business **resmi veri dili** — tüm kaynaklar (Excel, CSV, ERP, REST API, GarsonAI dönüşümü vb.) bu modele normalize edilir.

## Bu PR’da (PR-003)

- Tip / interface foundation
- Entity ve kaynak tipi sözlükleri
- Normalizer port arayüzleri (implementasyon yok)
- Örnek JSON dataset dosyaları
- `BusinessDataset Specification.md`

## Dizinler

| Klasör | Amaç |
|--------|------|
| `models/` | Kök ve parça veri modelleri |
| `entities/` | Entity ve kaynak tipi kayıtları |
| `validators/` | Doğrulama bulgu tipleri |
| `normalizers/` | Gelecek import motoru portları |
| `schemas/` | Şema sabitleri |
| `examples/` | Örnek JSON dataset’ler |

## Bilinçli sınırlar

- UI, dashboard, import ekranı yok
- AI çağrısı yok
- PDF üretimi yok
- GarsonAI / Auth / Billing / Shared Core’a dokunulmaz
