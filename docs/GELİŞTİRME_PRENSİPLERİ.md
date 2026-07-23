# İSTEBUL — Geliştirme Prensipleri

**Belge türü:** Platform Foundation Charter (PR-000)  
**Kapsam:** Mimari ve süreç standartları (uygulama kodu değişikliği içermez)  
**Dil:** Resmî geliştirme dokümantasyonu Türkçe’dir.

---

## 1. Platform vizyonu

İSTEBUL tek bir ürün değildir.

İSTEBUL; yapay zekâ destekli dijital ürünler geliştiren bir **teknoloji platformudur**.

Platform altında **bağımsız ürünler** bulunur:

| Ürün | Tanım |
|------|--------|
| **İSTEBUL AI** | Yapay zekâ destekli karar verme platformu (çok dikeyli karar akışları). |
| **GarsonAI** | Yapay zekâ destekli Restoran İşletim Sistemi. |
| **Business** | İş Zekâsı ve işletme yönetim platformu. |

İSTEBUL yalnızca **ortak platform markasıdır**. Hiçbir ürün diğerinin alt modülü değildir.

Hedef uzun vadeli durum:

- Ana alan adı (`istebul.com`) kullanıcıyı doğru ürüne yönlendiren **Platform Landing** görevi görür.
- Her ürün kendi girişi, kendi yönetim paneli, kendi kullanıcı yaşam döngüsü ve kendi geliştirme hızıyla yaşar.
- Ürünler birbirinin içine taşınmaz; yönetimler birleştirilmez.

---

## 2. Mimari prensipler

1. **Ürün sınırları serttir.** Kod, veri modeli, admin yüzeyi ve dağıtım artefaktları ürün bazında izole tutulur.
2. **Bağımlılık yönü kontrollüdür.** Ürün → paylaşılan platform katmanı (marka, tasarım token’ları, ileride ortak altyapı) serbest; ürün → başka ürün **yasaktır** (istisna: açıkça onaylı, salt okunur marka/legal linkleri).
3. **Tam sayfa ürün yüzeyleri korunur.** GarsonAI (`/garson/…`), Business (`/business/`), AI dikey kabukları (`/auto/`, `/konut/`, …) bağımsız girişlerdir.
4. **Değişiklik yüzeyi küçük tutulur.** Tek PR tek endişe; geniş yeniden platformlama ürün sahibi onayı olmadan yapılmaz.
5. **Geriye dönük uyumluluk varsayılandır.** Canlı URL’ler, bookmark’lar ve SEO canonical’ları bilinçli geçiş planı olmadan kırılmaz.
6. **Güvenlik ve gizlilik ürünler arası sızdırmaz.** Bir ürünün oturumu, verisi veya yönetici yetkisi başka ürüne varsayılan olarak taşınmaz.
7. **Deploy ve üretim operasyonu bilinçlidir.** Üretim deploy, workflow, migration ve gizli anahtar değişiklikleri açık insan onayı ister (`AGENTS.md` ile uyumlu).

---

## 3. Ürün bağımsızlığı

### 3.1 Zorunlu bağımsızlıklar

| Alan | Kural |
|------|--------|
| Mimari | Her ürün kendi kabuğu, kendi paket/bundle sınırı ve kendi runtime’ı ile gelişir. |
| Yönetim paneli | Paneller birleştirilmez; tek “süper admin” ürünü oluşturulmaz. |
| Kullanıcı sistemi | Ortak kimlik zorlanmaz; ileride ortak kimlik yalnızca **opsiyonel platform hizmeti** olarak tasarlanabilir. |
| Geliştirme süreci | Ayrı backlog, ayrı test yüzeyi, ayrı sürüm notları tercih edilir. |
| Veri | Şema ve tenant sınırları ürün bazında net tutulur; çapraz ürün yazma yok. |

### 3.2 Paylaşılabilir alanlar (ve yalnızca bunlar)

Ortak katmana aday olanlar:

- Marka (logo, wordmark, temel görsel kimlik)
- Tasarım sistemi (token’lar, tipografi, erişilebilirlik tabanı)
- Kimlik doğrulama (**ileride**, gerekirse ve ürün onayıyla)
- Lisanslama
- Abonelik
- Bildirim altyapısı
- Ortak UI bileşenleri (sunum katmanı; iş kuralı taşımaz)

