# Site Analiz Raporu — isteBul (www.istebul.com)

**İlk analiz tarihi:** 2026-05-25  
**Bu revizyon:** 2026-06-26 — GSC Domain Property / DNS TXT doğrulaması PASS (`GSC_DNS_VERIFIED_PASS`); 2026-06-19 `main` **610a10a7** ile hizalandı (PR #54 docs refresh)
**Kapsam:** 2026-05-25 canlı örnekleme (WebFetch + curl) + o tarihteki üretim build audit’i  
**Genel durum (2026-05-25 snapshot):** **Üretime hazır (YELLOW)** — gelir/SEO monetizasyonu ve performans iyileştirmeleri onay bekliyordu

> **Stale içerik uyarısı:** Aşağıdaki canlı tarama, bundle boyutları ve audit çıktıları **2026-05-25** ölçümüne aittir. `main` **610a10a7** sonrası (844+ commit) bundle, sitemap ve canlı `/ads.txt` davranışı **yeniden ölçülmelidir**. Güncel sitemap metrikleri için `docs/SEO_INDEXABILITY_REPORT.md` (2026-06-10) referans alınmalıdır.

---

## 1. Yönetici özeti

| Alan | Skor (2026-05-25) | Not |
|------|-------------------|-----|
| Build & CI audit | **GREEN** | `npm run build`, `production:audit` 24/24 geçti |
| UX / dönüşüm (statik) | **GREEN** | P4.3 mobil, P4.4 conversion audit geçti |
| Uyumluluk (statik) | **GREEN** | Compliance + launch audit geçti |
| SEO teknik altyapı | **YELLOW** | Mayıs’ta ~28 URL; güncel build audit **178 URL** (`docs/SEO_INDEXABILITY_REPORT.md`, 2026-06-10) |
| Canlı içerik | **GREEN** | Ana sayfa karar altyapısı mesajı ve CTA’lar doğru (May 2026 gözlemi) |
| Performans (bundle) | **YELLOW (stale)** | Mayıs ölçümü ~818 KB SPA; **610a10a7 sonrası yeniden ölçüm gerekir** |
| Google Search Console | **GREEN** | **PASS** — Domain Property / DNS TXT ile doğrulandı; HTML meta tag yalnızca URL-prefix alternatifi (opsiyonel) |
| Google AdSense | **SARI → KIRMIZI (canlı)** | Repoda `ads.txt` var; Mayıs canlı taramada `/ads.txt` HTML döndü — prod yeniden doğrulanmalı |
| Otomasyon curl/Lighthouse | **SINIRLI** | Cloudflare bot challenge (403); Googlebot etkilenmeyebilir |

**Sonuç (güncellenmiş):** Site işlevsel ve yayında. GSC mülk doğrulaması **tamamlandı** (DNS TXT). Tam kapasite için **GSC operasyonel SEO** (sitemap, URL inspection, CWV), **canlı `/ads.txt` doğrulaması**, **AdSense entegrasyonu (script/CSP/çerez)**, **bundle küçültme (yeniden ölçüm sonrası)** ve **çerez/CSP güncellemesi** sırayla yapılmalı — aşağıdaki onay listesi.

---

## 2. Canlı site taraması (2026-05-25 snapshot)

### 2.1 Erişilebilirlik

| URL | curl (agent) | WebFetch | Bulgu (May 2026) |
|-----|--------------|----------|------------------|
| `/` | 403 (CF challenge) | **OK** | İçerik, H1, CTA, planlar bölümü render |
| `/robots.txt` | 200 | **OK** | Sitemap satırı + disallow kuralları |
| `/sitemap.xml` | 403 | Zaman aşımı | Büyük olasılıkla CF; GSC’de manuel kontrol önerilir |
| `/ads.txt` | 200 ama **HTML** | — | Mayıs’ta SPA fallback — **610a10a7’de repoda statik dosya var; canlı prod yeniden test edilmeli** |
| `/auto/` | 403 | — | Tarayıcıda doğrulanmalı |

Cloudflare “Just a moment…” otomasyonu engelliyor; bu **insan kullanıcıları** ve **Googlebot** için genelde sorun değildir. Yine de GSC “Sayfa getirme” ve “Canlı test” ile doğrulayın.

### 2.2 Görsel / marka / dönüşüm (canlı gözlem, May 2026)

- Konumlandırma tutarlı: “karar altyapısı”, TCO, metodoloji.
- Birincil CTA: “TCO analizini başlat”, ikincil: metodoloji / planlar.
- Planlar: Ücretsiz / Pro ₺299 / Enterprise görünür.
- Eksik (organik güven): `data/seo/site.json` → `organization.sameAs` **boş** (LinkedIn, X vb. yok) — **610a10a7’de hâlâ boş**.

---

## 3. Kod tabanı & build audit sonuçları (2026-05-25 snapshot)

```
npm run build              ✓ (301 dosya — May 2026)
npm run production:audit   ✓ 24 passed, 2 warnings, 0 fail
node page-health-audit     ✓
P4.3 mobile UX             ✓
P4.4 conversion UX         ✓
compliance-audit-check     ✓
launch-audit-check         ✓
accessibility-check        ✓
performance-check (kaynak) ✗ index.html'de perf:importmap işareti (dist OK)
```

**Bundle (`dist/bundle-report.json`) — STALE (2026-05-25 ölçümü):**

| Dosya | Boyut (May 2026) |
|-------|------------------|
| `app.bundle-*.js` | 364 KB |
| `chunk-HMRE5TDJ.js` | 213 KB |
| `style.*.css` | 151 KB |
| **Toplam (SPA)** | **819 KB** |

> **610a10a7 sonrası:** `npm run build` ardından `dist/bundle-report.json` yeniden üretilmeli; yukarıdaki rakamlar kesin güncel değer olarak kullanılmamalıdır.

**Uyarılar (production-health-audit):** TypeScript yok (bilinçli), SSR yok (bilinçli).

**Sitemap (güncel referans):** `docs/SEO_INDEXABILITY_REPORT.md` (2026-06-10) → **178 URL**, 0 canonical issue, 4 orphan HTML. Mayıs raporundaki “28 URL” artık geçerli değildir.

---

## 4. Google Search Console

> **2026-06 closure:** Mülk doğrulaması **Domain Property / DNS TXT** ile tamamlandı (`GSC_DNS_VERIFIED_PASS`). Canlı HTML’de `google-site-verification` meta tag **olmaması bu doğrulama tipinde hata veya blocker değildir**. `GOOGLE_SITE_VERIFICATION` secret yalnızca URL-prefix + HTML tag yöntemi seçilirse opsiyoneldir.

### Repoda ne var? (610a10a7)

| Bileşen | Durum | Kanıt |
|---------|--------|-------|
| Build-time meta enjeksiyonu | **Mevcut** | `scripts/lib/gsc-verification.cjs` — `GOOGLE_SITE_VERIFICATION` env’den `<meta name="google-site-verification">` enjekte eder |
| Build entegrasyonu | **Mevcut** | `scripts/production-build.cjs` build sırasında GSC meta enjekte eder |
| Kaynak HTML yorumu | **Mevcut** | `index.html` satır 10: build injects from env |
| Secret dokümantasyonu | **Mevcut** | `.github/SECRETS.example.md` → `GOOGLE_SITE_VERIFICATION` |
| SEO dokümantasyonu | **Mevcut** | `docs/SEO_AUDIT.md` satır 38 |

**Not (HTML tag alternatifi):** Repoda build-time meta enjeksiyon altyapısı mevcuttur (`scripts/lib/gsc-verification.cjs`). Meta etiketinin **dist/** çıktısına yazılması yalnızca URL-prefix + HTML tag doğrulaması seçilirse `GOOGLE_SITE_VERIFICATION` secret’ına bağlıdır; DNS Domain Property kullanıldığında secret zorunlu değildir.

### Mülk doğrulaması

| Yöntem | Durum | Not |
|--------|--------|-----|
| Domain Property / DNS TXT | **PASS** | Mevcut tercih; canlı HTML’de meta tag gerekmez |
| URL-prefix / HTML tag | Opsiyonel alternatif | `GOOGLE_SITE_VERIFICATION` secret + build enjeksiyonu |

### Kalan işler (operasyonel SEO — mülk doğrulaması değil)

| İş | Agent / repo | Sizin yapmanız gereken |
|----|--------------|------------------------|
| Sitemap gönderme | Build `sitemap.xml` üretir | GSC → Sitemaps → `https://www.istebul.com/sitemap.xml` |
| URL denetimi / indeks | — | Önemli URL’ler için “İndeks iste” |
| Core Web Vitals | — | GSC → Deneyim → CWV raporu |
| Yapılandırılmış veri raporu | Schema build’de mevcut | GSC → Zengin sonuçlar |
| HTML tag doğrulaması (opsiyonel) | `GOOGLE_SITE_VERIFICATION` secret | Yalnızca URL-prefix + HTML tag yöntemi seçilirse; DNS PASS iken gerekmez |

**Önerilen GSC kontrol listesi (panel — operasyonel):**

1. Mülk: Domain Property (`istebul.com`) — DNS TXT doğrulandı.
2. Sitemap durumu: 178 URL (`docs/SEO_INDEXABILITY_REPORT.md`) — gönderildi mi, hata var mı?
3. `/rehber/*`, `/auto/`, `/karar-asistani/` için URL denetimi.
4. Mobil kullanılabilirlik + Core Web Vitals (alan verileri 28 gün gecikmeli).
5. *(Opsiyonel — yalnızca HTML tag yöntemi)* Deploy sonrası: canlı HTML’de `google-site-verification` meta var mı?

---

## 5. Google AdSense

### Repoda ne var? (610a10a7)

| Gereksinim | Durum | Kanıt |
|------------|--------|-------|
| `ads.txt` kök dosyası | **Mevcut** | `ads.txt` — `google.com, pub-6412697542113702, DIRECT, f08c47fec0942fa0` |
| Build’e kopyalama | **Mevcut** | `scripts/production-build.cjs` staticFiles listesinde `ads.txt`; `scripts/check-build-output.cjs` dist doğrulaması |
| Canlı `/ads.txt` (May 2026 taraması) | **Başarısız** | SPA fallback → HTML döndü — **prod yeniden doğrulanmalı** |
| AdSense script + reklam birimleri | **YOK** | — |
| CSP (`_headers`) `pagead2.googlesyndication.com` | **Doğrulanmadı** | Entegrasyon öncesi kontrol gerekir |
| Çerez politikası “reklam” kategorisi | **YOK** | Yalnızca analitik + Sentry (May 2026 gözlemi) |
| İçerik hacmi / politika uyumu | **Belirsiz** | Karar aracı — AdSense reddedilebilir; önce GSC organik trafik |

**Canlı test (May 2026):** `GET /ads.txt` → ana sayfa HTML döner (publisher doğrulaması **başarısız**). Statik dosya repoda olsa bile canlı ortamda `_redirects`/Pages routing davranışı **610a10a7 deploy’u sonrası yeniden test edilmelidir**.

**İş modeli notu:** Ücretli Pro abonelik + partner geliri varken sayfa içi AdSense dönüşümü düşürebilir; rehber/blog sayfalarında sınırlı gösterim düşünülebilir.

---

## 6. Tam kapasite engelleri (öncelik sırası, 610a10a7 ile güncellendi)

| # | Engel | Etki | Önerilen çözüm |
|---|--------|------|----------------|
| 1 | Canlı `/ads.txt` prod doğrulaması eksik (May 2026: HTML fallback) | AdSense publisher doğrulaması başarısız olabilir | Deploy sonrası `curl -sI https://www.istebul.com/ads.txt` + içerik kontrolü; gerekirse `_redirects` / Pages statik kural |
| 2 | Ana JS bundle (May 2026: 364 KB + chunk 213 KB) — **stale** | LCP/TBT, mobil | `610a10a7` üzerinde yeniden ölçüm; route bazlı lazy load, admin ayrımı |
| 3 | `sameAs` boş | Marka bilgisi zayıf | `data/seo/site.json` sosyal URL’ler |
| 4 | OG görsel SVG | Bazı paylaşım önizlemeleri zayıf | PNG/WebP 1200×630 |
| 5 | `performance-check.cjs` kaynak drift | CI gürültüsü | `perf:importmap` yorum işareti veya script güncelleme |
| 6 | AdSense script/CSP/çerez yok | Monetizasyon + KVKK | Politika + CMP genişletme (onaylı) |

---

## 7. Onay sonrası uygulama sırası (önerilen)

Aşağıdaki sırayı **sizin onayınızdan sonra** uygulayacağız:

1. **GSC operasyonel SEO** — Sitemap gönder (178 URL), 5–10 öncelik URL “İndeks iste”, CWV ve zengin sonuç raporlarını izle. *(Mülk doğrulaması DNS TXT ile PASS.)*
2. **Canlı `ads.txt` doğrulama** — Deploy sonrası prod `/ads.txt` statik içerik döndürüyor mu kontrol; gerekirse routing düzeltmesi.
3. **AdSense başvuru** — Siz: hesap + site onayı → Biz: onaylı `ca-pub-…` ile script + birim yerleşimi (sayfa seçimi sizinle); `ads.txt` repoda mevcut.
4. **Çerez / KVKK** — Reklam çerezleri, banner metni, consent gate, gizlilik sayfası.
5. **CSP güncelleme** — `_headers` AdSense domainleri.
6. **Performans sprint** — `610a10a7` build sonrası bundle ölçümü; admin chunk ayrımı, LHCI 90+ hedefi.
7. **SEO güven** — `sameAs`, OG PNG, isteğe bağlı `lastmod` sitemap.
8. *(Opsiyonel)* **HTML tag doğrulaması** — URL-prefix mülkü seçilirse `GOOGLE_SITE_VERIFICATION` secret + deploy; DNS PASS iken gerekmez.

---

## 8. Sizden gereken bilgiler (onay paketi)

Lütfen onay verirken mümkünse şunları iletin:

- [x] GSC mülk doğrulaması — **Domain Property / DNS TXT (PASS)**
- [ ] `GOOGLE_SITE_VERIFICATION` secret *(opsiyonel — yalnızca URL-prefix + HTML tag yöntemi seçilirse)*
- [ ] Canlı `/ads.txt` prod test sonucu (deploy sonrası)  
- [ ] AdSense: başvuru yapılsın mı? (evet/hayır) — evet ise hedef sayfalar (ör. yalnızca `/rehber/*`)  
- [ ] AdSense onaylı `ca-pub-XXXXXXXX` (onay sonrası — repodaki `pub-6412697542113702` ile uyum kontrolü)  
- [ ] Sosyal profil URL’leri (`sameAs`)  
- [ ] Reklam gösterimi: tüm site / yalnızca rehber / hiç (sadece GSC)

---

## 9. Artefaktlar & referans dokümanlar

| Dosya | Açıklama |
|-------|----------|
| `dist/production-health-audit.json` | Üretim sağlık audit (build sonrası) |
| `dist/bundle-report.json` | Bundle boyutları (**610a10a7 sonrası yeniden üretilmeli**) |
| `docs/PROJECT_HEALTH_REPORT.md` | Proje sağlık özeti |
| `docs/SEO_AUDIT.md` | SEO derinlemesine + GSC build entegrasyonu |
| `docs/SEO_INDEXABILITY_REPORT.md` | Güncel sitemap/indexability (178 URL, 2026-06-10) |
| `scripts/lib/gsc-verification.cjs` | GSC meta enjeksiyon kaynağı |
| `ads.txt` | AdSense publisher authorization (repo kök) |
| `data/seo/site.json` | `sameAs` ve statik URL tanımları |

---

*Bu rapor 2026-05-25 otomatik audit + canlı örnekleme ile üretilmiş; 2026-06-19’da `main` 610a10a7 ile hizalanmıştır. GSC mülk doğrulaması 2026-06’da DNS TXT ile tamamlanmıştır. Onayınız olmadan AdSense script veya reklam yerleşimi deploy edilmemelidir.*
