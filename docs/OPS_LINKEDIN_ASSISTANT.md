# P16 — LinkedIn Operasyon Asistanı (Design Doc)

**Faz:** P16 · **Durum:** Planlama · **Kod:** Bir sonraki ayrı faz  
**Önkoşul:** PR #350 — `docs/site-owner/06-linkedin-etkilesim-rehberi.md` (main)

**İlgili dokümanlar:** [06-linkedin-etkilesim-rehberi.md](./site-owner/06-linkedin-etkilesim-rehberi.md) · [03-tanitim-pazarlama.md](./site-owner/03-tanitim-pazarlama.md) · [SOCIAL_MEDIA_30DAY_PLAYBOOK.md](./SOCIAL_MEDIA_30DAY_PLAYBOOK.md) · [P4_6_BRAND_CONSISTENCY.md](./P4_6_BRAND_CONSISTENCY.md) · [ADMIN_NAV_CONTRACT.md](./ADMIN_NAV_CONTRACT.md) · [OPS_AI_DECISION_ASSISTANT.md](./OPS_AI_DECISION_ASSISTANT.md)

---

## 1. Amaç

**LinkedIn Operasyon Asistanı**, isteBul admin panelinde kullanılan **iç pazarlama operasyon aracıdır**.

Operatör (kurucu, pazarlama veya site sahibi):

- Haftalık LinkedIn paylaşım planını görür,
- Gün/saat bazlı öneri kartlarını takip eder,
- CEO ve şirket hesabı için ayrı paylaşım metinleri alır,
- Üçüncü taraf LinkedIn gönderilerine yorum önerisi üretir,
- Metni **kopyalar** ve **LinkedIn’de manuel** paylaşır veya yorum yapar.

**Bu modül public kullanıcı ürünü değildir.** Ziyaretçi yüzeyine, kategori sihirbazlarına veya karar sonuç ekranlarına eklenmez. Yalnızca `/admin-panel.html` (admin-only) kapsamındadır.

PR #350 ile merge edilen **06 rehber**, bu aracın marka dili ve yorum stratejisi için operasyonel kaynaktır; operatörün her seferinde markdown okuması yerine admin UI üzerinden tüketilir.

---

## 2. Temel sınırlar

Aşağıdakiler **kapsam dışıdır** ve design doc boyunca ihlal edilmez:

| Sınır | Açıklama |
|-------|----------|
| LinkedIn API | OAuth, posting API, company page API yok |
| Scraping | Gönderi çekme, profil tarama, feed okuma yok |
| Otomatik yorum | Sistem LinkedIn’e yorum yazmaz |
| Otomatik paylaşım | Sistem LinkedIn’de post atmaz |
| Otomatik beğeni/takip | Etkileşim otomasyonu yok |
| Manuel model | Admin metni kopyalar; LinkedIn’de kendisi paylaşır/yorumlar |
| Karar motorları | Skor, TCO, risk hesap motorlarına dokunulmaz |
| Ürün AI yorumu | Auto/konut `ai-decision-commentary` ve `ai-insight-engine` ürün path’leri kullanılmaz |

**Konumlandırma korunur:** isteBul ilan sitesi veya sohbet botu değil; AI destekli **karar destek platformu**. Skor/TCO/risk deterministik motorda; AI yalnızca açıklama katmanı — bu modülde bile skor üretilmez, yalnızca pazarlama metni önerilir.

---

## 3. Ürün kapsamı

### MVP özellikleri

| Özellik | Açıklama |
|---------|----------|
| Haftalık LinkedIn planı | Varsayılan slot’lar + tema rotasyonu |
| CEO hesabı paylaşım önerileri | Vizyon / sektör / karar okuryazarlığı tonu |
| Şirket hesabı paylaşım önerileri | Metodoloji, TCO, rehber, konumlandırma |
| Gün/saat bazlı öneri kartları | `Europe/Istanbul` timezone |
| Admin içi hatırlatma | Due kartları + nav badge (opsiyonel widget) |
| Yorum asistanı | Gönderi metni yapıştır → TR + EN yorum öner |
| Marka uyum / risk kontrolü | 06 rehber + `brand-voice.js` + P4_6 kuralları |
| Kopyala butonu | Panoya kopyalama + toast onayı |
| Manuel paylaşım notu | Her kartta sabit disclosure |
| Tamamladım işaretleme | Slot durumu (MVP: `localStorage`; Faz 2: admin settings) |

