# constants

Platform düzeyinde **statik sabitler** ve kayıt listeleri için yer tutucu.

## Gelecek adaylar (henüz yok)

- Ürün kaydı kimlikleri (İSTEBUL AI, GarsonAI, Business)
- Platform kabuk etiket anahtarları (Türkçe UI metinleri ayrı içerik katmanında tutulabilir)
- Ortak banner / duyuru kanal adları (salt sabitleme; içerik CMS/API ayrı PR)

## Kurallar

- PR-001’de sabit dosyası veya çalışan export **yoktur**.
- Ürün dikeyi (`js/platform/category-registry.js` vb.) buraya kopyalanmaz;
  o kayıtlar İSTEBUL AI kapsamındadır.
- Sabitler eklendiğinde iş kuralı / skorlama / sipariş mantığı içermemelidir.
