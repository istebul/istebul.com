# Bölüm 1 — Site sahibi kullanım kılavuzu

**Kim için:** Teknik bilgisi olmayan kurucu, işletme sahibi veya operasyon sorumlusu  
**Site:** https://www.istebul.com · **Yönetim paneli:** https://www.istebul.com/admin-panel.html

---

## 1. Bu site nedir? (30 saniyelik özet)

isteBul, **ilan sitesi değil**; araç, konut, tatil ve finansman gibi yüksek tutarlı alımlarda **toplam maliyet (TCO), risk ve uygunluk** analizi sunan bir **karar platformudur**. Ziyaretçi ücretsiz analiz başlatır; isteğe bağlı **isteBul Pro** aboneliği ve **iş ortaklarına skorlu talep (lead)** ile gelir oluşur.

Sizin günlük işiniz: içerik ve duyuruları güncellemek, gelen talepleri takip etmek, partner başvurularını yanıtlamak, sayıları okumak — **kod yazmadan** admin panel üzerinden.

---

## 2. İlk giriş ve güvenlik

| Adım | Ne yapın |
|------|----------|
| 1 | Tarayıcıda `admin-panel.html` adresini açın |
| 2 | Kurucu e-posta ve şifre ile giriş yapın (hesap geliştirici tarafından `admin` rolü ile açılmış olmalı) |
| 3 | Şifreyi kimseyle paylaşmayın; mümkünse **2 kişilik** erişim: siz + operasyon |
| 4 | Çıkış: sol alttaki oturumu kapatın (ortak bilgisayarda özellikle) |

**Sizin yapmayacağınız şeyler:** Cloudflare, Supabase, GitHub, API anahtarları — bunlar teknik ekip / geliştirici işidir. Panelde hata görürseniz ekran görüntüsü + tarih ile teknik desteğe iletin.

---

## 3. Admin panel haritası (sizin kullanacağınız menüler)

Aşağıdaki menüler **günlük / haftalık** işiniz için yeterlidir. “Startup operating”, “Exit / M&A” gibi bölümler strateji notlarıdır; zorunlu değildir.

### 3.1 Dashboard (ana ekran)

- **Ne gösterir:** Bugünkü lead sayısı, sistem uyarıları, kısa grafikler  
- **Ne zaman bakın:** Her sabah 5 dakika  
- **Hızlı işlemler:** Lead CRM, + Duyuru, + Kampanya, Ayarlar

### 3.2 Lead CRM (Auto)

- **Ne:** Araç karar sürecini tamamlayan kullanıcıların talepleri  
- **Sütunlar:** Skor, öncelik (hot / very_hot), bütçe, aşama, tahmini gelir  
- **Sizin işiniz:** Durumu güncellemek (görüşüldü, teklif, kazanıldı / kaybedildi), not eklemek  
- **Partner varsa:** “Gönder” veya otomatik webhook — partner kanalında tanımlıysa sistem gönderir; siz logları kontrol edin

### 3.3 Dikey leadler (Konut, Finans, Sigorta, Tatil)

- Auto dışı kategorilerde aynı mantık: liste → durum → not  
- Tatil için ayrı menü: destinasyon, partner, senaryo ayarları (seyahat sezonu öncesi güncellenir)

### 3.4 Partner işlemleri

| Menü | İşlev |
|------|--------|
| **Partner kanalları** | Banka, bayi, sigorta vb. webhook adresleri |
| **Başvurular** | `partner-olun` formundan gelen başvurular — onay / red |
| **Teslimat logları** | Lead partnera gitti mi, hata var mı |
| **Partner ops** | Özet KPI |

**Haftalık rutin:** Başvuruları 48 saat içinde yanıtlayın; kırmızı log satırlarını teknik ekibe iletin.

### 3.5 İçerik ve pazarlama (kod yok)

| Menü | Ne yaparsınız |
|------|----------------|
| **Blog / Güncel haberler** | Karar rehberi yazıları — taslak → gözden geçir → **Yayınla** |
| **Duyurular** | Sitede üst şerit / duyuru metni |
| **Kampanyalar** | Pro veya sezon kampanyası metni |
| **SSS** | Sık sorulan sorular |
| **Sayfa içerikleri** | Hakkımızda, iletişim metinleri (dikkatli düzenleyin) |

