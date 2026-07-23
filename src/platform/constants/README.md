# constants

Platform düzeyinde **statik sabitler** ve ürün kayıt listeleri.

## Bu PR’da (PR-002)

| Dosya | İçerik |
|-------|--------|
| `platform-products.ts` | İSTEBUL AI, GarsonAI, İSTEBUL Business resmî tanımları |
| `platform-product-status.ts` | Durum rozeti Türkçe etiketleri / ton eşlemesi (PR-005) |

## Kurallar

- Kullanıcıya görünen metinler Türkçe’dir.
- Bu kayıtlar route, HTML veya build değiştirmez; yalnızca bilgi katmanıdır.
- İSTEBUL AI dikey kaydı (`js/platform/category-registry.js`) buraya kopyalanmaz.
- GarsonAI / Business / İSTEBUL AI ürün kaynak kodları bu klasörü henüz import etmez.
