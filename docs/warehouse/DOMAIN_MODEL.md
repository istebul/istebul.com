# WarehouseIQ Domain Modeli

## Temel Varlıklar

### Tenant

WarehouseIQ sistemini kullanan firma veya organizasyondur.

### Warehouse

Firmaya bağlı fiziksel depo, aktarma merkezi veya dağıtım merkezidir.

### Location

Depo içerisindeki fiziksel stok adresidir.

Lokasyon hiyerarşisi:

Depo → Bölge → Koridor → Raf → Kat → Göz

### Product

Ticari ürün ana kaydıdır.

### SKU

Ürünün stok tutma birimidir.

### Barcode

Bir SKU ile ilişkilendirilen barkod bilgisidir.

### Lot

Parti bazlı ürün izleme kaydıdır.

### Serial Number

Tekil ürün seri numarasıdır.

### Stock Movement

Stokta gerçekleşen tüm giriş, çıkış, transfer, rezervasyon ve düzeltme hareketlerini temsil eder.

### Stock Balance

Stok hareketlerinden hesaplanan güncel stok özetidir.

### Purchase Order

Tedarikçiden beklenen ürün siparişidir.

### Receiving

Depoya gelen ürünlerin kabul operasyonudur.

### Quality Inspection

Mal kabul veya stok sürecinde gerçekleştirilen kalite kontrol kaydıdır.

### Putaway Task

Kabul edilen ürünlerin uygun lokasyona yerleştirilme görevidir.

### Sales Order

Müşterinin ürün talebini temsil eden sipariştir.

### Picking Task

Sipariş ürünlerinin depo lokasyonlarından toplanma görevidir.

### Packing Task

Toplanan ürünlerin paketlenme işlemidir.

### Shipment

Paketlenen ürünlerin sevkiyat kaydıdır.

### Delivery

Sevkiyatın teslimat sonucudur.

### Return

Müşteri veya operasyon kaynaklı iade kaydıdır.

### Customer

Sipariş ve sevkiyatın ilişkilendirildiği müşteridir.

### Supplier

Ürünlerin tedarik edildiği firmadır.

### Vehicle

Sevkiyat operasyonunda kullanılan araçtır.

### Driver

Sevkiyat operasyonundan sorumlu sürücüdür.

### User

Sistemi kullanan kişidir.

### Role

Kullanıcının yetki grubudur.

### Audit Event

Kritik işlem ve değişikliklerin denetim kaydıdır.

## Stok Durumları

- `available`: Kullanılabilir
- `reserved`: Rezerve
- `blocked`: Blokeli
- `damaged`: Hasarlı
- `quarantine`: Karantina
- `in_transit`: Transferde
- `expired`: Son kullanma tarihi geçmiş

## Stok Hareket Türleri

- `receiving`
- `putaway`
- `transfer`
- `reservation`
- `unreservation`
- `picking`
- `packing`
- `shipping`
- `delivery`
- `return`
- `count`
- `adjustment`
- `damage`
- `scrap`

## Ana İlişkiler

Tenant:

- Birden fazla depoya sahiptir.
- Kullanıcılara sahiptir.
- Ürünlere sahiptir.
- Müşterilere sahiptir.
- Tedarikçilere sahiptir.

Warehouse:

- Lokasyonlara sahiptir.
- Mal kabul operasyonlarına sahiptir.
- Stok hareketlerine sahiptir.
- Toplama görevlerine sahiptir.
- Sevkiyatlara sahiptir.

Product:

- SKU kayıtlarına sahiptir.
- Barkodlara sahip olabilir.
- Lot ve seri numaralarıyla izlenebilir.
- Stok hareketlerine konu olur.

Sales Order:

- Sipariş satırlarına sahiptir.
- Toplama görevleri üretir.
- Paketleme görevleri üretir.
- Bir veya daha fazla sevkiyata dönüşebilir.
