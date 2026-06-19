# isteBul — Site sahibi tam paket

**Sürüm:** 1.0 · **Tarih:** 3 Haziran 2026

Bu dosya indirilebilir tek belgedir. Bölümler ayrı dosyalarda da mevcuttur.

---

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

---

# Bölüm 2 — Bilgilendirme broşürü (tek sayfa özeti)

**isteBul.com** · Yapay zekâ destekli karar platformu · 2026

---

## Ne sunuyoruz?

| | |
|---|---|
| **Problem** | İnsanlar araç, ev, tatil ve kredi kararlarını onlarca farklı sitede, parçalı ve duygusal veriyor. |
| **Çözüm** | Tek yerde: bütçe, toplam maliyet (TCO), risk ve uygunluk skoru — **açıklanabilir**, kopyalanabilir gerekçe ile. |
| **Fark** | İlan listesi veya sohbet botu değil; **karar altyapısı**. |

---

## Kim kullanır?

1. **Bireysel ziyaretçi** — Ücretsiz karar analizi başlatır; isteğe bağlı Pro (gelişmiş rapor).  
2. **İş ortağı** — Banka, galeri, sigorta, tatil acentesi: **skorlu, sıcak talep** webhook ile CRM’e düşer.

---

## Canlı dikeyler (durum: ~%90–95)

| Dikey | Adres | Durum |
|-------|--------|--------|
| **Otomotiv (Auto)** | `/auto/` | En olgun; karar motoru + lead |
| **Konut** | `/konut/` | Karar akışı hazır; canlı fiyat feed bekleniyor |
| **Tatil** | `/tatil/` | Senaryo ve lead yapısı hazır |
| **Finans** | `/finans/` | Hesaplayıcı + lead; canlı faiz bağlantısı bekleniyor |
| **Sigorta** | `/sigorta/` | Yol haritasında / kısmi |

**Önemli:** Pazarlama metninde “canlı banka faizi” veya “anlık ilan” **yalnızca** admin’de canlı veri modu açık ve feed bağlıysa söylenir. Aksi halde: *“Tahmini veri + kaynak doğrulaması”* ifadesi kullanılır.

---

## Gelir modeli (basit)

| Kaynak | Açıklama |
|--------|----------|
| **isteBul Pro** | Aylık / yıllık abonelik (Stripe / iyzico) |
| **Partner lead** | CPL veya kapasite bazlı — sözleşmeye göre |
| **İleride** | Premium rapor, affiliate finans |

---

## Güven ve uyum (kısa)

- KVKK aydınlatma ve çerez onayı site üzerinde  
- Finansal **tavsiye veya getiri taahhüdü yok**  
- AI skoru **değiştirmez** — yalnızca açıklama üretir  
- Partner veri paylaşımı **kullanıcı onayı** ile

---

## Sahibinin üç görevi

1. **İçerik ve güven** — Rehber yazıları, doğru dil, güncel iletişim  
2. **Lead ve partner** — CRM takibi, başvurulara hızlı dönüş  
3. **Dürüst pazarlama** — Canlı veri iddiasını feed’e bağlama

---

## Faydalı linkler

- Ana site: https://www.istebul.com  
- Metodoloji: https://www.istebul.com/metodoloji/  
- Planlar: https://www.istebul.com/planlar  
- Partner: https://www.istebul.com/partner-olun.html  
- Admin: https://www.istebul.com/admin-panel.html  

---

*Broşürü PDF yapmak için [ISTEBUL-SITE-SAHIBI-TAM-PAKET.html](./ISTEBUL-SITE-SAHIBI-TAM-PAKET.html) dosyasını yazdırın.*

---

# Bölüm 3 — Siteyi tanıtma ve pazarlama rehberi

---

## 1. Konumlandırma (her kanalda aynı cümle)

**Türkçe (ana):**  
*“isteBul, yüksek tutarlı alımlarda toplam maliyet ve riski tek panelde gösteren karar platformudur — ilan sitesi değil.”*

**İngilizce (uluslararası):**  
*“isteBul is decision infrastructure for high-stakes purchases — TCO, fit, and explainable scoring, not classifieds.”*

### Kullanın ✓

- Karar rehberi, TCO, bütçe planı, şeffaf skor  
- “Ücretsiz analiz başlat”  
- Metodoloji sayfasına link  

### Kullanmayın ✗

- “En ucuz araç burada”  
- “Garanti tasarruf / garanti kazanç”  
- “Son dakika”, “flaş fırsat” (haber sitesi imajı)  
- Rakip ismiyle aşağılayıcı karşılaştırma  

