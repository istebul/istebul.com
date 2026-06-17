# TÜBİTAK GO/NO-GO Decision — istebul.com

**Tarih:** 2026-06-17 (güncelleme: kurucu bilgisi eklendi)  
**Kaynak belgeler:** `docs/TUBITAK_READINESS_AUDIT.md`, `data/compliance/data-controller.json`, `docs/investor/FUNDRAISING_READINESS.md`, `README.md`  
**Kapsam:** Kurumsal uygunluk ve başvuru yolu — kod değişikliği yok

**Resmi TÜBİTAK notu:** Program şartları, çağrı takvimi, bütçe üst sınırları ve başvuru koşulları **resmi çağrı dokümanı ile ayrıca doğrulanmalı**. Bu belge codebase ve kurucu beyanına dayalı ön karar üretir; hukuki veya mali tavsiye değildir.

---

## 1. Yeni Kurucu Bilgisi

Kurucudan alınan güncel bilgi:

| Bilgi | Durum |
|-------|-------|
| Şirket kuruluşu | **Henüz kurulmadı** |
| LTD / A.Ş. | **Yok** |
| KOBİ beyannamesi | **Yok** |
| PRODİS kuruluş ön kaydı | **Yok** |
| E-imza | **Doğrulanmadı** |
| Ticaret sicil kaydı | **Doğrulanmadı** |

**Codebase ile uyum:** `data/compliance/data-controller.json` → `"legalForm": "Bireysel girişim / ticari faaliyet"` — kurucu beyanıyla tutarlı; şirket tescili yok.

### Programlar üzerindeki etki

| Program | Etki |
|---------|------|
| **1507** | Başvuru sahibi **KOBİ sermaye şirketi** olmalıdır (rapor §3.1). Şirket yok → **başvuru mümkün değil**. |
| **1501** | Başvuru sahibi **sermaye şirketi** olmalıdır (rapor §3.2). Şirket yok → **başvuru mümkün değil**. |
| **1711** | **Konsorsiyum zorunlu:** müşteri kuruluş + teknoloji sağlayıcı KOBİ + üniversite/kamu araştırma merkezi + YZE protokolü (rapor §3.3). Şirket yok → teknoloji sağlayıcı rolü de doldurulamaz → **başvuru mümkün değil**. |
| **1812 BiGG** | Erken aşama girişimcilik hattı; şirket kuruluşu öncesi veya bireysel aşamada değerlendirilebilir alternatif — **resmi çağrı dokümanı ile ayrıca doğrulanmalı**. Codebase’de `docs/investor/FUNDRAISING_READINESS.md` ve `data/investor/fundraising-readiness.json` bu hattı “1512 / 1812” olarak referans verir; kesin program no. ve şartlar danışmanla netleştirilmeli. |

---

## 2. Güncel Program Kararı

| Program | Bugünkü karar | Neden | İlk çözüm aksiyonu |
|---------|---------------|-------|-------------------|
| **1507** KOBİ Ar-Ge Başlangıç | **NO-GO** | KOBİ sermaye şirketi yok; PRODİS/e-imza/KOBİ beyannamesi yok | LTD veya A.Ş. kuruluşu + KOBİ beyannamesi + PRODİS ön kayıt |
| **1501** Sanayi Ar-Ge | **NO-GO** | Sermaye şirketi yok; mali tablo ve kurumsal Ar-Ge kapasitesi belgesi yok | Şirketleşme tamamlandıktan sonra değerlendir; önce 1507 |
| **1711** Yapay Zekâ Ekosistem | **NO-GO** | Şirket yok + müşteri kuruluş + teknoloji sağlayıcı + üniversite/kamu araştırma merkezi konsorsiyumu yok | Şirketleşme sonrası partner arayışı; YZE protokolü |
| **1812 BiGG** (girişimcilik) | **CONDITIONAL** | Teknik anlatı ve ürün olgunluğu codebase’de güçlü; kurumsal şartlar 1507’den farklı olabilir — **resmi çağrı dokümanı ile ayrıca doğrulanmalı** | Mali müşavir/TÜBİTAK danışmanı ile BiGG uygunluk ve başvuru zamanlaması araştır |

