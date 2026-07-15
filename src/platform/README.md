# İSTEBUL Platform Shell

Ortak **Platform Shell** altyapı katmanı.

Bu dizin; gelecekte Platform Landing, platform gezinmesi, platform alt bilgisi (footer),
ortak duyuru / banner / bildirim yüzeyleri ve ürün kartları gibi **ürünler arası**
parçaların oturacağı yerdir.

## Durum

| Alan | Durum |
|------|--------|
| Klasör iskeleti | Hazır (PR-001) |
| Ürün kimliği veri katmanı | Hazır (PR-002) — `constants/`, `types/`, `config/` |
| Ortak bileşen iskeleti | Hazır (PR-003) |
| PlatformHero UI | Çalışan bileşen (PR-004) — ekrana bağlı değil |
| PlatformÜrünKartı UI | Çalışan bileşen (PR-005) — ekrana bağlı değil |
| Çalışan UI / route bağlantısı | **Yok** — kullanıcıya görünmez (`PLATFORM_CATALOG.wiredToRuntime === false`) |
| GarsonAI / Business / İSTEBUL AI | Dokunulmaz; ürün kodundan import yok |

Bu katman **etkin değildir**. HTML girişi, `js/app.js`, build bundle listesi veya
Cloudflare yönlendirmesi bu PR kapsamında bağlanmaz.

### Kimlik girişi (henüz bağlanmadı)

```ts
// Gelecek PR’lar için — şimdilik hiçbir yerden import edilmemeli
import { PLATFORM_CATALOG, PLATFORM_PRODUCTS } from './index';
```

## Neden `src/platform/`?

Depoda foundation iskeletleri için yerleşik kalıp `src/` altındadır
(`src/business/`, `src/ai-core/`, `src/ai-listings/`).

`js/platform/` ise **İSTEBUL AI** çalışma zamanı modüllerini içerir
(`category-registry.js`, `home-category-config.js`, …). Oraya eklemek ürün sınırını bulanıklaştırır.

Bu nedenle ortak Platform Shell **`src/platform/`** altında tutulur; AI runtime’dan ayrıdır.

## Dizinler

| Klasör | Amaç |
|--------|------|
| `components/` | Ortak platform bileşen iskeleti (PR-003; çalışan kod yok) |
| `constants/` | Platform sabitleri ve ürün kaydı adayları |
| `types/` | Platform tip sözleşmeleri |
| `assets/` | Platform’a özel statik varlıklar (marka dışı) |
| `config/` | Platform yapılandırması (bayraklar, hub meta) |

## Sınırlar

**İzinli (gelecek PR’larda, ayrı onayla):**

- Platform Landing kabuğu
- Platform gezinmesi / alt bilgisi
- Ortak banner, duyuru, bildirim iskeleti
- Ürün kartları (yalnızca yönlendirme metadata’sı)

**Yasak:**

- GarsonAI / Business / İSTEBUL AI iş mantığı
- Ürün admin panellerinin birleştirilmesi
- Zorunlu ortak kullanıcı sistemi
- Mevcut `index.html`, route, SEO veya çalışan ekran değişikliği (bu PR’da yok)

## Resmî standartlar

- [`docs/GELİŞTİRME_PRENSİPLERİ.md`](../../docs/GELİŞTİRME_PRENSİPLERİ.md)
- [`docs/PLATFORM_MİMARİSİ.md`](../../docs/PLATFORM_MİMARİSİ.md)
- [`docs/TÜRKÇE_TERİM_STANDARTLARI.md`](../../docs/TÜRKÇE_TERİM_STANDARTLARI.md)

## Kullanıcıya görünen dil

Gelecekte buradan üretilen tüm UX metinleri Türkçe olmalıdır
([terim sözlüğü](../../docs/TÜRKÇE_TERİM_STANDARTLARI.md)).
