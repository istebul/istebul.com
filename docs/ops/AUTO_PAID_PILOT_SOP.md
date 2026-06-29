# Kontrollü Auto Ücretli Pilot — Standart Operasyon Prosedürü (SOP)

**Sürüm:** 1.0  
**Son güncelleme:** 2026-06-28  
**Durum:** Onay bekliyor — harcama başlamadan önce insan onayı zorunludur  
**İlgili dokümanlar:** `docs/GROWTH_ENGINE.md` · `docs/GROWTH_EXECUTION_PLAN.md` · `docs/P5_1_PAID_ACQUISITION_READINESS.md` · `docs/ZIYARETCI_ANALITIK_KURULUM.md`

---

## 1. Amaç ve kapsam

Bu SOP yalnızca **kontrollü Auto ücretli pilot** içindir. Genel büyüme stratejisi, Meta/TikTok kanalları veya çok dikey genişleme bu dokümanın kapsamı dışındadır.

| Alan | Tanım |
|------|--------|
| **Ne değildir** | Reklam kampanyası başlatma talimatı değildir. Harcama, bütçe artışı veya kanal genişlemesi için ayrı **insan onayı** gerekir. |
| **İlk kanal** | Google Search |
| **İlk landing** | `https://www.istebul.com/auto/` |
| **Pilot hedefi** | **Qualified lead / hafta** öğrenmesi — ücretli trafikten gelen `auto_lead_submit` hacmini ve dönüşüm oranlarını ölçülebilir kılmak |
| **North star bağlantısı** | `docs/investor/KPI_STORY.md` — birincil metrik: qualified leads / week |

**Başarı kriteri (pilot):** UTM ve `gclid` attribution'ın admin panellerinde görünmesi; haftalık paid auto lead sayısının güvenilir biçimde okunması; CPL ve kalite için stop-loss kurallarının uygulanabilir olması.

---

## 2. Ön koşullar

Aşağıdaki maddeler tamamlanmadan pilot onaylanmaz.

### Ürün ve ölçüm (production)

- [ ] PR #469 (Kasko lead funnel + dikey event parity) — **POST_MERGE_PASS**
- [ ] PR #470 (Admin Platform Analytics lead KPI alias'ları) — **POST_MERGE_PASS**
- [ ] PR #471 (Auto sonuç copy + enum normalization) — **POST_MERGE_PASS**
- [ ] `main` referansı temiz (Growth Ops audit: `GROWTH_OPS_READY`)

### Admin ve erişim

- [ ] **Platform Analytics** erişimi (Admin → Platform analitik)
- [ ] **Birleşik Funnel** erişimi (Admin → Birleşik Funnel)
- [ ] Büyüme komuta merkezi ve **Ücretli platformlar (P5.1)** tablosu görünür

### Reklam ve bütçe (insan tarafı)

- [ ] Google Ads hesabı + ödeme yöntemi hazır
- [ ] Günlük bütçe cap tanımlandı (bkz. Bölüm 6)
- [ ] **CPL hedefi (₺X)** ekip tarafından yazıldı — boş bırakılamaz

### Uyum ve ölçüm altyapısı

- [ ] KVKK / çerez onay banner'ı canlıda kontrol edildi (`docs/ZIYARETCI_ANALITIK_KURULUM.md`)
- [ ] `analytics-ingest` ve `analytics_events` production'da çalışıyor

### Partner (önerilir, blocker değil)

- [ ] Partner webhook veya LOI — **gelir / CPL doğrulaması** için önerilir; yalnızca lead ölçüm pilotu için **zorunlu değildir**

---

## 3. Kampanya standardı

### Kanal ve isimlendirme

| Alan | Değer |
|------|--------|
| Kanal | Google Search |
| Kampanya adı | `search_auto_tco` |
| Landing URL | `https://www.istebul.com/auto/` |
| Google Ads dönüşüm eşlemesi | `generate_lead` ↔ `auto_lead_submit` (`js/features/growth/paid-acquisition.js` — `PAID_FUNNEL_MAP`) |

### UTM standardı