**İçerik kuralı:** “Garanti kazanç”, “en ucuz”, “son dakika flaş” dili kullanmayın. “Karar rehberi”, “TCO”, “bütçe planı” dili kullanın.

### 3.6 İlan / Ürünler

- Demo veya gerçek ürün kartları; çoğu sahibi için **düşük öncelik** (karar motoru ana ürün)

### 3.7 Analitik

| Menü | Soru |
|------|------|
| **Platform analitik** | Kaç kişi siteye geldi? (çerez onaylı) |
| **Auto analitik** | Araç hunisinde nerede düşüyor? |
| **Executive KPIs** | Yatırımcı / ortak toplantısı öncesi özet |

**Not:** Ziyaretçi çerez banner’ında **Kabul et** demezse sayılar düşük görünebilir — bu normaldir.

### 3.8 Ödemeler ve gelir

| Menü | İşlev |
|------|--------|
| **Payments** | iyzico / Stripe yapılandırma durumu (configured / eksik) |
| **Revenue** | Pro abonelik ve sipariş özeti |

**Sizin kontrolünüz:** Ödeme sağlayıcısı “configured” değilse Pro satışı çalışmaz — teknik ekibe “ödeme anahtarları” deyin.

### 3.9 Ayarlar (kritik)

- **Bakım modu:** Acil durumda siteyi geçici kapatır  
- **Ana sayfa kategorileri:** Auto, konut, tatil, finans, sigorta kartlarını aç/kapa  
- **Canlı veri:** `Canlı sağlayıcı modu` — **sadece gerçek API/feed bağlandıktan sonra** açın (aşağıda Bölüm 4)

---

## 4. Haftalık iş takvimi (öneri)

| Gün | Süre | Görev |
|-----|------|--------|
| Pazartesi | 15 dk | Dashboard + Lead CRM + kırmızı loglar |
| Salı | 30 dk | 1 blog/rehber yayınla veya taslak güncelle |
| Çarşamba | 15 dk | Partner başvuruları |
| Perşembe | 10 dk | Duyuru / kampanya gerekirse |
| Cuma | 20 dk | Platform analitik + haftalık not (Excel veya Notion) |

---

## 5. Acil durumlar

| Durum | Sizin adımınız | Teknik ekip |
|-------|----------------|-------------|
| Site açılmıyor | Cloudflare durumunu kontrol edin (telefon) | Deploy / DNS |
| Ödeme hatası | Payments ekran görüntüsü | iyzico / Stripe secret |
| Partner lead gitmiyor | Teslimat logları | Webhook URL, HMAC secret |
| Yanlış “canlı veri” iddiası | **Canlı veri modunu kapatın** | Feed URL bağlantısı |

---

## 6. Destek ve yasal sayfalar (sitede hazır)

- KVKK, gizlilik, çerez, kullanım şartları — hukuk danışmanı onayı olmadan metin değiştirmeyin  
- İletişim: `iletisim.html` — buradaki e-posta/telefon güncel olsun  
- Partner: `partner-olun.html`, `partner-docs.html`

---

## 7. Teknik ekibe ne zaman yazmalısınız?

Şunları **kendiniz çözemezsiniz** — yazın:

- Yeni partner webhook kurulumu  
- Canlı faiz / katalog API bağlantısı  
- Admin’de sürekli sarı “şema eksik” uyarısı  
- Domain, SSL, e-posta gönderimi (bildirimler)

Şablon mesaj: *“Tarih/saat, admin menü adı, ne yapmaya çalıştım, ekran görüntüsü, hata metni.”*

---

*Sonraki bölüm: [02-bilgilendirme-brosuru.md](./02-bilgilendirme-brosuru.md) · Tam paket: [ISTEBUL-SITE-SAHIBI-TAM-PAKET.md](./ISTEBUL-SITE-SAHIBI-TAM-PAKET.md)*