**Teknik taraf (değişmedi):** Ar-Ge anlatısı codebase’de kanıtlı — `js/engines/decision-consultant.js`, `docs/AI_DECISION_ENGINE.md`, 270 unit test (`docs/TUBITAK_READINESS_AUDIT.md` §2). Blokaj tamamen **kurumsal/idari**.

---

## 3. En Doğru Başvuru Sırası

Önerilen sıra (şirket kurulmadan bugün için):

| Sıra | Adım | Açıklama |
|------|------|----------|
| **1** | **1812 BiGG / girişimcilik hattı uygunluk araştırması** | Erken aşama alternatif; şirket öncesi başvuru imkânı **resmi çağrı dokümanı ile ayrıca doğrulanmalı**. Codebase hazırlığı: `docs/investor/FUNDRAISING_READINESS.md` (deck, finansal model, CV ekleri). |
| **2** | **LTD veya A.Ş. kuruluş kararı** | 1507/1501/1711 için zorunlu ön koşul. Unvan: `docs/investor/loi-template.md` → “isteBul Teknoloji A.Ş.” placeholder — **kurucudan doğrulanacak**. |
| **3** | **KOBİ / proje / personel / bütçe belgeleri** | KOBİ beyannamesi, Ar-Ge CV’leri, bütçe taslağı (`docs/TUBITAK_READINESS_AUDIT.md` §5 iş paketleri). |
| **4** | **1507 başvuru hazırlığı** | Şirketleşme + PRODİS + e-imza sonrası ilk ana hibe hedefi. AGY100/101 taslağı şirket öncesi hazırlanabilir. |
| **5** | **1711 müşteri kuruluş ve üniversite partner arayışı** | Uzun vadeli; Finans Teknolojileri öncelikli alan (rapor §3.3). Partner altyapısı codebase’de var (`supabase/functions/partner-callback/`) ama TÜBİTAK konsorsiyum rolleri atanmamış. |

**1501 konumu:** Sıra 4’ten sonra (1507 çıktıları veya Faz 2 olgunluğu sonrası).

---

## 4. 1507 İçin Şirketleşme Öncesi Hazırlık

Şirket kurulmadan yapılabilecek işler (codebase kanıtlı):

| Başlık | İçerik |
|--------|--------|
| **Ar-Ge problemi** | Yüksek tutarlı tüketici kararlarında (otomotiv, konut, finansman) parçalı veri kaynakları ve black-box AI önerileri; kullanıcı uygunluk, TCO ve riski tek panelde denetlenebilir biçimde göremiyor (`index.html` meta, `docs/investor/ONE_PAGER.md`). |
| **Teknik yenilik anlatısı** | Hibrit mimari: deterministik çok faktörlü skor (`js/engines/decision-consultant.js`) + halüsinasyon kontrollü LLM anlatım (`docs/AI_DECISION_ENGINE.md`, `functions/ai-proxy.js`); LLM skoru değiştiremez. |
| **İş paketi taslağı** | 5 WP — `docs/TUBITAK_READINESS_AUDIT.md` §5: veri mimarisi · unified skor motoru · XAI katmanı · güvenilirlik/test · pilot/ticarileşme. |
| **Bütçe taslağı** | Personel (yazılım + veri bilimi), bulut (Supabase/Cloudflare), LLM API, danışmanlık — rakamlar **kurucudan doğrulanacak**; `docs/investor/financial-model-template/` referans. |
| **Ekip ihtiyacı** | Minimum: 1 full-stack/Ar-Ge mühendisi, 1 veri/karar motoru uzmanı; isteğe bağlı akademik danışman (artı puan). SGK durumu **kurucudan doğrulanacak**. |
| **Çıktı / metrikler** | Unified decision consultant v2; XAI paneli; EVDS sınırlı etki entegrasyonu (`EVDS_MAX_DECISION_IMPACT_RATIO = 0.12` — `js/features/evds/evds-market-engine.js`); pilot: Auto + 1 dikey; regresyon test PASS. |
| **Riskler** | Şirket kuruluş gecikmesi → çağrı kaçırma; skor birleştirme borcu (`docs/PLATFORM_EXPANSION_ROADMAP.md` §1); canlı veri kapalı (`js/data/market-data.js` → `liveProvidersEnabled: false`). |
| **Ticarileşme planı** | Pro abonelik (Stripe) + partner lead geliri (`docs/investor/ONE_PAGER.md`); pilot partner LOI (`docs/investor/loi-template.md` şablonu). |