---

## 2. Hedef kitle ve mesaj

| Kitle | Acı noktası | Mesaj |
|-------|-------------|--------|
| Araç alıcısı | Kredi + yakıt + sigorta karmaşası | “5 yıllık gerçek maliyeti gör, sonra karar ver” |
| Ev alıcısı | Taksit + aidat + ilçe maliyeti | “Ödeme yükünü ve lokasyon riskini birlikte oku” |
| Tatil planlayan | Bütçe aşımı | “7 günlük senaryo ile gitmeden önce netleştir” |
| Kredi araştıran | Faiz karşılaştırması dağınık | “Nakit akışına göre vade senaryosu” |

**CTA (harekete geçirici):** Her paylaşımda tek link — örn. `https://www.istebul.com/auto/` veya `/konut/`.

---

## 3. Kanal planı (bütçesiz başlangıç)

### 3.1 SEO ve içerik (en yüksek ROI)

- Haftada **1 karar rehberi** (admin Blog → Yayınla)  
- Başlık formülü: `[Yıl] + [Konu] + karar / maliyet / rehber`  
  - Örnek: *“2026 taşıt kredisi faizleri — aylık yük tablosu”*  
- Her yazının sonunda ilgili dikeye CTA (`/auto/`, `/konut/` …)

### 3.2 Sosyal medya

| Platform | İçerik tipi | Sıklık |
|----------|-------------|--------|
| LinkedIn | Metodoloji, TCO infografik, partner hikâyesi | 2–3 / hafta |
| Instagram / X | Kısa ipucu + ekran görüntüsü (skor paneli, blur kişisel veri) | 3–5 / hafta |
| YouTube (ileri) | 3 dk “Auto karar turu” demo | Ayda 1 |

### 3.3 Topluluk ve güven

- Otomotiv / emlak forumlarında **reklam değil**, rehber linki ile yardım  
- E-posta bülteni: çerez onayı + açık rıza sonrası (KVKK)

### 3.4 Ücretli reklam (bütçe varsa)

- Google: “araç toplam maliyet”, “taşıt kredisi hesaplama” — **karar** kelimeleri  
- Meta: lookalike — henüz yeterli pixel verisi yoksa erken açmayın  
- Dönüşüm hedefi: analiz başlatma, değil sadece tıklama

---

## 4. Lansman ve “canlı veri” sonrası

**Şu an (%90–95):**  
- “Karar platformu beta / erken erişim” dili uygun  
- “Tüm bankalar canlı” **demeyin**

**Canlı feed bağlandıktan sonra:**  
- Admin → Ayarlar → Canlı sağlayıcı modu **açık**  
- Metin: *“Seçili veriler canlı kaynaktan güncellenir”* + kaynak adı (sözleşmeye uygun)  
- Basın notu: metodoloji + partner pilotu

---

## 5. Basın / influencer kısa not

**Başlık:** isteBul, ilan sitelerine alternatif değil — karar zekâsı  
**3 madde:**  
1. Kural tabanlı skor + AI yalnızca açıklama  
2. Otomotivde TCO ve lead altyapısı canlı  
3. Konut, tatil, finans genişlemesi  

**Demo:** 5 dakikalık Auto wizard kaydı (ekran kaydı, kişisel veri yok).

---

## 6. Ölçüm (başarı sayısı)

| Metrik | Nereden | Hedef (ilk 90 gün örnek) |
|--------|---------|---------------------------|
| Haftalık ziyaret | Platform analitik / Plausible | Trend ↑ |
| Analiz başlatma | Auto analitik | Huni %5+ |
| Lead | Lead CRM | Haftalık 10+ (pazara göre) |
| Partner pilot | Başvurular | 2 imzalı pilot |

---

## 7. Marka varlıkları

