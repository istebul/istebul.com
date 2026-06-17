# TÜBİTAK GO/NO-GO Decision — istebul.com

**Tarih:** 2026-06-17  
**Kaynak belgeler:** `docs/TUBITAK_READINESS_AUDIT.md`, `data/compliance/data-controller.json`, `docs/`, `README.md`, `CHANGELOG.md`, `package.json`, `.github/workflows/`  
**Kapsam:** Kurumsal uygunluk ve başvuru yolu netleştirmesi (kod değişikliği yok)

**Resmi TÜBİTAK notu (mevcut rapordan):** 1501/1507 için Türkiye’de yerleşik **sermaye şirketi** (şahıs şirketi/adi ortaklık başvuramaz); 1507 ek olarak **KOBİ** şartı taşır; başvurular **PRODİS** üzerinden **e-imza** ile yapılır; 1507 destek süresi **≤18 ay**; 1501 destek süresi **≤36 ay**; 1711 için **konsorsiyum zorunlu** (müşteri kuruluş + teknoloji sağlayıcı KOBİ + üniversite/kamu araştırma merkezi + YZE iş birliği). Bütçe üst sınırı, çağrı takvimi ve güncel şartlar **resmi çağrı dokümanı ile ayrıca doğrulanmalı**.

---

## 1. Nihai Ön Karar

| Soru | Karar |
|------|-------|
| **Bugün 1507 başvurusu yapılabilir mi?** | **NO-GO** |
| **Bugün 1501 başvurusu yapılabilir mi?** | **NO-GO** |
| **Bugün 1711 başvurusu yapılabilir mi?** | **NO-GO** |
| **En gerçekçi ilk hedef** | **1507** (2026/2 çağrısına kurumsal + proje hazırlığı) |
| **İkinci hedef** | **1501** (1507 çıktıları veya paralel olgunluk sonrası, 24–36 ay plan) |
| **Beklemeye alınacak hedef** | **1711** (konsorsiyum + YZE protokolü tamamlanana kadar) |

**Gerekçe (tek paragraf):** Teknik Ar-Ge anlatısı codebase’de güçlü (`docs/TUBITAK_READINESS_AUDIT.md` §2), ancak `data/compliance/data-controller.json` bireysel girişim kaydı TÜBİTAK sermaye şirketi şartıyla çelişiyor; PRODİS/e-imza/KOBİ/SGK kanıtı repoda yok; 1507/1501 2026/1 çağrısı kapanmış; 1711 çağrısı açık olsa da zorunlu konsorsiyum bileşenleri codebase’de bulunmuyor.

---

## 2. Blokajlar

