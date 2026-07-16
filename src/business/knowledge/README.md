# Business Knowledge Architecture

İSTEBUL Business rapor, analiz, dashboard ve (gelecek) AI altyapısının ortak **bilgi mimarisi** katmanı.

Bu katman tanım dosyalarıyla genişler: yeni rapor / KPI / kategori eklemek için kod motoru yazmak yerine registry’ye kayıt eklenir.

## Bu PR’da (PR-002)

- Report DNA tip modeli (`ReportDefinition`)
- KPI, kategori, prompt anahtarı ve çıktı kayıtları
- Gelecek AI port arayüzleri (çağrı yok)
- Dokümantasyon: `Business Knowledge Architecture.md`

## Dizinler

| Klasör | Amaç |
|--------|------|
| `categories/` | Kategori tanımları ve kayıt |
| `reports/` | Report DNA tipleri ve rapor kayıtları |
| `kpis/` | KPI tanımları ve örnek kayıtlar |
| `prompts/` | Prompt anahtar kayıtları (metin yok) |
| `templates/` | Gelecek şablon tanımları (şimdilik boş) |
| `schemas/` | AI / sözleşme arayüzleri |
| `outputs/` | Çıktı format kayıtları |

## Kullanım

```ts
import {
  REPORT_REGISTRY,
  KPI_REGISTRY,
  CATEGORY_REGISTRY,
  PROMPT_REGISTRY,
  OUTPUT_REGISTRY
} from '../knowledge';
```

## Bilinçli sınırlar

- Rapor üretim motoru yok
- AI çağrısı yok
- Auth / Billing / AI Core’a bağımlılık yok
- GarsonAI’ye dokunulmaz
- Yeni UI yüzeyi yok
