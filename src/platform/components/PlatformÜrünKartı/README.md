# PlatformÜrünKartı

Tek bir platform ürününü tanıtan **üretim kalitesinde** kart bileşeni.

## Durum (PR-005)

| Alan | Durum |
|------|--------|
| DOM üreticisi | `PlatformUrunKarti.ts` — `createPlatformUrunKartiElement` |
| Stil | `platform-urun-karti.css` (scoped `.ib-platform-urun-karti`) |
| Örnek kullanım | [`ÖRNEK_KULLANIM.md`](./ÖRNEK_KULLANIM.md) |
| HTML / route / home bağlantısı | **Yok** |

## Desteklenen alanlar

| Alan | Kaynak (`PlatformProduct`) |
|------|----------------------------|
| Ürün adı | `name` |
| Kısa açıklama | `shortDescription` |
| Platform etiketi | `platformLabel` |
| Durum rozeti | `status` + `statusLabel` |
| Ürün rengi | `defaultColor` → `--ib-puc-accent` |
| Logo alanı | `logoKey` / opsiyonel `logoSrc` |
| Çağrı butonu | CTA — yönlendirme yok |

## Durum görünümleri

Canlı · Geliştirme Aşamasında · Yakında · Beta · Bakım · Kapalı  
(yalnızca görsel; gezinme yok)

## Sorumluluk

- Herhangi bir `PlatformProduct` nesnesinden kendini kurmak
- Yalnızca sunum; sipariş / skor / ERP iş kuralı yok
- İSTEBUL AI / GarsonAI / Business ürün UI’lerinin yerine geçmez

## Kurallar

- `src/platform` dışından henüz import edilmemelidir.
- CTA `product.url` taşır ama tıklanınca gitmez (gelecek Landing PR).
