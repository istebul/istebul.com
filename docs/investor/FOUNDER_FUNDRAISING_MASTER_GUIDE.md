# isteBul — Kurucu Fundraising Master Rehberi

Bu rehber, yatırımcı bulma, ikna etme ve yatırım alma sürecini uçtan uca yönetmeniz için yazılmıştır. Teknik data room ile birlikte **PDF/slayt paketi**, **iletişim şablonları**, **toplantı akışı** ve **günlük/haftalık yapılacaklar listesi** içerir.

---

## Bölüm 1 — Elinizdeki teslim paketi (PDF + slayt)

### 1.1 Otomatik export (önerilen)

```bash
npm run investor:export:pdf
```

Çıktı klasörü: `docs/investor/export/`

| Dosya | Format | Ne zaman kullanılır |
|-------|--------|------------------------|
| `isteBul_ONE_PAGER.pdf` | PDF (A4) | İlk mail, intro, hızlı ön eleme |
| `isteBul_PITCH_DECK.pdf` | PDF slayt (16:9) | 1. ve 2. görüşme sunumu |
| `isteBul_EXECUTIVE_REPORT.pdf` | PDF rapor | DD öncesi özet, analist paylaşımı |
| `isteBul_FUNDRAISING_READINESS.pdf` | PDF rapor | İç hazırlık, eksik kapatma |
| `isteBul_FOUNDER_FUNDRAISING_GUIDE.pdf` | PDF rehber | Bu dokümanın basılı/PDF sürümü |
| `pitch-deck-slides.html` | HTML slayt | Tarayıcıda sunum veya yeniden PDF |
| `*.html` | Kaynak | Metin güncellemesi sonrası yeniden export |

### 1.2 Repo içi kaynak dokümanlar (düzenlenebilir)

| İçerik | Kaynak |
|--------|--------|
| Slayt metni (Marp uyumlu) | `docs/investor/investor-deck.md` |
| One-pager | `docs/investor/ONE_PAGER.md` |
| 100 yatırımcı listesi | `docs/investor/INVESTOR_TARGET_LIST_100.csv` |
| Outreach şablonları | `docs/investor/OUTREACH_PLAYBOOK.md` |
| Toplantı + DD | `docs/investor/MEETING_FLOW_AND_DD.md` |
| Takip disiplini | `docs/investor/FOLLOW_UP_DISCIPLINE.md` |
| Data room | `docs/investor/DATA_ROOM_INDEX.md` |
| Finansal model CSV | `docs/investor/financial-model-template/` |
| Cap table şablonu | `docs/investor/cap-table.csv` |

### 1.3 Canlı metrik (her toplantıdan önce zorunlu)

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run metrics:investor:pack
```

- Çıktı: `dist/investor-readiness-pack.json` (gitignore — sizde lokal kalır)
- Pitch deck slayt 7’deki `[LIVE: ...]` alanlarını bu export ile doldurun
- Stripe dashboard ekran görüntüsünü `STRIPE_MRR_EVIDENCE.md` slotlarına ekleyin

### 1.4 Google Slides / Keynote’a aktarma

1. `isteBul_PITCH_DECK.pdf` → slayt başına görsel import (hızlı)
2. Veya `investor-deck.md` → Marp / manuel kopyala (düzenlenebilir)
3. Marka: arka plan `#0F172A`, vurgu `#2563EB`, font Inter veya DM Sans

---

## Bölüm 2 — Yatırımcıyı ikna eden anlatım (story arc)

### 2.1 60 saniyelik elevator (ezberlenebilir)

> Türkiye’de insanlar araç ve konut gibi ₺500 bin – 3 milyonluk kararları parçalı araçlarla veriyor: ilan sitesi envanter satıyor, banka tek ürün öneriyor, ChatGPT ise fiyat uyduruyor.  
> **isteBul**, uygunluk, toplam maliyet ve finansman yükünü tek şeffaf akışta birleştiren **karar altyapısıdır** — skorlar kural tabanlı ve açıklanabilir; AI sadece yorumlar.  
> Gelir modelimiz hibrit: **Pro abonelik** canlı, **partner lead** dispatch ve CRM ile ölçülüyor. Otomotivde başladık; konut ve finansa aynı motorla genişliyoruz.  
> **[Tur tutarı ve 18 ay milestone]** için görüşmek isteriz.

### 2.2 3 dakikalık genişletme (1. görüşme açılışı)

1. **Problem (45 sn):** Parçalı araçlar, satıcı önyargısı, güven eksikliği  
2. **Çözüm (60 sn):** Decide → Explain → Close; canlı demo isteBul Auto  
3. **Neden şimdi (30 sn):** AI güven krizi, partner CPL baskısı, canlı ürün  
4. **Traction (45 sn):** MRR, lead, funnel — **canlı export’tan oku, tahmin etme**  
5. **Ask (30 sn):** Tur, kullanım, 18 ay milestone, sonraki adım tarihi