### Bilinçli MVP dışı

- LinkedIn bağlantısı, zamanlanmış otomatik gönderim
- Telegram/e-posta hatırlatma (Faz 2+)
- Analytics referrer entegrasyonu (Faz 2+)
- Public kullanıcı LinkedIn paylaşımı (`buildLinkedInSummaryText` ayrı use case)

---

## 4. Admin yerleşimi

### Navigasyon

| Alan | Değer |
|------|--------|
| **Nav grubu** | İçerik Yönetimi |
| **Page id** | `linkedin-ops-assistant` |
| **Sidebar etiket** | LinkedIn Operasyon Asistanı |
| **Deep-link slug (öneri)** | `/admin/linkedin-ops` → `linkedin-ops-assistant` |

**Neden İçerik Yönetimi?** Blog, duyuru ve kampanya ile aynı operatör profili (pazarlama). **Neden Ops asistan değil?** `ops-ai-assistant` metrik/funnel/KPI odaklıdır; LinkedIn ops içerik workflow’udur — karıştırılmamalı.

### Admin nav sözleşmesi

Yeni sayfa eklendiğinde [ADMIN_NAV_CONTRACT.md](./ADMIN_NAV_CONTRACT.md) gereği senkron gerekir:

- `js/admin/admin-page-routing.js` — `ADMIN_PAGE_IDS`, alias
- `js/admin/admin-shell.js` — `NAV_LABELS`
- `admin-panel.html` — `data-page-target`, `id="page-linkedin-ops-assistant"`
- `js/admin-panel.js` — `registerAdminPageHandlers`
- `scripts/admin-panel-pages-audit.cjs` — CI drift kontrolü

### Operasyon Özeti widget (ileride)

`dashboard` sayfasında küçük widget veya badge:

- “Bugün: N due LinkedIn slot”
- Tıklanınca `linkedin-ops-assistant` sayfasına gider

MVP’de zorunlu değil; P16.1 veya P16.2’de eklenebilir.

---

## 5. Haftalık varsayılan takvim modeli

**Timezone:** `Europe/Istanbul`  
**Kaynak ilham:** [03-tanitim-pazarlama.md](./site-owner/03-tanitim-pazarlama.md) (LinkedIn 2–3/hafta), [SOCIAL_MEDIA_30DAY_PLAYBOOK.md](./SOCIAL_MEDIA_30DAY_PLAYBOOK.md)

> **Not:** Aşağıdaki tablo **kesin kural değildir**; operasyonel başlangıç test planıdır. Admin ayarlardan veya JSON güncellemesiyle değiştirilebilir.

| Gün | Saat | Hesap | Tür | Tema (başlangıç) |
|-----|------|-------|-----|------------------|
| Salı | 10:00 | Şirket | Paylaşım | Metodoloji / Generic AI vs deterministik skor |
| Perşembe | 10:00 | CEO | Paylaşım | Vizyon / karar okuryazarlığı / sektör gözlemi |
| Cuma | 11:00 | Şirket | Paylaşım | TCO / rehber / metodoloji |
| Günlük (ops.) | 14:00 | CEO veya Şirket | Yorum fırsatı | Hatırlatma: üçüncü taraf gönderiye yorum (paste alanı) |

**4 haftalık tema rotasyonu (öneri):**

1. Auto / TCO  
2. Konut veya finans  
3. Generic AI güven / metodoloji  
4. B2B partner (şirket ağırlıklı)

Makine okunur kaynak (implementasyon): `data/ops/linkedin-weekly-plan.json`

---

## 6. CEO hesabı ve şirket hesabı ayrımı

| Boyut | CEO hesabı | Şirket hesabı (isteBul) |
|-------|------------|-------------------------|
| **Ton** | Kurucu perspektifi, sektör gözlemi, vizyon | Kurumsal, metodoloji, ürün konumlandırma |
| **İçerik** | Karar okuryazarlığı, AI güven, yüksek consideraton kararlar | TCO, kategori rehberleri, pilot dikey, metodoloji |
| **Yorum** | Generic AI, finans, otomotiv thread’leri | B2B, KVKK, partner/CRM thread’leri |
| **Marka adı** | İlk cümlede yok; nadiren soft atıf | Kendi paylaşımında doğal kullanım |
| **Link** | Seyrek | `/metodoloji/`, `/rehber/*` tercih |

### Link stratejisi

