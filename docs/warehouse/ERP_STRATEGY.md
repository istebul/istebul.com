# WarehouseIQ — ERP Bağımsız Ürün Stratejisi

## Temel Karar

WarehouseIQ bağımsız bir Depo Yönetim Sistemi (WMS) olarak geliştirilecektir.

SAP, Logo Netsis, Logo Tiger, Logo Wings, Luca, Mikro, Nebim, Microsoft Dynamics 365, Oracle ERP, ETA, Akınsoft, Zirve ve özel ERP sistemleri ayrı bağlayıcılar üzerinden desteklenecektir.

WarehouseIQ çekirdeği hiçbir ERP markasını, sürümünü, tablo yapısını veya bağlantı yöntemini doğrudan bilmeyecektir.

## Mimari

ERP Sistemi → ERP Bağlayıcısı → Adaptör ve Eşleyici → Entegrasyon Servisleri → WarehouseIQ Domain

## Sistem Sorumlulukları

ERP sistemleri ürün, cari, tedarikçi, müşteri, satın alma, satış, finans, muhasebe ve resmî belge kayıtlarının ana sistemi olabilir.

WarehouseIQ depo, lokasyon, operasyonel stok, lot, seri numarası, son kullanma tarihi, rezervasyon, tahsis, mal kabul, kalite kontrol, yerleştirme, toplama, paketleme, sevkiyat ve sayım süreçlerini yönetecektir.

## Sabit Entegrasyon İlkeleri

- Domain katmanında ERP markasına özel kod bulunmayacaktır.
- Her ERP ayrı bir bağlayıcı üzerinden desteklenecektir.
- ERP verileri eşleme katmanından geçmeden WarehouseIQ domain modellerine aktarılmayacaktır.
- Inbox ve Outbox modeli kullanılacaktır.
- Mükerrer işlemler idempotency anahtarıyla engellenecektir.
- Başarısız işlemler yeniden denenebilecektir.
- Bütün işlemler korelasyon kimliğiyle izlenecektir.
- Çakışmalar sessizce ezilmeyecek, mutabakat sürecine alınacaktır.
- ERP bağlantısı kesildiğinde depo operasyonları kontrollü devam edecektir.
- Doğrudan ERP tablolarına kontrolsüz yazım yapılmayacaktır.
- Kullanıcı metinleri, hata mesajları, yönergeler ve kod yorumları Türkçe olacaktır.

## Sabit Geliştirme Sırası

1. Inventory Engine Foundation
2. Reservation Engine
3. Availability ve Allocation
4. Receiving — Mal Kabul
5. Quality Control
6. Putaway — Yerleştirme
7. Sipariş Orkestrasyonu
8. Wave Planning
9. Picking — Toplama
10. Packing — Paketleme
11. Shipping — Sevkiyat
12. Sayım ve Replenishment
13. Ortak ERP entegrasyon portları
14. Inbox, Outbox, idempotency ve mutabakat altyapısı
15. SAP, Netsis, Logo, Luca, Mikro, Nebim ve diğer ERP bağlayıcıları
16. Warehouse Intelligence ve AI

## Değiştirilmeyecek Kararlar

WarehouseIQ genel muhasebe ERP sistemine dönüştürülmeyecektir.

WarehouseIQ tek bir ERP markasına bağımlı olmayacaktır.

ERP farklılıkları WarehouseIQ domain katmanına taşınmayacaktır.