| Blokaj | Etkilediği program | Codebase kanıtı | Kurucudan istenecek kanıt | Çözüm aksiyonu |
|--------|-------------------|-----------------|---------------------------|----------------|
| **Bireysel girişim kaydı (sermaye şirketi değil)** | 1507, 1501, 1711 | `data/compliance/data-controller.json` → `"legalForm": "Bireysel girişim / ticari faaliyet"` | Ticaret sicil gazetesi, şirket kuruluş/tescil belgesi (LTD veya A.Ş.) | LTD/A.Ş. kuruluşu veya mevcut şirket tescilinin doğrulanması; compliance dosyasının güncellenmesi (kurucu onayı sonrası) |
| **LTD/A.Ş. unvanı tutarsızlığı** | 1507, 1501, 1711 | `docs/investor/loi-template.md` → “isteBul Teknoloji A.Ş. (veya şirket unvanı)” vs `data-controller.json` bireysel | Güncel ticaret unvanı, vergi levhası | Hangi unvanın resmi olduğunu netleştir; tüm başvuru belgelerinde tek unvan kullan |
| **KOBİ statüsü kanıtı yok** | 1507 (zorunlu), 1711 (teknoloji sağlayıcı rolü) | Repoda KOBİ beyannamesi veya KOSGEB kaydı yok | KOBİ beyannamesi / KOSGEB KOBİ belgesi | KOBİ statüsünü doğrula; 1507 için ön koşul |
| **PRODİS kuruluş ön kaydı bilgisi yok** | 1507, 1501, 1711 | `docs/TUBITAK_READINESS_AUDIT.md` §6 — codebase dışı | PRODİS ön kayıt onay ekranı / evrak teslim kaydı | Hemen PRODİS ön kayıt başlat (çağrı beklemeden yapılabilir — rapor notu) |
| **E-imza / kuruluş yetkilisi bilgisi yok** | 1507, 1501, 1711 | Codebase’de yok | Kuruluş yetkilisi e-imza sahipliği | Yetkili adına e-imza temin et |
| **Müşteri kuruluş tanımlı değil** | 1711 (zorunlu) | Partner altyapısı var (`supabase/functions/partner-callback/`) ama TÜBİTAK müşteri kuruluşu yok | Banka/sigorta/otomotiv perakende LOI veya ön protokol | 1711 için müşteri kuruluş partneri bul |
| **Üniversite/kamu araştırma merkezi partneri yok** | 1711 (zorunlu), 1507/1501 (artı puan) | `docs/EXPANSION_STRATEGY_ROADMAP.md` — eğitim dikeyi ~0%; akademik partner kaydı yok | Üniversite lab/merkez iş birliği protokolü, danışman CV | 1711 için zorunlu partner ara; 1507 için isteğe bağlı danışman |
| **Ar-Ge personel / SGK kanıtı yok** | 1507, 1501, 1711 | `docs/HIRING_ARCHITECTURE.md` plan var; SGK/personel listesi yok | SGK bordro özeti, personel sözleşmeleri, CV’ler | Bütçede personel gideri için SGK’lı teknik kadro planla |
| **Proje bütçesi / mali tablo yok** | 1507, 1501 | `docs/investor/FINANCIAL_MODEL.md` yatırımcı modeli; TÜBİTAK bütçe taslağı yok | Son yıl mali tablo, bütçe tablosu taslağı | 1507 için ≤18 ay bütçe çıkar; 1501 için 24–36 ay ayrı plan |
| **1507/1501 çağrı penceresi kapalı (2026/1)** | 1507, 1501 | `docs/TUBITAK_READINESS_AUDIT.md` §3.1 — 30 Mart 2026 kapanış | Resmi çağrı takvimi (2026/2) | 2026/2 çağrısına (Tem–Ağu bandı — rapor tahmini) hazırlık |
| **1711 konsorsiyum + YZE protokolü eksik** | 1711 | `docs/TUBITAK_READINESS_AUDIT.md` §3.3 — konsorsiyumsuz başvuru alınmaz | YZE niyet beyanı/iş birliği protokolü, konsorsiyum sözleşmesi | Partner seti tamamlanana kadar 1711’i beklet |
| **Pilot müşteri LOI imzalı değil** | 1507, 1501 (güçlendirici), 1711 | `docs/investor/loi-template.md` şablon var; imzalı LOI yok | İmzalı partner/müşteri niyet mektubu | Auto dikeyinde ≥1 partner LOI kapat |

### Blokaj özeti (evet/hayır kontrol listesi)

| Kontrol | Codebase’de bulundu mu? |
|---------|-------------------------|
| legalForm bireysel girişim mi? | **Evet** — `data/compliance/data-controller.json` |
| LTD/A.Ş. bilgisi var mı? | **Hayır** (yalnızca LOI şablonunda “A.Ş.” placeholder) |
| KOBİ statüsü kanıtı var mı? | **Hayır** |
| E-imza / PRODİS ön kayıt bilgisi var mı? | **Hayır** |
| Müşteri kuruluş bilgisi var mı? | **Hayır** |
| Üniversite/kamu araştırma merkezi partneri var mı? | **Hayır** |
| Ekip CV / personel bilgisi var mı? | **Hayır** (plan dokümanları var, CV yok) |
| Bütçe / personel gideri çıkarılabilir mi? | **Kısmen** — teknik iş paketleri ve roadmap var; mali tablo ve personel maliyeti **kurucudan doğrulanacak** |

---

## 3. 1507 İçin Hazırlık Kararı

**1507’yi ilk hedef yapmak doğru mu?** **Evet.** Teknik kapsam 12–18 aya sığar; codebase’de kanıtlanmış Ar-Ge unsurları var; 1501’e göre bütçe ve süre beklentisi daha düşük; ilk TÜBİTAK deneyimi için uygun giriş programı.

