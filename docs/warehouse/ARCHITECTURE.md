# WarehouseIQ Mimari Kararları

## Genel Yaklaşım

WarehouseIQ, İSTEBUL ana kod deposu içerisinde bağımsız bir ürün modülü olarak geliştirilecektir.

Ana uygulama dizini: `src/warehouse/`

Dokümantasyon dizini: `docs/warehouse/`

## Mimari İlkeler

- WarehouseIQ bağımsız ürün sınırlarına sahip olacaktır.
- Warehouse kodu, İSTEBUL Business veya GarsonAI iş kurallarına doğrudan bağımlı olmayacaktır.
- Ortak altyapılar yalnızca mevcut ortak servisler üzerinden kullanılacaktır.
- İş kuralları kullanıcı arayüzünden bağımsız tutulacaktır.
- Stok miktarı doğrudan değiştirilmek yerine stok hareketlerinden üretilecektir.
- Tüm operasyon verileri firma ve depo kapsamıyla saklanacaktır.
- Veri erişimi tenant ve kullanıcı yetkilerine göre sınırlandırılacaktır.
- Kritik işlemler denetim kayıtlarına yazılacaktır.

## İlk Modül Yapısı

- `api/`: API istemcileri ve veri sağlayıcıları
- `assets/`: WarehouseIQ görsel kaynakları
- `components/`: Ortak arayüz bileşenleri
- `hooks/`: Uygulama hook'ları
- `pages/`: Ürün sayfaları
- `routes/`: Route tanımları
- `services/`: Uygulama ve domain servisleri
- `types/`: TypeScript veri modelleri
- `utils/`: Yardımcı fonksiyonlar

## Hedef Katmanlar

1. Kullanıcı arayüzü
2. Uygulama servisleri
3. Domain kuralları
4. Veri sağlayıcıları
5. PostgreSQL ve Supabase

## Çoklu Firma Modeli

Operasyonel kayıtlar ihtiyaca göre aşağıdaki kapsam alanlarını taşıyacaktır:

- `tenant_id`
- `warehouse_id`
- `created_by`
- `created_at`
- `updated_at`

Firma düzeyindeki ana kayıtlar yalnızca `tenant_id` taşıyabilir.

## Stok Kaynağı

WarehouseIQ sistemindeki gerçek stok kaynağı stok hareket defteridir.

Stok özetleri performans amacıyla tutulabilir ancak ana kayıt olarak kabul edilmez. Özet tablolar stok hareketleriyle tutarlı şekilde yeniden üretilebilir olmalıdır.

## Entegrasyon Yaklaşımı

İlk sürüm REST tabanlı servisler kullanacaktır.

İlerleyen sürümlerde aşağıdaki bağlantılar eklenebilir:

- ERP sistemleri
- E-ticaret platformları
- Kargo şirketleri
- Webhook servisleri
- EDI
- Dosya aktarımı
- RFID
- IoT cihazları

## Güvenlik

- Tenant izolasyonu
- Rol bazlı yetkilendirme
- Satır seviyesinde veri güvenliği
- İşlem ve değişiklik geçmişi
- Kritik operasyonlarda doğrulama
- Hassas işlemlerde çift kontrol desteği

## Dil ve Terminoloji Standardı

WarehouseIQ kullanıcı arayüzü tamamen Türkçe olacaktır.

- Tüm menüler Türkçe
- Tüm butonlar Türkçe
- Tüm yönergeler Türkçe
- Tüm bildirimler Türkçe
- Tüm hata mesajları Türkçe
- Tüm rapor başlıkları Türkçe
- Türkçe karakterler eksiksiz kullanılacaktır

Kod, API ve veritabanı alan adları teknik sürdürülebilirlik için İngilizce olabilir.

Örnek:

- Teknik değer: `temporarily_closed`
- Kullanıcıya gösterilen değer: `Geçici Olarak Kapalı`

Ham teknik değerler kullanıcı arayüzünde doğrudan gösterilmeyecektir.