### 2.3 İkna için tekrarlanan 5 cümle (her toplantıda)

1. **Kategori:** “İlan sitesi değiliz — karar altyapısıyız.”  
2. **Güven:** “LLM skoru değiştiremez; sayılar deterministik.”  
3. **Monetizasyon:** “Pro + partner actual revenue — ikisi de production’da.”  
4. **Moat:** “Skor IP + truth layer + partner flywheel.”  
5. **Opsiyonellik:** “8 dikey, tek motor — otomotiv beachhead.”

### 2.4 Sık itirazlar ve kısa cevaplar

| İtiraz | Cevap |
|--------|-------|
| “Sahibinden / Arabam zaten var” | Onlar envanter satar; biz **karar + TCO + nötr sıralama** satarız, sonra execution. |
| “AI wrapper değil misiniz?” | Skor motoru kural tabanlı; LLM guardrail ile sınırlı; test ve audit log var. |
| “Traction erken” | Canlı ürün + instrumented funnel; LOI ve pilot partner ile realization hızlanıyor. |
| “Pazar TR’de küçük” | Beachhead auto CPL yüksek; platform 4 dikey SAM ile genişler. |
| “Regülasyon?” | KVKK sayfaları, simulation etiketleri, compliance audit yol haritası data room’da. |

---

## Bölüm 3 — Nasıl iletişim kuracaksınız (2 katman)

Detay şablonlar: `OUTREACH_PLAYBOOK.md`

### 3.1 Öncelik sırası (her zaman)

1. **Warm intro** (mevcut yatırımcı, founder, portföy, danışman)  
2. Tanıştırmalı mail → intro thread  
3. Ancak warm yoksa **cold mail** + 60 sn demo + one-pager PDF  

### 3.2 İlk temas paketi (ekler)

- `isteBul_ONE_PAGER.pdf`  
- 60 sn Loom demo linki (Auto wizard → skor → lead CTA)  
- İsteğe bağlı: `isteBul_PITCH_DECK.pdf` (2. mail veya qualified sonrası)

### 3.3 Kanal seçimi

| Kanal | Ne zaman |
|-------|----------|
| E-posta | Varsayılan; kısa, tek CTA |
| LinkedIn | Cold veya intro sonrası hatırlatma |
| WhatsApp | Sadece tanıdık intro sonrası |
| Yüz yüze / Zoom | Qualified yatırımcı |

### 3.4 Ton ve kurallar

- **Kısa:** İlk mail ≤ 150 kelime  
- **Tek CTA:** “20 dk tanışma” veya “intro rica”  
- **Statik sahte sayı yok:** “Pack export 7 gün içinde paylaşılır” de  
- **48 saat:** Her temas sonrası follow-up (zorunlu)

### 3.5 Haftalık batch planı (100 liste)

| Gün | Aktivite |
|-----|----------|
| Pazartesi | 15 yatırımcı seç (`Warm intro=Evet` önce) |
| Salı–Çarşamba | Intro iste + cold gönder |
| Perşembe | Yanıtları sınıflandır, toplantı slotu aç |
| Cuma | Haftalık investor update + milestone tarihleri güncelle |

---

## Bölüm 4 — Toplantı süreci (adım adım)

Detay: `MEETING_FLOW_AND_DD.md`

### 4.1 Toplantı 1 — Problem / çözüm / traction (30–40 dk)

**Hedef:** Tez uyumu + ikinci görüşme veya polite pass.

| Dakika | İçerik |
|--------|--------|
| 0–3 | Teşekkür + agenda |
| 3–8 | Problem + müşteri alıntısı |
| 8–15 | Çözüm + **canlı demo** (önceden test et) |
| 15–22 | Traction (export’tan 4 metrik) |
| 22–28 | Pazar + moat (1 slayt) |
| 28–35 | Ask + soru-cevap |
| 35–40 | Sonraki adım + **tarih kilitle** |

**Çıktı:** CRM’de `meeting_1_done` + `next_milestone_date`

### 4.2 Toplantı 2 — Metrikler / teknoloji / GTM (45–60 dk)

**Hedef:** DD’ye geçiş onayı.

- Metrikler: MRR trend, lead hacmi, realization, funnel drop-off  
- Teknoloji: Skor mimarisi, LLM sınırı, dispatch güvenilirliği  
- GTM: SEO/PLG, partner pipeline, dikey roadmap  
- Finans: 36 ay model özet (Base senaryo)  
- **Çıktı:** DD kickoff tarihi veya açık soru listesi (owner + deadline)

### 4.3 DD — Data room + teknik inceleme

**Gönderilecek paket:**

1. `isteBul_EXECUTIVE_REPORT.pdf`  
2. Data room link / zip (`DATA_ROOM_INDEX.md` maddeleri)  
3. `investor-readiness-pack.json` (≤7 gün)  
4. `cap-table.csv` + counsel onaylı SHA taslağı  
5. 1–2 imzalı partner LOI (varsa)