- Logo: `/assets/brand/` (geliştirici paketinden)  
- Renk: mavi ton (#2563eb) — admin ve site ile uyumlu  
- Hashtag öneri: `#KararVeristeBul` `#TCO` (tutarlı kullanın)

---

*Partner ve canlı veri görüşmeleri: [04-canli-veri-is-ortakligi.md](./04-canli-veri-is-ortakligi.md)*

---

# Bölüm 4 — Canlı veri ve iş ortaklığı rehberi

Bu bölüm, sitenin **%90–95 tamamlanmış** olup yalnızca **canlı veri bağlantılarının** eksik olduğu aşamada iş geliştirme ve görüşme disiplinini anlatır.

---

## 1. “Canlı veri” ne demek?

| Tür | Örnek | Kim bağlar |
|-----|--------|------------|
| **Piyasa verisi** | Faiz oranı, katalog fiyatı, sigorta bandı | Teknik ekip + veri sağlayıcı API |
| **Operasyonel veri** | Lead, ödeme, analitik | Zaten Supabase’de; panelden izlenir |
| **Partner teslimatı** | Webhook ile CRM’e skorlu JSON | Siz + partner IT + teknik ekip |

**Altın kural:** Admin’de **“Canlı sağlayıcı modu”** yalnızca gerçek feed çalışıyorsa açılır. Açıkken feed yoksa — yanıltıcı reklam riski.

---

## 2. Hangi ortaklıklar öncelikli?

### A) Veri ortakları (canlı rakam için)

| Sektör | Örnek kurumlar | Ne istenir |
|--------|----------------|------------|
| Finans / faiz | Hangikredi, banka open API | Güncel faiz veya teklif bandı |
| Otomotiv katalog | Üretici / aggregator API | Liste fiyatı, segment (read-only) |
| Sigorta | Dijital partner ekipleri | Prim bandı veya quote API |
| Konut | Emlak veri sağlayıcıları | Bölge ortalama (anonim istatistik) |

### B) Lead / gelir ortakları

| Sektör | Örnek | Değer |
|--------|--------|--------|
| Taşıt kredisi | Bankalar, dijital kredi | Skorlu, bütçeli talep |
| Sigorta / kasko | Allianz, Anadolu, Quick… | Yüksek niyet cross-sell |
| Galeri / 2. el | Bayi zincirleri | Karar sonrası yönlendirme |
| Tatil | OTA, acente | Senaryolu bütçe lead |

### C) Ödeme (Türkiye)

- **iyzico** (öncelik), PayTR, Param — Pro abonelik tahsilatı  
- Başvuru: şirket evrakları + site URL + faaliyet: *“yazılım / karar platformu”*

---

## 3. Görüşmeye nasıl hazırlanırsınız?

### 3.1 Çanta içeriği (dijital)

1. https://www.istebul.com/partner-docs.html  
2. https://www.istebul.com/partner-guven.html  
3. Admin **teslimat logları** ekran görüntüsü (test lead)  
4. Örnek JSON payload (dokümantasyondaki)  
5. Bu broşürün Bölüm 2 özeti (PDF)

### 3.2 Pilot teklif (standart)

- **İlk 5 hot lead ücretsiz**  
- Webhook HMAC + retry  
- KVKK özeti ve DPA süreci  
- **14 gün** hedef canlı entegrasyon (IT’ye bağlı)

---

## 4. Görüşme akışı (30 dakika)

| Dakika | Siz | Karşı taraf |
|--------|-----|-------------|
| 0–5 | Teşekkür + tek cümle konumlandırma | Dinler |
| 5–12 | Demo: Auto → skor → lead örneği (canlı veya kayıt) | Soru |
| 12–20 | Teknik: webhook, alanlar, KVKK onayı | IT / hukuk |
| 20–25 | Pilot şartları, SLA (≤15 dk dispatch Starter) | Ticari |
| 25–30 | Sonraki adım: NDA, test URL, kickoff tarihi | Takvim |

---

## 5. Ne söylemeli? (ortaklık türüne göre)

### Veri sağlayıcısına

> “Kullanıcılarımız karar verirken tahmin değil, **kaynak doğrulanmış** rakam görmek istiyor. Sizin API veya lisanslı feed’iniz skor motorumuzun ‘truth layer’ına girer; karşılığında trafik ve markalı kaynak gösterimi sunarız. İlan çekmiyoruz; karar sonrası yönlendirme yapıyoruz.”

**Sorulacak:** Sandbox URL, kota, fiyat, yenileme sıklığı, ticari kullanım lisansı.

### Banka / krediye

> “Form dolduran değil — **bütçe, araç tipi, finansman yükü ve skor** ile gelen talep. Hot öncelikli webhook; spam değil. Outcome geri bildirimi ile CPL’yi birlikte optimize ederiz.”

### Sigortaya

> “Kasko/trafik, TCO analizi sonrası — intent yüksek. Düşük skorlu talebi göndermeyebiliriz; itibar koruma.”

### Ödeme kuruluşuna (iyzico vb.)

> “SaaS abonelik; yüksek chargeback riski yok; KVKK ve iade politikası sitede yayında. Aylık tekrarlayan Pro hacmi hedefimiz [gerçekçi rakam].”

---

## 6. Ne söylememelisiniz?

- “Kesin onaylanır”, “garanti en düşük faiz”  
- “SOC2 sertifikalıyız” (yoksa)  
- “Sahibinden’in yerini alıyoruz” (agresif ve yanlış konum)  
- Henüz bağlı olmayan API için “canlı” iddiası  

---

## 7. Reddedilirse / ertelenirse

| Durum | Plan B |
|-------|--------|
| Büyük banka red | Dijital kredi fintech pilotu → referans |
| API yok | Geçici: güvenilir CSV + haftalık güncelleme (teknik) |
| Uzun hukuk süreci | Pilot MOU + anonim test verisi |

---

## 8. Teknik ekip için sizin iletmeniz gereken bilgi

Görüşme sonrası tek mesajda:

1. Kurum adı, muhatap, e-posta  
2. API doküman linki veya “e-posta lead”  
3. Ticari model (CPL, rev share, veri lisansı)  
4. Hedef `partner_route` adı (ör. `finance_garanti`)  
5. Hukuk: DPA imza durumu  

Teknik ekip: webhook, secret, admin kanal kaydı, UAT 10 lead.

---

## 9. 30 günlük geçiş (özet)

| Hafta | Odak |
|-------|------|
| 1 | Ödeme sandbox + deploy güveni |
| 2 | Lead + analitik 7 gün kesintisiz |
| 3 | İlk canlı feed + admin bayrak |
| 4 | 1 partner pilot + pazarlama onayı |

Detay teknik liste: repo içi `docs/LIVE_DATA_30DAY_CHECKLIST.md` (geliştirici ile paylaşın).

---

## 10. Başarı kriterleri

- [ ] En az 1 canlı feed admin’de kayıtlı ve test edildi  
- [ ] `live_providers_enabled` açık **ve** UI’da doğru etiket  
- [ ] 1 partner webhook %98+ 2xx  
- [ ] 1 outcome geri bildirimi (kazanıldı / kaybedildi)  
- [ ] Pazarlama metni hukuk + teknik ile uyumlu  

---

*Hazır konuşma metinleri: [05-konusma-sablonlari.md](./05-konusma-sablonlari.md)*

---

# Bölüm 5 — Konuşma şablonları (bireysel ve kurumsal)

Aşağıdaki metinleri **olduğu gibi** veya kendi tonunuza uyarlayarak kullanabilirsiniz.

---

## A) 30 saniye — asansör konuşması

> “isteBul, araçtan konuta yüksek tutarlı alımlarda **toplam maliyet ve riski** tek ekranda toplayan bir karar platformu. İlan sitesi değiliz; kullanıcı önce skor ve TCO görüyor, isterse Pro ile derinleşiyor. İş ortaklarımıza da **sıcak, skorlu talep** webhook ile gidiyor. Şu an otomotiv tarafı en olgun; canlı banka ve katalog verilerini partnerlerle tamamlıyoruz.”

---

## B) Bireysel kullanıcıya (arkadaş, müşteri, sosyal çevre)

**Soru:** Bu site ne işe yarıyor?

> “Büyük bir şey almadan önce — araba, ev, tatil — parçalı hesap yapmak yerine isteBul’da bütçeni ve **5 yıllık gerçek maliyeti** görüyorsun. Yapay zeka skoru değiştirmiyor; neden o skoru aldığını açıklıyor. Ücretsiz başlayabilirsin; link: istebul.com/auto”

**Soru:** Sahibinden gibi mi?

> “Hayır. Orada ilan listelersin; bizde **karar analizi**. İstersen sonra ilan sitesine gidersin; önce ‘bana uygun mu, taşıyabilir miyim?’ sorusuna cevap.”

**Soru:** Banka mısınız?

> “Hayır, finansal tavsiye vermiyoruz. Kredi **onayı bankanın**; biz nakit akışına göre senaryo gösteriyoruz.”

---

## C) Kurumsal / partner toplantısı — açılış

> “Merhaba, ben [isim] — isteBul’dan. Kısaca: yüksek tutarlı satın alma kararlarında **karar altyapısı** sunuyoruz. Sizin için değer önerimiz, form trafiği değil; **skorlu, bağlamlı talep** ve ölçülebilir CPL. Bugün 30 dakikada ürün demosu ve webhook pilotunu konuşmak istiyorum.”

---

## D) Kurumsal — sık itirazlar ve cevaplar

| İtiraz | Cevabınız |
|--------|-----------|
| “Fiyat listede yok” | “CPL kategori ve hacme göre değişir; Starter için referans bandı paylaşıyoruz. Önce **5 sıcak lead ücretsiz pilot** — sonra sözleşme.” |
| “Sahibinden zaten lead veriyor” | “Onlar envanter; biz **karar öncesi niyet**. Webhook’a hot skor ve TCO bağlamı gelir.” |
| “KVKK riskli” | “Açık rıza ile payload; DPA sürecimiz hazır. Güven sayfamızda iddia etmediğimiz sertifikaları da yazıyoruz.” |
| “Entegrasyon uzun” | “Self-serve 6 adım, hedef 14 gün; bugün HMAC testi yapabiliriz.” |
| “Düşünelim” | “Bu hafta pilot slotu koyalım; 5 lead riski düşük, ölçülebilir veri üretir.” |

---

## E) Yatırımcı / danışman (kısa)

> “isteBul, yüksek tutarlı kararlar için şeffaf skor motoru + partner marketplace. Auto canlı; Pro abonelik ve lead geliri var. Hibrit SaaS modeli; moat: kural tabanlı skor, dispatch OS ve çok dikey genişleme. Tur öncesi güncel KPI’yı admin Executive panelden paylaşırım — statik rakam taşımıyoruz.”

*(Detay: repo `docs/investor/ONE_PAGER.md` — teknik ekip export eder.)*

---

## F) Medya / etkinlik

> “Türkiye’de insanlar milyonluk kararları onlarca kaynaktan parçalı veriyor. isteBul bunu **tek karar panelinde** topluyor; yapay zeka skoru değil, **açıklanabilir gerekçe** üretiyor. Otomotivde canlıyız; konut ve finansman genişliyor. Demo için auto wizard’ı 5 dakikada gösterebilirim.”

---

## G) E-posta şablonları

### G.1 Soğuk partner e-postası

**Konu:** Skorlu otomotiv talep — webhook pilot (isteBul)

Merhaba [İsim],

isteBul, araç alımında TCO ve uyum skoruna dayalı **karar platformu**. İlan listesi değil; nitelikli B2B lead, HMAC webhook ile CRM’inize düşer.

- Pilot: 5 hot lead ücretsiz  
- Dokümantasyon: https://www.istebul.com/partner-docs.html  
- Başvuru: https://www.istebul.com/partner-basvuru.html  

15 dakikalık teknik görüşme için uygun musunuz?

Saygılarımla,  
[Ad Soyad] · [telefon]

### G.2 Veri sağlayıcısı

**Konu:** Karar platformu — canlı veri iş birliği (isteBul)

Merhaba [İsim],

isteBul’da kullanıcılar yüksek tutarlı alımlarda TCO ve risk skoru görüyor. [Faiz / katalog / bölge] verinizi **kaynak göstererek** entegre etmek istiyoruz; karşılığında markalı atıf ve karar sonrası trafik yönlendirmesi konuşulabilir.

Kısa bir keşif görüşmesi için önümüzdeki hafta uygun musunuz?

### G.3 Takip (3 gün sonra)

Merhaba [İsim], isteBul pilot teklifimiz hakkında kısa bir hatırlatma. Webhook testi 30 dakika — bu hafta [gün] uygun mu?

---

## H) WhatsApp / kısa mesaj (bireysel paylaşım)

> “Araba veya büyük alım düşünüyorsan bir bak: istebul.com — toplam maliyeti ve skoru ücretsiz görüyorsun, ilan sitesi değil 👍”

---

## I) Toplantı kapanışı (sonraki adım)

> “Özet: [X] gün içinde NDA, [Y] tarihinde teknik kickoff, pilot 5 lead. Ben [e-posta] üzerinden partner-docs ve test endpoint bilgisini gönderiyorum. Sizden [IT kişisi] e-posta onayı yeterli.”

---

## J) Kontrol listesi — görüşme öncesi

- [ ] Demo veya kayıt hazır  
- [ ] partner-docs linki  
- [ ] Pilot şartları (5 lead, HMAC)  
- [ ] Canlı veri iddiası **doğru mu** (feed var mı?)  
- [ ] Kartvizit / imza: istebul.com  

---

*LinkedIn yorum ve etkileşim: [06-linkedin-etkilesim-rehberi.md](./06-linkedin-etkilesim-rehberi.md)*

---

# Bölüm 6 — LinkedIn yorum ve etkileşim rehberi

Bu bölümün tam metni ayrı dosyada yer alır:

→ [06-linkedin-etkilesim-rehberi.md](./06-linkedin-etkilesim-rehberi.md)

---

*Tüm bölümler tek dosyada: [ISTEBUL-SITE-SAHIBI-TAM-PAKET.md](./ISTEBUL-SITE-SAHIBI-TAM-PAKET.md)*

---