Organik hedefler (06 rehber §4.4 ile uyumlu):

- `https://www.istebul.com/metodoloji/`
- `https://www.istebul.com/rehber/{slug}/`

Kaçınılacak (satış sayfası algısı):

- `/auto/`, `/planlar`, `/partner-olun.html` — yorum ve çoğu paylaşımda önerilmez

---

## 7. Yorum asistanı akışı

```
Admin: üçüncü taraf LinkedIn gönderi metnini yapıştırır
    ↓
Kategori tahmini (MVP: keyword/heuristic; P16.1: iyileştirme)
    ↓
Deterministic TR + EN yorum şablonu (06 §7 matrisleri)
    ↓
Marka lint / risk kontrolü
    ↓
[Opsiyonel] Admin "Metni çeşitlendir" → AI proxy (bounded)
    ↓
Admin: Kopyala
    ↓
LinkedIn’de manuel yorum (sistem göndermez)
```

**Kategori seti (06 ile hizalı):** Generic AI/LLM, Otomotiv, Konut, Finansman, Tatil, Sigorta, Kasko, B2B/partner/CRM, KVKK/güven/halüsinasyon.

**Ürün içi LinkedIn dili kullanılmaz:** `js/decision/decision-os-report.js` → `buildLinkedInSummaryText()` emoji/hashtag/CTA tonu yorum aracında yasaktır.

---

## 8. Bildirim / hatırlatma modeli

### MVP (yeterli)

| Mekanizma | Kullanım |
|-----------|----------|
| **Due kartları** | Slot saati ± tolerans penceresinde “bugün yapılacak” |
| **Nav badge** | Tamamlanmamış due slot sayısı |
| **Toast** | “Kopyalandı”, lint fail uyarısı |

Due hesabı: admin panel mount + periyodik refresh (sayfa açıkken); **harici cron MVP’de zorunlu değil**.

### Faz 2+ (bilinçli erteleme)

| Mekanizme | Not |
|-----------|-----|
| GitHub Actions cron | `.github/workflows/` pattern (`ops-automation.yml`, `ceo-alerts.yml`) |
| Telegram | `supabase/functions/ops-alert-digest` genişletmesi |
| E-posta | Düşük öncelik; lifecycle cron son kullanıcı içindir |
| Supabase scheduled edge | `lifecycle-cron` benzeri — admin reminder snapshot |

---

## 9. AI / provider yaklaşımı

Repo standardı (P15 Ops AI): **deterministic önce, AI opsiyonel**.

| Katman | Davranış |
|--------|----------|
| **Varsayılan** | `data/ops/linkedin-templates.json` + 06/playbook snippet → deterministic metin |
| **AI tetikleme** | Yalnızca admin “Metni çeşitlendir” butonu |
| **Transport** | `js/core/ai-proxy-client.js` → `postAiProxy()` (same-origin `/ai-proxy`) |
| **Prompt kuralları** | Yeni iddia/rakam yok; finansal/hukuki/yatırım tavsiyesi yok; 06 §4 yasak listesi; `brand-voice.js` trust.compliance |
| **Budget** | Ops pattern: ayrı session budget (ör. 8/saat), tüketici Auto narration’dan ayrı |
| **Fallback** | AI fail → deterministic şablon + toast bilgisi |

**Karıştırılmamalı:**

- `js/features/ops/ops-decision-assistant.js` — metrik brief
- `js/features/ai/ai-insight-engine.js` — ürün karar insight
- Skor/TCO/risk engine çıktıları prompt’a **girmez**

---

## 10. Önerilen teknik fazlar

### P16 MVP

- Admin UI sayfası (`linkedin-ops-assistant`)
- `data/ops/linkedin-weekly-plan.json`
- `data/ops/linkedin-templates.json` (06’dan türetilmiş deterministic şablonlar)
- `js/features/ops/linkedin-brand-lint.js`
- Due kartları, kopyala, manuel tamamlandı (`localStorage`)
- `css/admin-linkedin-ops.css`
- `scripts/p16-linkedin-ops-audit.cjs`
- `tests/unit/linkedin-brand-lint.test.mjs`

### P16.1

- AI varyasyon (`linkedin-ops-narration.js`)
- Yorum kategori sınıflandırma iyileştirme

### P16.2

- Supabase `admin_settings` veya eşdeğeri ile completion sync (cihazlar arası)

### P16.3