---

## 5. Kurucunun Mali Müşavir / Danışmanla Netleştireceği Sorular

1. **LTD mi A.Ş. mi** kurulacak? (1507 KOBİ uyumu ve ortaklık esnekliği açısından)
2. Kuruluş **tarihi** 1507/1501 başvuru takvimini etkiler mi? (Hangi çağrıya yetişilir?)
3. **KOBİ beyannamesi** şirket kuruluşundan ne kadar sonra alınabilir?
4. **E-imza** kim adına alınacak? (Kuruluş yetkilisi — PRODİS zorunluluğu)
5. **PRODİS kuruluş ön kaydı** şirket tescilinden hemen sonra mı yapılmalı?
6. **SGK’lı teknik personel** 1507 bütçesinde zorunlu mu, kaç kişi yeterli?
7. **Kurucu personel gideri** (kurucu maaşı) proje bütçesine yazılabilir mi?
8. **Yazılım lisansı / bulut / danışmanlık** giderleri nasıl bütçelenir ve faturalandırılır?
9. **1812 BiGG** başvurusu şirket kurulmadan yapılabilir mi? (Resmi şart — danışman doğrulamalı)
10. **BiGG yatırım / hisse** koşulları kabul edilebilir mi? (Kurucu tercihi)
11. BiGG sonrası **1507’ye geçiş** için ek şirketleşme adımı gerekir mi?
12. **Vergi levhası ve mali tablo** ilk başvuru için minimum hangi dönemi kapsamalı?
13. Şirket kuruluşu **İzmir** (`data/compliance/data-controller.json` adres) uygun mu, başka il tercih edilmeli mi?
14. **Ar-Ge indirimi / teşvik** ile TÜBİTAK hibesi birlikte nasıl planlanır?
15. **KOSGEB girişimcilik** destekleri BiGG/1507 ile çakışır mı, paralel başvurulabilir mi?

---

## 6. Final Karar

Şirket henüz kurulmadığı için bugün **1507, 1501 ve 1711 başvurusu yapılamaz (NO-GO)**. KOBİ sermaye şirketi, PRODİS ön kaydı, e-imza ve KOBİ beyannamesi olmadan TEYDEB programlarına başvuru mümkün değildir; 1711 için ayrıca konsorsiyum ve YZE protokolü gerekir. En doğru ilk adım, **1812 BiGG / girişimcilik hattı uygunluğunu mali müşavir veya TÜBİTAK danışmanı ile araştırmak** (resmi çağrı dokümanı ile ayrıca doğrulanmalı) ve **paralelde LTD/A.Ş. kuruluş hazırlığı yapmak**tır. Şirketleşme, PRODİS ve e-imza tamamlandıktan sonra **ilk ana hibe hedefi 1507** olmalı; 1501 ikinci faz, 1711 ise müşteri kuruluş ve üniversite partneri oluşana kadar bekletilmelidir. Şirket kurulmadan yapılabilecek tek anlamlı hazırlık: `docs/TUBITAK_READINESS_AUDIT.md` iş paketlerinden AGY100/101 taslağı, teknik ek ve bütçe çerçevesini tamamlamaktır.

---

*Son güncelleme gerekçesi: Kurucu beyanı — şirket henüz kurulmadı. Önceki sürümdeki “bireysel girişim / şirket durumu belirsiz” varsayımı bu bilgiyle netleştirildi.*