Paylaşım kuralı: ortak kod **iş mantığı içermez**; ürün karar motorları, sipariş/rezervasyon kuralları, skorlama vb. üründe kalır.

### 3.3 Yasak birleştirme örnekleri

- GarsonAI panel + İSTEBUL AI admin-panel tek arayüz
- Business modüllerinin AI karar dikeyi içine gömülmesi
- “Tek kullanıcı tablosu = tüm ürünler” varsayılanı
- Bir ürünün CSS/JS bundle’ının başka ürün landing’ine zorunlu bağlanması

---

## 4. Tasarım ilkeleri

1. **Marka önce.** Platform ve ürün yüzeylerinde isteBul / ürün adı güçlü görünür; jenerik “başka markaya uyar” hissi vermez.
2. **Tek iş / tek bölüm.** Landing ve pazarlama yüzeylerinde karmaşık panolar, gereksiz kart kümeleri ve ikincil metrik şeritleri varsayılan değildir.
3. **Ürün tasarım sistemi saygı görür.** GarsonAI’nin kendi DS’i (`garsonai-*`) ile İSTEBUL AI DS’i (`istebul-design-system-*`) birbirine zorla karıştırılmaz.
4. **Erişilebilirlik.** Kontrast, klavye odağı, anlamlı etiketler ve mobil kullanılabilirlik kalite kapısının parçasıdır.
5. **Performans bilinci.** Platform Landing ince kalır; ürün bundle’ları (ör. `homepage.bundle`, `app.js`, Garson admin) platform hub’ına çekilmez.
6. **Mevcut tasarım sistemine uyum.** Var olan ürün yüzeyi üzerinde çalışırken o ürünün dilini bozmadan ilerlenir; paralel “yeniden tasarım motoru” üretilmez.

Detaylı UI terimleri için: [`TÜRKÇE_TERİM_STANDARTLARI.md`](./TÜRKÇE_TERİM_STANDARTLARI.md).

---

## 5. Türkçe dil politikası

Bu proje **Türkçe odaklı** geliştirilir.

| Katman | Politika |
|--------|----------|
| Kullanıcıya görünen metin | Türkçe (ekran, buton, boş durum, hata, e-posta şablonu, pazarlama) |
| Resmî ürün / süreç dokümantasyonu | Türkçe (bu charter ve platform mimarisi dahil) |
| Teknik zorunluluk | İngilizce kabul: HTTP başlıkları, üçüncü parti API alan adları, protokol terimleri, mevcut kod tanımlayıcıları |
| Kod tanımlayıcıları | Mevcut depo standardı korunabilir (`camelCase` dosya/sınıf adları vb.); **UX metni Türkçe kalır** |

Örnek zorunlu karşılıklar: Dashboard → **Kontrol Paneli**, Settings → **Ayarlar**, Analytics → **Analizler**. Tam tablo: [`TÜRKÇE_TERİM_STANDARTLARI.md`](./TÜRKÇE_TERİM_STANDARTLARI.md).

Yeni kullanıcı metni ekleyen her PR, terim sözlüğüne aykırı İngilizce UI etiketi getirmemelidir.

---

## 6. Kod standartları

> Bu madde standartları tanımlar; PR-000 kapsamında mevcut modüllerde kod değişikliği yapılmaz.

1. **Okunabilirlik önce.** Küçük, odaklı diff; spekülatif soyutlama yok.
2. **ES modülleri (tarayıcı).** `js/` altında tarayıcı kodu ES module kalır; mevcut build (`scripts/production-build.cjs`) sözleşmesine uyulur.
3. **Sırlar.** Anahtar / token commit edilmez; yalnızca değişken **adları** dokümante edilir (`.env.example`).
4. **Konsol gürültüsü.** Üretim `js/` kaynaklarında gereksiz `console.log` eklenmez (`docs/contributing.md` ile uyumlu).
5. **Test disiplini.** Dokunulan alan için birim / smoke / ilgili e2e çalıştırılır; geçme-sayısı ezberlenmez — komut çalıştırılır (`AGENTS.md`).
6. **Paket yönetimi.** Kilit dosyası (`package-lock.json`) kaynak doğruluğudur; temiz kurulumda `npm ci`.
7. **Ürün sınırı denetimi.** PR açıklamasında etkilenen ürün(ler) açıkça yazılır; çapraz ürün import’u gerekçesiz kabul edilmez.
8. **Node sürümü.** `package.json` `engines` (≥20) korunur.

