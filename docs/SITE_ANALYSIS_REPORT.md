# Site Analiz Raporu — isteBul (www.istebul.com)

**Tarih:** 2026-05-25  
**Kapsam:** Canlı site (WebFetch + curl), üretim build (`dist/`), otomatik audit zinciri  
**Genel durum:** **Üretime hazır (YELLOW)** — gelir/SEO monetizasyonu ve performans iyileştirmeleri onay bekliyor

---

## 1. Yönetici özeti

| Alan | Skor | Not |
|------|------|-----|
| Build & CI audit | **GREEN** | `npm run build`, `production:audit` 24/24 geçti |
| UX / dönüşüm (statik) | **GREEN** | P4.3 mobil, P4.4 conversion audit geçti |
| Uyumluluk (statik) | **GREEN** | Compliance + launch audit geçti |
| SEO teknik altyapı | **GREEN** | 28 URL sitemap, robots, schema, rehber sayfaları |
| Canlı içerik | **GREEN** | Ana sayfa karar altyapısı mesajı ve CTA’lar doğru |
| Performans (bundle) | **YELLOW** | Ana SPA ~818 KB (limit 921 KB); tek chunk 364 KB |
| Google Search Console | **TURUNCU** | Mülk sizde; repoda doğrulama etiketi yok |
| Google AdSense | **KIRMIZI** | `ads.txt` yok; canlı `/ads.txt` HTML döndürüyor |
| Otomasyon curl/Lighthouse | **SINIRLI** | Cloudflare bot challenge (403); Googlebot etkilenmeyebilir |

**Sonuç:** Site işlevsel ve yayında. Tam kapasite için **AdSense hazırlığı**, **GSC doğrulama kodunun repoya eklenmesi**, **bundle küçültme** ve **çerez/CSP güncellemesi** sırayla yapılmalı — aşağıdaki onay listesi.

---

## 2. Canlı site taraması

### 2.1 Erişilebilirlik

| URL | curl (agent) | WebFetch | Bulgu |
|-----|--------------|----------|--------|
| `/` | 403 (CF challenge) | **OK** | İçerik, H1, CTA, planlar bölümü render |
| `/robots.txt` | 200 | **OK** | Sitemap satırı + disallow kuralları |
| `/sitemap.xml` | 403 | Zaman aşımı | Büyük olasılıkla CF; GSC’de manuel kontrol önerilir |
| `/ads.txt` | 200 ama **HTML** | — | SPA fallback — AdSense için **kritik hata** |
| `/auto/` | 403 | — | Tarayıcıda doğrulanmalı |

Cloudflare “Just a moment…” otomasyonu engelliyor; bu **insan kullanıcıları** ve **Googlebot** için genelde sorun değildir. Yine de GSC “Sayfa getirme” ve “Canlı test” ile doğrulayın.

### 2.2 Görsel / marka / dönüşüm (canlı gözlem)

- Konumlandırma tutarlı: “karar altyapısı”, TCO, metodoloji.
- Birincil CTA: “TCO analizini başlat”, ikincil: metodoloji / planlar.
- Planlar: Ücretsiz / Pro ₺299 / Enterprise görünür.
- Eksik (organik güven): `organization.sameAs` boş (LinkedIn, X vb. yok).

---

## 3. Kod tabanı & build audit sonuçları

```
npm run build              ✓ (301 dosya)
npm run production:audit   ✓ 24 passed, 2 warnings, 0 fail
node page-health-audit     ✓
P4.3 mobile UX             ✓
P4.4 conversion UX         ✓
compliance-audit-check     ✓
launch-audit-check         ✓
accessibility-check        ✓
performance-check (kaynak) ✗ index.html'de perf:importmap işareti (dist OK)
```

**Bundle (`dist/bundle-report.json`):**

| Dosya | Boyut |
|-------|-------|
| `app.bundle-*.js` | 364 KB |
| `chunk-HMRE5TDJ.js` | 213 KB |
| `style.*.css` | 151 KB |
| **Toplam (SPA)** | **819 KB** |

**Uyarılar (production-health-audit):** TypeScript yok (bilinçli), SSR yok (bilinçli).

---

## 4. Google Search Console (mülk mevcut)

### Yapılabilir mi?

**Evet — kısmen otomatik, kısmen sizin panelinizde.**

| İş | Agent yapabilir? | Sizin yapmanız gereken |
|----|------------------|------------------------|
| HTML doğrulama meta etiketi | Evet (kod + deploy) | GSC → Doğrulama → meta `content` değerini paylaşın |
| DNS doğrulama | Hayır (Cloudflare DNS) | TXT kaydı ekleyin |
| Sitemap gönderme | Hayır | GSC → Sitemaps → `https://www.istebul.com/sitemap.xml` |
| URL denetimi / indeks | Hayır | Önemli URL’ler için “İste” |
| Yapılandırılmış veri raporu | Hayır | GSC → Zengin sonuçlar (Organization, WebSite, Article mevcut) |

**Repoda eksik:** `google-site-verification` meta etiketi veya `google*.html` dosyası yok.

**Önerilen GSC kontrol listesi (panel):**