| Parametre | Değer |
|-----------|--------|
| `utm_source` | `google` |
| `utm_medium` | `cpc` |
| `utm_campaign` | `search_auto_tco` |
| `utm_content` | `{ad_group}` — reklam grubu kimliği veya adı |
| `utm_term` | `{keyword}` — eşleşen anahtar kelime |
| `paid_platform` | `google_search` |
| `gclid` / `gbraid` / `wbraid` | Google tarafından otomatik eklenir |

### Örnek final URL

```
https://www.istebul.com/auto/?utm_source=google&utm_medium=cpc&utm_campaign=search_auto_tco&utm_content={ad_group}&utm_term={keyword}&paid_platform=google_search
```

(`gclid` tıklamada Google tarafından eklenir.)

### Landing URL notu

`data/growth/paid-channels.json` içinde `primaryLanding` varsayılanı `/karar-asistani/` olabilir; `buildPaidCampaignUrl('google_search')` de bu path'e yönelebilir. **Bu pilotta final URL manuel olarak `/auto/` sabitlenir.** Reklam yöneticisinde final URL alanını doğrudan `/auto/` olarak girin; UTM'leri yukarıdaki tabloya göre ayarlayın.

**Referans:** `docs/P5_1_PAID_ACQUISITION_READINESS.md` — Google Search birincil LP: `/auto/`

---

## 4. Ölçüm standardı

### Olaylar (events)

| Öncelik | Olay adı | Açıklama |
|---------|----------|----------|
| **Birincil** | `auto_lead_submit` | Auto lead formu tamamlandı — pilot optimizasyon hedefi |
| İkincil | `paid_click_capture` | Ücretli tıklama kimliği (`gclid` vb.) yakalandı |
| İkincil | `auto_wizard_complete` | Sihirbaz tamamlandı |
| İkincil | `lead_submitted` | Site geneli kanonik lead olayı (alias) |
| İkincil | `category_page_view` | Kategori / sayfa görüntüleme (trafik doğrulama) |

**Admin lead sayımı:** `PLATFORM_LEAD_SUBMIT_EVENT_ALIASES` (`js/admin/platform-site-analytics-dashboard.js`) — `auto_lead_submit` ve dikey alias'lar tek KPI altında toplanır.

### KPI'lar

| Öncelik | KPI | Tanım |
|---------|-----|--------|
| **Birincil** | Paid auto lead / hafta | `growth_channel=paid` veya `utm_medium=cpc` attribution'lı `auto_lead_submit` sayısı (7 günlük pencere) |
| İkincil | Landing → lead dönüşümü | LPV veya `paid_landing_view` → `auto_lead_submit` |
| İkincil | Wizard complete → lead | `auto_wizard_complete` → `auto_lead_submit` |
| İkincil | Kanal başına lead | Platform Analytics kanal tablosu (`channelLeads`) |
| İkincil | Tahmini CPL | Haftalık harcama ÷ lead sayısı (harcama ops kaydından) |

### Admin'de okunacak yüzeyler

| Yüzey | Konum | Ne için |
|-------|--------|---------|
| Platform Analytics | Admin → Platform analitik | Trafik, lead KPI, kanal kırılımı |
| Birleşik Funnel | Admin → Birleşik Funnel | Auto satırı: visit → complete → lead |
| Ücretli platformlar (P5.1) | Büyüme komuta merkezi | Platform bazlı tıklama ve dönüşüm |
| Growth command metrics | `npm run metrics:growth:command` veya admin export | Haftalık executive özet |

**Attribution notu:** First-touch UTM ve `gclid` `istebul_attribution` (localStorage) içinde consent öncesi de yazılır; **analytics event'leri** çoğunlukla çerez onayı sonrası gönderilir. Consent smoke zorunludur (Bölüm 9).

---

## 5. Günlük operasyon ritmi

