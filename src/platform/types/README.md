# types

Platform Shell tip sözleşmeleri için yer tutucu.

## Gelecek adaylar (henüz yok)

- `PlatformProduct` — ürün kimliği, görünen ad, giriş yolu, durum
- `PlatformShellProps` — kabuk düzeni sözleşmesi
- Banner / duyuru / bildirim DTO iskeletleri (iş kuralı olmadan)

## Kurallar

- PR-001’de tip dosyası **yoktur**.
- Tipler eklendiğinde ürün domain modellerini (rezervasyon, skor, ERP sipariş vb.) içermemelidir.
- Ürün özel tipler ilgili ürün dizininde kalır (`src/business/types`, Garson yüzeyleri, AI `js/`).