| Başlık | Karar |
|--------|-------|
| **Uygunluk** | Teknik: **yüksek** (`js/engines/decision-consultant.js`, `docs/AI_DECISION_ENGINE.md`, 270 unit test). Kurumsal: **düşük** (sermaye şirketi + KOBİ doğrulanmalı). |
| **Eksik belgeler** | Şirket tescili, KOBİ beyannamesi, PRODİS ön kayıt, e-imza, mali tablo, Ar-Ge CV’leri, AGY100/101 taslağı, bütçe tablosu |
| **Önerilen proje adı** | *Yüksek tutarlı tüketici kararları için açıklanabilir yapay zekâ destekli çok faktörlü karar destek sisteminin geliştirilmesi* (`docs/TUBITAK_READINESS_AUDIT.md` §4, öneri #1) |
| **Önerilen süre** | **15–18 ay** (resmi üst sınır ≤18 ay — rapor notu; kesin süre çağrı dokümanı ile doğrulanmalı) |
| **Önerilen ana çıktı** | Unified decision consultant v2 + XAI katmanı + EVDS sınırlı etki entegrasyonu + pilot (Auto + 1 dikey) |
| **Başvuruya kadar tamamlanması gereken 10 iş** | 1) LTD/A.Ş. durumunu netleştir · 2) KOBİ beyannamesi · 3) PRODİS ön kayıt · 4) E-imza · 5) AGY100/101 taslak form · 6) 5 iş paketi + Gantt (`docs/TUBITAK_READINESS_AUDIT.md` §5) · 7) Bütçe tablosu (personel + donanım/yazılım) · 8) Ar-Ge personeli CV’leri · 9) Teknik ek (mimari diyagram: `docs/ARCHITECTURE.md`) · 10) ≥1 pilot partner LOI |

---

## 4. 1501 İçin Hazırlık Kararı

| Başlık | Değerlendirme |
|--------|---------------|
| **1507’ye göre avantaj** | Bütçe üst sınırı yok (rapor notu); 24–36 ay ile çok dikey roadmap (`docs/PLATFORM_EXPANSION_ROADMAP.md`) tam kapsanabilir; KOBİ şartı yok |
| **1507’ye göre risk** | Daha yüksek proje yönetimi ve endüstriyel Ar-Ge beklentisi; ürün olgunluğu Auto ağırlıklı (sigorta ~35%, eğitim ~0%); kurumsal Ar-Ge kültürü ve mali kapasite daha sıkı incelenir |
| **Mevcut codebase kapsamı kaldırıyor mu?** | **Kısmen.** 64 migration, 35 edge function, AI listings stack (`supabase/functions/_shared/ai-listings/`) geniş Ar-Ge konusu sunar; ancak canlı veri kapalı (`js/data/market-data.js`), CRM yalnızca Auto (`docs/PLATFORM_EXPANSION_ROADMAP.md` §1), skorlama birleşmemiş — 1501 anlatısı için fazlar halinde sunulmalı |
| **Hangi fazdan sonra başvurulmalı?** | **1507 projesi tamamlandıktan veya en az Faz 2’ye ulaşıldıktan sonra** (unified scoring + ≥2 dikey intake + pilot outcome verisi). Alternatif: 1507 ile paralel hazırlık, 1507 onayı sonrası 1501 başvurusu |

**Karar:** 1501 **ikinci hedef**; ilk başvuru için erken. 1507 çıktıları ticarileşme ve ölçek kanıtı sağlar (1501 değerlendirmesinde geçmiş TÜBİTAK projesi +5–10 puan — rapor notu).

---

## 5. 1711 İçin Hazırlık Kararı

| Başlık | Değerlendirme |
|--------|---------------|
| **En yakın öncelikli alan** | **Finans Teknolojileri** — EVDS entegrasyonu (`data/seo/data-sources-page.json`), finansman dikeyi, TCO/finansman yükü skorları (`docs/investor/ONE_PAGER.md`). İklim/sürdürülebilirlik: zayıf (yalnızca AFAD deprem katmanı, prod’da kapalı). Akıllı eğitim: uyumsuz (~0% olgunluk). |
| **Müşteri kuruluş kim olabilir?** | Banka, sigorta şirketi, otomotiv finansman kuruluşu veya büyük bayi zinciri — **kurucudan doğrulanacak**; codebase’de partner webhook altyapısı var (`supabase/functions/partner-callback/`) ama TÜBİTAK müşteri rolü atanmamış |
| **isteBul teknoloji sağlayıcı olabilir mi?** | **Evet, en doğal rol.** Kendi karar motorunu geliştirmiş (`js/engines/decision-consultant.js`, `docs/P3_MOAT_ARCHITECTURE.md`); KOBİ statüsü + sermaye şirketi şartı sağlanırsa teknoloji sağlayıcı KOBİ olarak konsorsiyuma girebilir |
| **Üniversite/kamu araştırma merkezi gerekir mi?** | **Evet, zorunlu** (rapor §3.3). Repoda akademik partner kaydı yok |
| **YZE niyet beyanı / iş birliği sözleşmesi blokaj mı?** | **Evet, kritik blokaj.** Proje önerisi ekinde sunulması beklenir; protokol süreci zaman alır |
| **Partner yoksa karar NO-GO mu?** | **Evet.** Konsorsiyum kurulmadan başvuru değerlendirmeye alınmaz (rapor §3.3). 2026 çağrısı 15 Haziran – 18 Eylül 2026 açık olsa da, partner seti olmadan **bugün NO-GO** |

