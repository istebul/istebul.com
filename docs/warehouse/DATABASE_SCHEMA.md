# WarehouseIQ Veritabanı Şeması

## Genel Yaklaşım

WarehouseIQ veritabanı PostgreSQL ve Supabase üzerinde çalışır.

İlk veritabanı temeli aşağıdaki migration dosyasında tanımlanır:

`supabase/migrations/20260804140000_warehouse_core_foundation.sql`

## Temel İlkeler

- Her firma bağımsız hesap olarak saklanır.
- Kullanıcılar hesaplara üyelik üzerinden bağlanır.
- Depolar firma hesabına bağlıdır.
- Lokasyonlar hem firma hesabına hem depoya bağlıdır.
- Tüm operasyonel veriler Row Level Security ile korunur.
- Kullanıcı erişimi rol ve üyelik durumuna göre sınırlandırılır.
- Kimlik alanlarında UUID kullanılır.
- Zaman alanlarında `timestamptz` kullanılır.
- Silme ve ilişki kuralları açık biçimde tanımlanır.
- Kullanıcıya görünen metinler Türkçedir.

## warehouse_accounts

WarehouseIQ kullanan firma veya organizasyonu temsil eder.

### Ana alanlar

- `id`: Firma hesabı kimliği
- `code`: Benzersiz firma kodu
- `name`: Firma adı
- `status`: Firma hesabı durumu
- `timezone`: Varsayılan saat dilimi
- `country_code`: Ülke kodu
- `created_by`: Kaydı oluşturan kullanıcı
- `created_at`: Oluşturulma zamanı
- `updated_at`: Son güncellenme zamanı

### Durum değerleri

- `active`: Aktif
- `suspended`: Askıya Alındı
- `inactive`: Pasif
- `archived`: Arşivlendi

## warehouse_users

Kullanıcıların WarehouseIQ firma hesaplarına üyeliğini temsil eder.

### Roller

- `owner`: Firma Sahibi
- `admin`: Yönetici
- `warehouse_manager`: Depo Müdürü
- `supervisor`: Depo Şefi
- `inventory_controller`: Stok Sorumlusu
- `receiver`: Mal Kabul Personeli
- `quality_controller`: Kalite Kontrol Personeli
- `forklift_operator`: Forklift Operatörü
- `picker`: Toplama Personeli
- `packer`: Paketleme Personeli
- `dispatcher`: Sevkiyat Personeli
- `driver`: Sürücü
- `operator`: Operatör
- `viewer`: Görüntüleyici

### Üyelik durumları

- `invited`: Davet Edildi
- `active`: Aktif
- `suspended`: Askıya Alındı
- `inactive`: Pasif

## warehouses

Firma hesabına bağlı fiziksel depo veya dağıtım merkezidir.

### Ana alanlar

- `account_id`: Firma hesabı
- `code`: Depo kodu
- `name`: Depo adı
- `description`: Açıklama
- `status`: Depo durumu
- `timezone`: Depo saat dilimi
- `address_line`: Açık adres
- `district`: İlçe
- `city`: Şehir
- `postal_code`: Posta kodu
- `country_code`: Ülke kodu
- `total_area_square_meters`: Toplam alan
- `usable_area_square_meters`: Kullanılabilir alan
- `maximum_pallet_capacity`: Azami palet kapasitesi
- `maximum_bin_capacity`: Azami lokasyon kapasitesi

### Depo durumları

- `draft`: Taslak
- `active`: Aktif
- `temporarily_closed`: Geçici Olarak Kapalı
- `inactive`: Pasif
- `archived`: Arşivlendi

## warehouse_locations

Depo içerisindeki fiziksel veya operasyonel stok adresidir.

### Hiyerarşi

- `zone_code`: Bölge
- `aisle_code`: Koridor
- `rack_code`: Raf
- `level_code`: Kat
- `bin_code`: Göz

### Lokasyon türleri

- `receiving`: Mal Kabul
- `quality_control`: Kalite Kontrol
- `reserve`: Rezerv Stok
- `picking`: Toplama
- `bulk`: Toplu Stok
- `cold_storage`: Soğuk Hava Deposu
- `hazardous`: Tehlikeli Madde Alanı
- `returns`: İade Alanı
- `damaged`: Hasarlı Ürün Alanı
- `packing`: Paketleme
- `shipping`: Sevkiyat
- `cross_dock`: Çapraz Sevkiyat

### Lokasyon durumları

- `empty`: Boş
- `available`: Kullanılabilir
- `reserved`: Rezerve
- `occupied`: Dolu
- `blocked`: Blokeli
- `maintenance`: Bakımda
- `inactive`: Pasif

## Güvenlik

Aşağıdaki tablolar için Row Level Security aktiftir:

- `warehouse_accounts`
- `warehouse_users`
- `warehouses`
- `warehouse_locations`

Kullanıcı erişimi şu yardımcı fonksiyonlarla doğrulanır:

- `warehouse_has_account_access`
- `warehouse_has_account_role`

## Rol bazlı temel yetkiler

### Firma sahibi ve yönetici

- Firma bilgilerini güncelleyebilir.
- Kullanıcı ekleyebilir ve güncelleyebilir.
- Depo oluşturabilir, güncelleyebilir ve silebilir.
- Lokasyon oluşturabilir, güncelleyebilir ve silebilir.

### Depo müdürü

- Depo oluşturabilir ve güncelleyebilir.
- Lokasyon oluşturabilir, güncelleyebilir ve silebilir.
- Üyelikleri görüntüleyebilir.

### Depo şefi ve stok sorumlusu

- Lokasyon oluşturabilir ve güncelleyebilir.

### Diğer aktif kullanıcılar

- Yetkili oldukları firma ve depo verilerini görüntüleyebilir.

## İndeksler

İlk migration aşağıdaki sorgu alanlarını indeksler:

- Kullanıcı ve üyelik durumu
- Firma, rol ve üyelik durumu
- Firma ve depo durumu
- Firma ve depo adı
- Depo ve lokasyon durumu
- Depo ve lokasyon türü
- Üst lokasyon
- Lokasyon hiyerarşisi

## Sonraki Veritabanı Aşamaları

- Ürün ve SKU
- Barkod
- Lot ve seri numarası
- Stok hareket defteri
- Stok bakiyesi
- Mal kabul
- Kalite kontrol
- Yerleştirme görevleri
- Sipariş ve toplama
- Paketleme
- Sevkiyat
- İade
- Denetim kayıtları
