# Import Engine

İSTEBUL Business **Import Engine** — çok kaynaklı veriyi `BusinessDataset` resmi veri diline dönüştürecek altyapının foundation katmanı.

## Architecture Freeze v1.0

Bu PR yalnızca:

- Port arayüzleri
- Pipeline aşama tanımları
- Adapter kayıt sistemi
- Import tipleri

## Bu PR’da yok / sınırlar

- UI / dosya yükleme ekranı
- Excel / CSV / PDF okuma veya parse (runtime orchestrator var; reader yok)
- AI çağrısı

## Dizinler

| Klasör | Amaç |
|--------|------|
| `adapters/` | Adapter kayıt sistemi |
| `pipeline/` | Aşama tanımları |
| `ports/` | Reader, detector, mapper, validator, pipeline portları |
| `readers/` | Gelecek reader implementasyonları |
| `detectors/` | Gelecek detector implementasyonları |
| `normalizers/` | Gelecek normalizer kayıtları |
| `validators/` | Gelecek validator implementasyonları |
| `types/` | ImportRequest, ImportResult, … |
| `constants/` | Engine sabitleri |

Detay: `Import Engine Specification.md`