**Karar:** 1711’i **beklemeye al**; konsorsiyum oluşmadan kaynak ayırma. Paralelde müşteri kuruluş + üniversite görüşmeleri başlatılabilir; hazır olunca bir sonraki 1711 çağrısına başvur.

---

## 6. Kurucunun Cevaplaması Gereken Sorular

1. Şirket **LTD veya A.Ş** olarak tescilli mi? (Evet/Hayır — unvan nedir?)
2. Ticari faaliyet hâlâ **bireysel girişim** statüsünde mi? (`data-controller.json` doğru mu?)
3. **KOBİ beyannamesi** veya KOSGEB KOBİ belgesi var mı? (Evet/Hayır)
4. **PRODİS kuruluş ön kaydı** yapıldı mı? (Evet/Hayır — tarih?)
5. Kuruluş yetkilisinde geçerli **e-imza** var mı? (Evet/Hayır)
6. **SGK’lı teknik personel** (yazılım/veri bilimi) var mı? Kaç kişi?
7. Ar-Ge personeli için güncel **CV** hazır mı? (Evet/Hayır — kaç kişi?)
8. Son yıl **mali tablo** TÜBİTAK başvurusuna uygun mu? (Evet/Hayır)
9. **1507 proje bütçesi** için hedeflenen toplam tutar nedir? (Kısa rakam)
10. **Üniversite veya kamu araştırma merkezi** ile görüşülen/ imzalanan iş birliği var mı? (Evet/Hayır — kurum adı?)
11. **1711 müşteri kuruluş** adayı (banka, sigorta, otomotiv) var mı? (Evet/Hayır — kim?)
12. **TÜBİTAK YZE** ile iletişim veya niyet beyanı süreci başlatıldı mı? (Evet/Hayır)
13. İmzalı **pilot partner LOI** var mı? (Evet/Hayır — kaç adet?)
14. Daha önce **TÜBİTAK destekli proje** tamamlandı mı? (Evet/Hayır — program no?)
15. **2026/2 (1507/1501)** çağrısına başvuru hedefleniyor mu, yoksa önce şirketleşme mi? (Kısa cevap)

---

## 7. Final Öneri

**Bugün üç programa da başvuru yapılamaz (NO-GO).** Seçilmesi gereken yol: önce kurumsal uygunluğu (LTD/A.Ş. + KOBİ + PRODİS + e-imza) tamamlayarak **1507’yi 2026/2 çağrısına hazırlamak**; **1501’i ikinci faz hedefi** olarak 1507 çıktıları ve çok dikey olgunluk sonrasına bırakmak; **1711’i konsorsiyum (müşteri kuruluş + üniversite + YZE) oluşana kadar bekletmek**. İlk idari aksiyon: şirket türünü netleştirmek ve PRODİS kuruluş ön kaydını başlatmak (çağrı beklemeden yapılabilir — rapor notu). İlk teknik/dokümantasyon aksiyonu: `docs/TUBITAK_READINESS_AUDIT.md` §5 iş paketlerinden AGY100/101 taslağı ve mimari ek hazırlamak (`docs/ARCHITECTURE.md` + `docs/AI_DECISION_ENGINE.md` tabanlı) — kurumsal blokaj çözülür çözülmez başvuruya hazır olmak için.

---

*Bu belge hukuki veya mali tavsiye değildir. Kesin başvuru şartları için TÜBİTAK TEYDEB resmi çağrı dokümanları doğrulanmalıdır.*