1. Mülk: `https://www.istebul.com` (www tercih edin, `_redirects` ile uyumlu).
2. Sitemap durumu: Gönderildi mi, hata var mı?
3. `/rehber/*`, `/auto/`, `/karar-asistani/` için URL denetimi.
4. Mobil kullanılabilirlik + Core Web Vitals (alan verileri 28 gün gecikmeli).

---

## 5. Google AdSense

### Yapılabilir mi?

**Başvuru ve onay sizin Google hesabınızda; teknik entegrasyon onay sonrası kodla yapılır.**

| Gereksinim | Durum |
|------------|--------|
| `ads.txt` kök dosyası | **YOK** — build’e eklenmeli |
| `/ads.txt` SPA fallback’i engelleme | **YOK** — `_redirects` öncesi statik kural gerekli |
| AdSense script + reklam birimleri | **YOK** |
| CSP (`_headers`) `pagead2.googlesyndication.com` | **YOK** |
| Çerez politikası “reklam” kategorisi | **YOK** (yalnızca analitik + Sentry) |
| İçerik hacmi / politika uyumu | Karar aracı — AdSense **reddedilebilir**; önce GSC organik trafik |

**Canlı test:** `GET /ads.txt` → ana sayfa HTML döner (publisher doğrulaması **başarısız**).

**İş modeli notu:** Ücretli Pro abonelik + partner geliri varken sayfa içi AdSense dönüşümü düşürebilir; rehber/blog sayfalarında sınırlı gösterim düşünülebilir.

---

## 6. Tam kapasite engelleri (öncelik sırası)

| # | Engel | Etki | Önerilen çözüm |
|---|--------|------|----------------|
| 1 | `/ads.txt` → SPA | AdSense imkânsız | Statik `ads.txt` + redirect istisnası |
| 2 | GSC doğrulama kodu repoda yok | Otomatik deploy ile doğrulama yapılamaz | Meta veya DNS (sizden token) |
| 3 | Ana JS bundle 364 KB + chunk 213 KB | LCP/TBT, mobil | Route bazlı lazy load, admin ayrımı |
| 4 | `sameAs` boş | Marka bilgisi zayıf | `data/seo/site.json` sosyal URL’ler |
| 5 | OG görsel SVG | Bazı paylaşım önizlemeleri zayıf | PNG/WebP 1200×630 |
| 6 | `performance-check.cjs` kaynak drift | CI gürültüsü | `perf:importmap` yorum işareti veya script güncelleme |
| 7 | AdSense yok + çerez metni | Monetizasyon + KVKK | Politika + CMP genişletme (onaylı) |

---

## 7. Onay sonrası uygulama sırası (önerilen)

Aşağıdaki sırayı **sizin onayınızdan sonra** uygulayacağız:

1. **GSC doğrulama** — Siz: meta `content` veya DNS TXT paylaşın → Biz: `index.html` / Cloudflare DNS → deploy → GSC’de doğrula.
2. **`ads.txt` altyapısı** — Statik dosya + `_redirects` kuralı (`/ads.txt` → dosya, catch-all’dan önce).
3. **GSC operasyonel** — Siz: sitemap gönder, 5–10 öncelik URL “İndeks iste”, CWV raporunu kaydet.
4. **AdSense başvuru** — Siz: hesap + site onayı → Biz: `ca-pub-…` ile `ads.txt` + script + birim yerleşimi (sayfa seçimi sizinle).
5. **Çerez / KVKK** — Reklam çerezleri, banner metni, `js/app.js` consent gate, gizlilik sayfası.
6. **CSP güncelleme** — `_headers` / `netlify.toml` AdSense domainleri.
7. **Performans sprint** — Admin chunk ayrımı, rehber sayfalarında hafif şablon, LHCI 90+ hedefi.
8. **SEO güven** — `sameAs`, OG PNG, isteğe bağlı `lastmod` sitemap.

---

## 8. Sizden gereken bilgiler (onay paketi)

Lütfen onay verirken mümkünse şunları iletin:

- [ ] GSC HTML doğrulama `content="…"` **veya** DNS yöntemi tercihi  
- [ ] AdSense: başvuru yapılsın mı? (evet/hayır) — evet ise hedef sayfalar (ör. yalnızca `/rehber/*`)  
- [ ] AdSense onaylı `ca-pub-XXXXXXXX` (onay sonrası)  
- [ ] Sosyal profil URL’leri (`sameAs`)  
- [ ] Reklam gösterimi: tüm site / yalnızca rehber / hiç (sadece GSC)

---

## 9. Artefaktlar

| Dosya | Açıklama |
|-------|----------|
| `dist/production-health-audit.json` | Üretim sağlık audit |
| `dist/bundle-report.json` | Bundle boyutları |
| `docs/PROJECT_HEALTH_REPORT.md` | Proje sağlık özeti |
| `docs/SEO_AUDIT.md` | SEO derinlemesine |

---

*Bu rapor otomatik audit + canlı örnekleme ile üretilmiştir. Onayınız olmadan GSC/AdSense kodu veya reklam yerleşimi deploy edilmemelidir.*