| Gün | Odak | Kontrol listesi |
|-----|------|-----------------|
| **Gün 0** (harcama öncesi) | Smoke test | Final URL `/auto/` + UTM doğru mu? Consent banner çalışıyor mu? Admin panelleri açılıyor mu? Test tıklamasında `gclid`/UTM localStorage'da görünüyor mu? (**Gerçek lead formu gönderilmez.**) |
| **Gün 1** | Trafik ve attribution | Google Ads'te gösterim/tıklama var mı? `paid_click_capture` artıyor mu? Platform Analytics'te `utm_source=google` trafiği görünüyor mu? |
| **Gün 2–3** | Funnel akışı | LPV → `auto_wizard_complete` → `auto_lead_submit` zinciri Birleşik Funnel'de doluyor mu? Öğrenme fazı — agresif optimizasyon yapılmaz. |
| **Gün 4–7** | CPL ve kalite | CPL hesapla (harcama ÷ lead). Stop-loss kurallarını uygula (Bölüm 6). Junk / düşük skor lead oranını Lead CRM'den gözden geçir. |
| **Haftalık** | Rapor | `paid-spend` şablonu üzerinden haftalık özet (Bölüm 7). `npm run metrics:growth:command`. Stop-loss sahibi ile 30 dk review. |

**Günlük okuma saati:** Ekip tarafından belirlenir (öneri: sabah 10:00 TR, 15 dk).

---

## 6. Bütçe ve stop-loss

### Pilot bütçe cap

| Parametre | Öneri |
|-----------|--------|
| Günlük cap | **₺150–250/gün** (kontrollü öğrenme fazı) |
| Haftalık üst sınır | Günlük cap × 7 (manuel aşım yok) |

> Repo'da Google Search için sabit günlük bütçe yoktur; Meta cold Auto referansı `docs/SOCIAL_MEDIA_30DAY_PLAYBOOK.md` içinde ₺300–500/gündür. Pilot bilinçli olarak daha düşük cap ile başlar.

### CPL hedefi

| Alan | Değer |
|------|--------|
| CPL hedefi | **₺X** — ekip tarafından bu SOP onaylanmadan önce doldurulmalı |
| Partner CPL bandı (referans, reklam maliyeti değil) | ₺5.000–12.000 / sıcak lead (`data/sales/pricing-sheet.json`) |

**Kural:** Net sayısal CPL hedefi (`₺X`) dokümana ve onay formuna yazılmadan **harcama artırılmaz** ve **bütçe cap yükseltilmez**.

### Stop-loss kuralları

| Koşul | Aksiyon |
|-------|---------|
| Gün 1–3 | Öğrenme fazı — acele optimizasyon veya bütçe artışı **yok** |
| Gün 4+ ve CPL > hedefin **2 katı** | Kreatif veya hedefleme daralt; gerekirse kampanyayı **pause** |
| **0 lead** ve **3 günlük cap** harcandı | Kampanyayı **pause**; kök neden: UTM, consent, landing URL, form |
| Düşük kaliteli / junk lead oranı **> %30** | Kampanyayı **pause**; hedefleme ve form kalitesi incele |
| Attribution kırık (UTM/gclid admin'de görünmüyor) | Harcama **durdur**; ölçüm onarılana kadar devam etme |

**Stop-loss sahibi:** Ekip tarafından atanır (Growth / Ops lideri); isim ve iletişim onay formunda kayıtlı olmalı.

---

## 7. paid-spend kaydı

### Şablon

- Kaynak: `data/growth/paid-spend.template.json`
- Yerel kopya: `data/growth/paid-spend.json` (şablondan kopyalanır)

### Güvenlik kuralı

**Gerçek harcama verisi repo'ya commit edilmemelidir.** Haftalık harcama ops sheet, güvenli paylaşımlı doküman veya yerel (gitignore'lu) `paid-spend.json` kopyasında tutulur.

### Haftalık özet metrikleri (ops sheet)

| Sütun | Açıklama |
|-------|----------|
| `spend` | Haftalık Google Search harcaması (TRY) |
| `clicks` | Google Ads tıklama sayısı |
| `leads` | `auto_lead_submit` (paid attribution) |
| `CPL` | spend ÷ leads |
| `notes` | Kreatif değişikliği, pause, kalite notu |

### CAC raporu

```bash
npm run metrics:paid-cac
```

Bu komut yalnızca `paid-spend.json` **güvenli şekilde** (yerel veya CI secret ortamında) hazırlandıktan sonra çalıştırılmalıdır. Çıktı: `dist/paid-cac-report.json`.

---

## 8. Partner / gelir kapısı