- GitHub cron snapshot + `ops-alert-digest` Telegram hatırlatması (opsiyonel)

### P16.4

- `data/content/editorial-weekly-calendar.json` + SOCIAL_MEDIA playbook cross-link

### P16.5

- Manuel performans notları, tema öğrenimi (admin not alanı; otomatik ML yok)

---

## 11. İleride dokunulabilecek dosyalar

| Dosya | Rol |
|-------|-----|
| `admin-panel.html` | Nav + page DOM |
| `js/admin/admin-page-routing.js` | Page id, alias |
| `js/admin/admin-shell.js` | NAV_LABELS |
| `js/admin-panel.js` | Handler register |
| `js/admin/linkedin-ops-assistant.js` | Page loader |
| `js/features/ops/linkedin-ops-*.js` | Plan, views, lint, narration |
| `data/ops/linkedin-weekly-plan.json` | Haftalık slot tanımı |
| `data/ops/linkedin-templates.json` | Şablon katalog |
| `css/admin-linkedin-ops.css` | Admin UI stil |
| `scripts/p16-linkedin-ops-audit.cjs` | Nav/template audit |
| `tests/unit/linkedin-brand-lint.test.mjs` | Lint unit test |

**Okuma-only referans (implementasyonda import edilebilir, değiştirilmez):**

- `js/core/brand-voice.js`
- `docs/site-owner/06-linkedin-etkilesim-rehberi.md`

---

## 12. Kesinlikle dokunulmaması gereken alanlar

| Alan | Gerekçe |
|------|---------|
| `js/features/decision-cards/**` | Ürün karar kartları |
| `js/auto/ai-decision-commentary.js` | Auto skor yorum katmanı |
| Skor / TCO / risk engine modülleri | Mimari ayrım; P16 metin üretir, sayı üretmez |
| `js/decision/decision-os-report.js` | Kullanıcı rapor LinkedIn özeti — farklı ton |
| `supabase/functions/auto-intake` | Lead/score pipeline |
| Public kategori wizard akışları | Public yüzey |
| `data/seo/**` | SEO build pipeline |
| Public site UI (`index.html`, `/auto/`, vb.) | Admin-only modül |

---

## 13. Risk değerlendirmesi

| Risk | Seviye | Azaltma |
|------|--------|---------|
| **Marka dili ihlali** | Orta | Deterministic default; `linkedin-brand-lint.js`; 06 + P4_6 yasak listesi; lint pass zorunlu before copy |
| **AI hallucination** | Orta | AI opsiyonel; yeni rakam/iddia yasağı prompt’ta; fail → deterministic fallback |
| **LinkedIn otomasyonu var sanılması** | Orta | Her kartta “Manuel LinkedIn’de paylaşın” disclosure; docs ve UI’da API yok vurgusu |
| **Admin nav drift** | Düşük | ADMIN_NAV_CONTRACT + `admin-panel-pages-audit.cjs` + unit routing test |
| **Scope creep** | Orta | MVP checklist; CRM/analytics/SEO entegrasyonu Faz 2+; PR scope disiplini |
| **KVKK / loglama** | Düşük | Yapıştırılan üçüncü taraf metin sunucuya loglanmaz (MVP client-side); kalıcı DB opsiyonel değil MVP’de |
| **Ops AI ile karışıklık** | Orta | Ayrı page id, ayrı modül adı, ayrı nav grubu |

---

## 14. Son karar

**ŞİMDİ PLANLA** — Kodlama **bir sonraki ayrı fazda** (P16 MVP implementasyonu).

| Gerekçe | |
|---------|---|
| PR #350 | 06 rehber main’de; operasyonel tüketim aracı eksik |
| Admin altyapı | Page routing, ops modül pattern, AI proxy hazır |
| Risk | Düşük — izole admin tool, manuel model, motor dokunuşu yok |
| Net sınır | API/scraping/otomasyon yok; design doc ile scope kilitli |

**Implementasyon sırası (sonraki faz):**

1. `data/ops/linkedin-weekly-plan.json` + `linkedin-templates.json`  
2. `linkedin-brand-lint.js` + unit test  
3. Admin page + nav sözleşmesi  
4. Due kartları + kopyala + completion  
5. Yorum asistanı (paste → TR/EN)  
6. P16 audit script + CI  

---

*Kod yazımı bu doküman merge edildikten sonra ayrı PR/faz olarak yapılacaktır.*
