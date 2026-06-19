# isteBul — Vizyon vs Mevcut Durum Raporu

**Tarih:** 2026-05-25  
**Hedef (sizin tanımınız):** Kullanıcı bilgileri → yapay zeka destekli analiz → **3 araç** sonucu → her araç için **bakım, yakıt, kasko, sigorta** ve TCO → **kural + AI puanlama/yorum** → **son turda tek seçim** → **kredi (miktarı kullanıcı belirler)** veya ilgili yönlendirme.

---

## 1) Özet: Ne kadar yol alındı?

| Alan | Durum | Yaklaşık tamamlanma |
|------|--------|---------------------|
| Karar altyapısı konumlandırması (ilan sitesi değil) | Canlı | **%90** |
| Auto sihirbaz → skor + TCO motoru | Canlı | **%85** |
| 3 modele kadar öneri (ücretsiz önizleme limiti) | Canlı | **%80** |
| Maliyet kırılımı (yakıt, sigorta, kasko, bakım, TCO) | Canlı | **%85** |
| AI yorum katmanı (skoru değiştirmez) | Canlı | **%75** |
| Pro / Stripe / planlar sayfası | Canlı | **%85** |
| Partner + lead yönlendirme | Canlı (kontrollü) | **%70** |
| Son tur **zorunlu tek seçim** akışı | Kısmi | **%35** |
| Kredi: kullanıcı tutarı + partner çıkışı | Kısmi (simülasyon + modal) | **%60** |
| İlan envanteri / tam pazar yeri | Bilinçli olarak sınırlı | **%40** |

**Genel ürün–vizyon uyumu:** yaklaşık **%72–78** — çekirdek “karar motoru + Auto” hedefe yakın; **son karar turu** ve **tam finans çıkışı** ürün borcu olarak kaldı.

---

## 2) Canlıda çalışan akış (bugün)

### Ana yol: `/auto/`
1. Çok adımlı profil sihirbazı (bütçe, kullanım, risk tercihi vb.)
2. `recommendVehicles` — deterministik skor + gerekçe + risk sinyalleri
3. Sonuç ekranı: genelde **3 modele kadar** (`FREE_LIMITS.maxAutoResultsPreview = 3` ücretsiz; Pro daha fazla karşılaştırma)
4. Her kartta **12 ay TCO** ve kalemler (yakıt, sigorta, kasko, bakım vb.)
5. **AI açıklama paneli**: yapılandırılmış özet; ücretsizde sınırlı/bütçeli AI anlatım; Pro’da derinleştirme
6. CTA’lar: karşılaştır, ilgi kaydı, **finans simülasyonu**, partner lead

### Gelir ve planlar
- Ana sayfa `#pricing` ve `/planlar` — dinamik kartlar (`revenueManager.renderPricingCards`)
- Stripe checkout, 7 gün deneme, yıllık/aylık toggle, ROI hesaplayıcı
- **Bu sürüm:** plan kartlarında scroll giriş animasyonu, hover derinliği, `prefers-reduced-motion` desteği

### Altyapı
- Cloudflare Pages, `main` push → CI deploy
- Supabase auth (Google OAuth dahil), `?return=/auto/` ile analiz dönüşü
- Admin CRM, partner webhook, launch audit scriptleri

---

## 3) Vizyon maddeleri — tek tek

### ✅ Büyük ölçüde karşılananlar
- **Bilgi toplama + AI destekli sonuç:** Auto sihirbaz + skor motoru + AI özet katmanı.
- **3 araç sonucu:** Ücretsiz planda 3 model önizlemesi; Pro’da geniş karşılaştırma.
- **Bakım / yakıt / kasko / sigorta görünürlüğü:** TCO panelinde şeffaf kırılım.
- **Puanlama:** Kural tabanlı skor ana karar; AI skoru değiştirmez (metodoloji ile uyumlu).
- **Yönlendirme:** Lead, partner, finans simülasyonu, Pro yükseltme.

### ⚠️ Kısmen karşılananlar
- **Her araç için ayrı uzun AI paragrafı:** Tek sentez + yapılandırılmış kartlar; 3 bağımsız “araç başına hikâye” henüz ürünleştirilmedi.
- **Kredi miktarını kullanıcı belirler:** Finans modalında `finance-loan-amount` ile tutar değiştirilebilir; çıkış hâlâ **simülasyon + lead**, gerçek banka API’si değil.
- **Planlar görsel deneyimi:** Kart düzeni vardı; **animasyonlu profesyonel kart** bu raporla güçlendirildi.

### ❌ Henüz tamamlanmayanlar (backlog)
- **Son turda zorunlu tek seçim:** Kullanıcı birden fazla kartta CTA görebilir; “tek kazanan → sonraki adım” adımı yok.
- **Seçim sonrası tek yönlendirme hattı:** Kredi / sigorta / bayi — seçime göre dallanan kapalı funnel.
- **Tam ilan pazar yeri:** Karar destek yüzeyi var; envanter yoğunluğu operasyonel.

---

## 4) Son teknik sprintler (main)

| Commit / konu | Ne sağladı |
|---------------|------------|
| Homepage ↔ Auto köprüsü, auth `return` | Giriş sonrası analize dönüş |
| Auto AI sonuç paneli (tüm kullanıcılar) | Ücretsizde de şeffaf AI katmanı |
| Production launch hardening | Partner prerender, güven metinleri, audit |
| **CTA navigasyon düzeltmesi** | `Analiz başlat` → `/auto/` gerçek sayfa geçişi |
| **Plan kart animasyonları** | `#pricing` + `/planlar` UX |

**Launch görüşü (iç audit):** kontrollü gerçek kullanıcı trafiği için **HAZIR**; geniş reklam öncesi admin UAT ve partner API canlı doğrulama önerilir.

---

## 5) Önerilen sıradaki ürün adımları

1. **Final seçim adımı** — 3 karttan sonra “Kararım: …” → tek lead/finans çıkışı.
2. **Finans çıkışı** — kullanıcı tutarı + seçilen araç → partner deep link veya başvuru formu.
3. **Araç başına AI blurb** (opsiyonel, bütçe sınırlı) — mevcut sentezin altında 3 kısa not.
4. **Planlar A/B** — animasyon + yıllık toggle dönüşüm ölçümü (`growth-engine` ile).

---

## 6) Deploy

```bash
git push origin main
```

GitHub Actions (`production-deploy.yml`) → Cloudflare Pages `dist/` yayını.

**Canlı kontrol listesi:** `/` · `/auto/` · `/planlar` · `/giris?return=/auto/` · Stripe test checkout.

---

*Bu belge ürün sahibi özeti içindir; teknik detay için `docs/FINAL_PRODUCTION_LAUNCH_REPORT.md` ve `docs/PROJECT_HEALTH_REPORT.md`.*