| Senaryo | Partner gerekli mi? |
|---------|---------------------|
| Lead ölçüm pilotu (trafik + `auto_lead_submit`) | **Hayır** |
| CPL / gelir doğrulaması (realization, win rate) | **Evet** — en az 1 partner webhook veya LOI |
| Tam monetizasyon öğrenmesi | **Önerilir** — 5 sıcak lead pilotu (`data/sales/pricing-sheet.json`) + partner outcome feedback (won/lost) |

**Önerilen süreç:** Pilot hafta 2'den itibaren aktif partner varsa dispatch logları ve outcome geri beslemesi haftalık rapora eklenir. Partner yoksa pilot yalnızca talep (demand) öğrenmesi olarak sınıflandırılır.

---

## 9. Risk ve mitigasyon

| Risk | Etki | Mitigasyon |
|------|------|------------|
| **Consent undercount** | Event'ler çerez onayı sonrası; erken bounce eksik sayılır | Gün 0 consent smoke; `cookieConsentAccepted` sonrası `capturePaidAttribution` yeniden çalışır (`js/runtime/growth-ops.js`). Banner metni ve kabul oranını izle. |
| **Yanlış landing URL** | Funnel kırılır; `/karar-asistani/` vs `/auto/` karışıklığı | Final URL'yi Google Ads'te açıkça `/auto/` sabitle; UTM smoke zorunlu. |
| **CPL hedefinin boş kalması** | Stop-loss uygulanamaz | Onay checklist'te `₺X` zorunlu; boşsa harcama başlamaz. |
| **Partner dönüşünün ölçülememesi** | CPL anlamlı gelir metriğine dönüşmez | Pilotu "demand-only" olarak etiketle; partner kapısını hafta 2 hedefi olarak planla. |
| **Auto sonuç ekranı polish** | UX kalitesi; dönüşümü etkileyebilir | Aşağıdaki follow-up'lar **pilot blocker değildir** (copy/normalization kapısı #471 ile kapandı): legacy "Kasa tipi / Kasa eşleşmesi" etiketleri; V2/V3/Decision OS katman tekrarı; kicker uppercase polish. |

---

## 10. Launch onay checklist

Aşağıdaki maddelerin tamamı işaretlenmeden reklam yayına alınmaz.

- [ ] **İnsan onayı** alındı (Growth / ürün sahibi imzası veya ticket)
- [ ] Google Ads hesabı ve ödeme yöntemi hazır
- [ ] Günlük bütçe cap (₺150–250) kampanyaya girildi
- [ ] Final URL: `https://www.istebul.com/auto/` + UTM standardı doğrulandı
- [ ] CPL hedefi **₺X** yazıldı ve stop-loss sahibi atandı
- [ ] Admin ölçüm yüzeyleri erişilebilir (Platform Analytics, Birleşik Funnel, Ücretli platformlar)
- [ ] Consent smoke tamamlandı (banner → kabul → event akışı)
- [ ] Günlük okuma saati ve haftalık review takvimi belirlendi
- [ ] `paid-spend` ops sheet oluşturuldu (repo'ya commit edilmedi)

**Onay sonrası bile:** Bu checklist bir sonraki bütçe artışı veya kanal genişlemesi için yeniden doldurulur.

---

## 11. Açık PR hijyeni notu

Aşağıdaki açık PR'lar **superseded** (yerini `main`'deki daha yeni iş almış) görünmektedir:

| PR | Konu | `main` karşılığı |
|----|------|------------------|
| #463 | Homepage tek h1 | #464 merge |
| #157 | Lead funnel P0 | #469 + ilgili merge'ler |
| #81 | Platform Analytics | #470 merge |

**Bu SOP PR kapsamında bu PR'lar kapatılmaz.** Kapatma işlemi ayrı PR hijyeni adımında, **ürün sahibi (PO) onayı** ile yapılmalıdır (`AGENTS.md`).

---

## Bu doküman neyi başlatmaz?

- Reklam kampanyası **başlatmaz**
- Bütçe harcaması **başlatmaz**
- Gerçek kullanıcı verisi veya test lead'i **üretmez**
- Kod, deploy, Supabase migration, Cloudflare ayarı veya workflow **değişikliği yapmaz**

---

## Revizyon geçmişi

| Tarih | Sürüm | Değişiklik |
|-------|-------|------------|
| 2026-06-28 | 1.0 | İlk SOP — kontrollü Google Search Auto pilot |