---

## 7. PR standartları

1. **Tek endişe.** Platform charter, özellik, refactor ve deploy ayrı PR’larda tutulur.
2. **İnsan inceleme kapısı.** Önemli değişikliklerde self-merge / “ready” işaretleme / prod deploy yapılmaz.
3. **Dokunulmaz alan saygısı.** Karantina veya “no-touch” PR/ürün talimatı varsa o alana dokunulmaz.
4. **Kontrol listesi (özet):**
   - [ ] Etkilenen ürün(ler) belirtildi
   - [ ] Başka ürün admin/panel/auth’una sızma yok
   - [ ] Kullanıcı metni Türkçe ve terim sözlüğüne uyumlu
   - [ ] Route / API / migration gerekçesiz değişmedi
   - [ ] İlgili testler çalıştırıldı
   - [ ] Geri alma (rollback) yolu düşünüldü
5. **Açıklama dili.** PR başlığı ve gövdesi ekip içinde Türkçe veya mevcut depo geleneğine uygun netlikte yazılır; kullanıcı etkisi Türkçe tarif edilir.
6. **Şablon.** Varsa depo PR şablonu / checklist’leri doldurulur.

---

## 8. Geriye dönük uyumluluk

1. Canlı path’ler (`/`, `/garson/`, `/business/`, AI dikeyleri, SPA karar rotaları) bilinçsizce kırılmaz.
2. URL değişikliği gerekiyorsa: önce paralel yüzey, sonra yönlendirme matrisi, sonra kesim (cutover) — tek adımda “büyük patlama” yok.
3. `_redirects` SPA fallback (`/* → /index.html`) değişimleri SEO ve deep-link riski taşır; ayrı plan + test ister.
4. Veri / auth sözleşmeleri genişletilirken eski istemciler için geçiş süresi veya uyumlu okuma tercih edilir.
5. Paylaşılan marka/legal sayfaları tüm ürünlerin escape-hatch linkidir; kaldırılırken ürün etkileri taranır.

---

## 9. Yasaklı değişiklikler

Aksi ürün sahibi / platform sahibi tarafından **açıkça onaylanmadıkça** yasaktır:

| Yasak | Açıklama |
|-------|---------|
| Admin birleştirme | Ürün panellerini tek panele indirgeme |
| Zorunlu ortak kullanıcı | Tüm ürünleri tek auth’a kilitleme |
| Ürünü alt modüle indirme | GarsonAI / Business / AI’yi birbirinin “feature folder”ı yapma |
| Gerekçesiz route rewrite | Özellikle `/` ve ürün girişleri |
| Drive-by backend | `functions/`, Supabase migration, prod binding |
| İş kuralı kaydırma | Skorlama, rezervasyon, sipariş, ERP kurallarını “ortak katmana” taşıma |
| Mega CSS / Results yeniden platformlama | Onaysız geniş tasarım/engine rewrite (`AGENTS.md`) |
| Force-push / geçmiş rewrite | Paylaşılan dallarda |
| Üretim deploy | Deploy komutları ve workflow tetikleme |

**PR-000 özel kilidi:** Bu charter PR’sinde çalışan modül, route, API, veritabanı ve iş mantığı değiştirilmez; yalnızca standart dokümanlar eklenir.

---

## 10. İlgili belgeler

| Belge | Rol |
|-------|-----|
| [`PLATFORM_MİMARİSİ.md`](./PLATFORM_MİMARİSİ.md) | Platform yapısı, klasörler, yönlendirme, yol haritası |
| [`TÜRKÇE_TERİM_STANDARTLARI.md`](./TÜRKÇE_TERİM_STANDARTLARI.md) | UI terim sözlüğü |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Mevcut çalışma zamanı yüzeyleri (teknik özet) |
| [`AGENTS.md`](../AGENTS.md) | Verimli ajan / geliştirici güvenlik kuralları |
| [`contributing.md`](./contributing.md) | Katkı akışı ve kalite kapıları |

---

## 11. Belge sahipliği

- **Sahip:** Platform / Principal Architect  
- **Güncelleme:** Prensip değişikliği ayrı PR; sessiz drift yok  
- **Çelişki:** Bu charter ile özellik PR’ı çelişirse charter önceliklidir; istisna yazılı onay ister
