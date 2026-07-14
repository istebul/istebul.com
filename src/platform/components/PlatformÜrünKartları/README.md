# PlatformÜrünKartları

Tek bir platform ürününü tanıtan kelime kartı bileşeni iskeleti.

## Sorumluluk (gelecek)

- `PLATFORM_PRODUCTS` kaydından (PR-002) ad, kısa açıklama, slogan, durum, renk, URL göstermek
- Yalnızca yönlendirme etkileşimi; sipariş, karar skoru veya Business modül iş kuralı yok
- GarsonAI / Business / İSTEBUL AI ürün UI bileşenlerinin yerine geçmez

## Durum (PR-003)

| Alan | Durum |
|------|--------|
| Klasör / README | Hazır |
| Çalışan kod | Yok |
| Ürün kataloğuna runtime import | Yok (bilinçli) |

## Kurallar

- Kart, etkileşim için gerekliyse kullanılır; dekoratif kart kümesi üretilmez.
- Kullanıcı metinleri Türkçe; durum etiketleri katalogdaki `statusLabel` ile hizalanır.