**Teknik oturum (60–90 dk):**

- Mimari walkthrough  
- KPI hesap doğrulama  
- `npm run test` sonucu (yeşil)  
- Stripe ↔ CRM reconciliation

**Çıktı:** IC / term sheet / no-go

---

## Bölüm 5 — Yatırım almak için yapmanız gerekenler (checklist)

### 5.1 Tur öncesi (1 kez)

- [ ] Tur tutarı, dilution, valuation hedefi net (counsel)  
- [ ] `cap-table.csv` dolduruldu  
- [ ] `investor-deck.md` içindeki `[Founder ...]` alanları dolduruldu  
- [ ] `npm run investor:export:pdf` → PDF paketi güncel  
- [ ] 60 sn demo Loom kaydı  
- [ ] CRM pipeline (Notion/Sheet): 100 yatırımcı import  
- [ ] Data room klasör yapısı (`DATA_ROOM_INDEX.md`)

### 5.2 Her yatırımcı thread’i için

- [ ] Stage / sector fit kontrol  
- [ ] Warm intro denendi  
- [ ] İlk mail + PDF/demo linki  
- [ ] **48 saat follow-up**  
- [ ] `next_milestone_date` + `next_milestone_definition` dolu  
- [ ] Toplantı notları 24 saat içinde paylaşıldı  

### 5.3 Her toplantı öncesi (T-24 saat)

- [ ] `metrics:investor:pack` export  
- [ ] Pitch deck slayt 7 güncellendi  
- [ ] Demo staging/production test  
- [ ] İtiraz cevapları gözden geçirildi  
- [ ] Soru listesi (min 5) hazır

### 5.4 Her hafta (Cuma)

- [ ] Investor update maili (format: `FOLLOW_UP_DISCIPLINE.md`)  
- [ ] Pipeline durumları güncellendi  
- [ ] Parked / lost nedenleri kaydedildi  
- [ ] Gelecek hafta batch (15 yeni outreach) planlandı  

### 5.5 DD / term sheet aşaması

- [ ] Executive report + data room tam  
- [ ] Stripe MRR kanıtı  
- [ ] LOI / partner sözleşme özetleri  
- [ ] Risk register walkthrough  
- [ ] Hukuk: SHA, SPA, bilgi hakları  

### 5.6 Kritik başarı metrikleri (süreci ölçün)

| Metrik | Hedef (örnek) |
|--------|----------------|
| İlk yanıt oranı | %15+ warm, %3–5 cold |
| Meeting 1 → Meeting 2 | %40+ |
| Meeting 2 → DD | %25+ |
| DD → Term sheet | %15+ |
| Ortalama süre (ilk mail → TS) | 8–16 hafta |

---

## Bölüm 6 — Örnek e-postalar (kopyala-yapıştır)

### 6.1 Tanıştırma isteği (aracıya)

```
Konu: Kısa intro — isteBul (AI karar platformu)

Merhaba [Ad],
[Investor] ile örtüşen bir intro rica edeceğim.
isteBul: yüksek tutarlı alımlarda şeffaf skor + TCO + partner kapanışı.
Ek: one-pager PDF + 60 sn demo.
Uygunsa 2 cümlelik forwardable intro metni paylaşırım.
Teşekkürler.
```

### 6.2 Cold mail

```
Konu: isteBul — seed · karar altyapısı (TR otomotiv beachhead)

Merhaba [Ad],
Kısa özet: [2 cümle elevator].
Materyal: one-pager PDF · 60 sn demo · data room index.
20 dk tanışma için [2 slot] uygun mu?
```

### 6.3 Toplantı sonrası (48 saat)

```
Konu: Teşekkürler + materyaller + sonraki adım

Merhaba [Ad],
Özet: [3 madde].
Ekler: pitch PDF · executive report · metrics pack (tarihli).
Sonraki adım: [DD / 2. görüşme] — [tarih] öneriyorum.
Next milestone: [tanım + tarih].
```

---

## Bölüm 7 — Hemen başlayın (ilk 7 gün)

| Gün | Aksiyon |
|-----|---------|
| 1 | PDF export + deck’te founder alanlarını doldur |
| 2 | Loom demo + CRM’e 100 listeyi import |
| 3 | 10 warm intro isteği |
| 4 | 15 cold mail (one-pager PDF ekli) |
| 5 | İlk toplantıları planla |
| 6 | metrics pack + executive report gönder |
| 7 | Haftalık update #1 + pipeline review |

---

## İlgili dosyalar

- Export: `docs/investor/export/README.md`  
- Operasyon: `OUTREACH_PLAYBOOK.md`, `MEETING_FLOW_AND_DD.md`, `FOLLOW_UP_DISCIPLINE.md`  
- Narrative JSON: `data/investor/investor-narrative.json`
