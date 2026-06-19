# isteBul SEO Audit — Türkiye Organik Edinim

**Tarih:** 2026-05-23  
**Hedef:** Türkiye araç alım karar intent’lerinde organik trafik ve dönüşüm (Auto analiz, partner lead).

## Özet

| Alan | Önce | Sonra |
|------|------|--------|
| Landing / rehber | Yok | 12 sayfa `/rehber/{slug}/` |
| Hub sayfaları | SPA kopyası (aynı `index.html`) | Statik SEO hub: `/karar-asistani/`, `/ilanlar/`, `/karsilastir/` |
| Sitemap | 5 URL, bazıları ince içerik | 20+ URL, öncelik ve changefreq |
| robots.txt | Minimal | Admin/profil disallow + sitemap |
| Corporate meta | Generic | Canonical + OG + TR açıklamalar |
| Ana sayfa H1 | 2× H1 (nav + hero) | Tek H1 (hero), marka `span.brand-title` |
| Auto sayfa | Title/description only | Canonical, OG, Twitter, JSON-LD |
| Internal linking | Zayıf footer | Footer Rehber + Platform hub linkleri |

## Keyword Opportunities (TR)

| Intent | Örnek sorgu | Hedef URL |
|--------|---------------|-----------|
| Finansman | araç kredisi hesaplama | `/rehber/arac-kredisi-hesaplama/` |
| Maliyet | toplam sahip olma maliyeti araç | `/rehber/arac-toplam-sahiplik-maliyeti/` |
| İkinci el | ikinci el araç alırken dikkat edilecekler | `/rehber/ikinci-el-arac-alirken/` |
| Segment | suv mu sedan mı | `/rehber/suv-mi-sedan-mi/` |
| EV | elektrikli araç alırken | `/rehber/elektrikli-arac-alirken/` |
| Karşılaştırma | araç karşılaştırma | `/karsilastir/`, `/rehber/arac-karsilastirma-rehberi/` |
| Marka + ürün | araç karar asistanı | `/karar-asistani/`, `/auto/` |

## Teknik SEO

- **Canonical:** Tüm rehber/hub ve corporate sayfalarda `https://www.istebul.com` tabanlı canonical.
- **Schema:** Organization, WebSite, Article, FAQPage, BreadcrumbList, WebApplication (Auto).
- **Indexation:** `robots` index on public pages; `Disallow` admin, profil, messages, favoriler, gecmis.
- **Crawl:** Statik HTML öncelikli; SPA catch-all yalnızca oturum rotaları (`/profil/`, vb.).
- **Build:** `scripts/lib/seo.cjs` → `buildSeoPages`, `generateSitemap`, `generateRobots` (`npm run build`).
- **Search Console:** `GOOGLE_SITE_VERIFICATION` GitHub secret → build sırasında `<meta name="google-site-verification">` enjekte edilir (`scripts/lib/gsc-verification.cjs`). GSC’de sitemap: `https://www.istebul.com/sitemap.xml`.

## Performance SEO Blockers (bilinen)

| Konu | Etki | Öneri |
|------|------|--------|
| Ana `index.html` büyük CSS/JS | LCP, TBT | Mevcut hash + modulepreload; kritik CSS inline genişletilebilir |
| Turnstile (Auto) | Üçüncü parti script | `defer`, preconnect (mevcut) |
| Supabase preconnect | Erken bağlantı | Ana sayfada mevcut |
| `/* → index.html` | Yanlış soft-404 riski | Hub/rehber fiziksel dosya ile çözüldü |

## Content Gaps (sonraki iterasyon)

- Şehir bazlı landing (İstanbul, Ankara, İzmir araç alım rehberi)
- Marka/model long-tail (ör. «Corolla mı Civic mi») — veri kaynağı gerekir
- Blog / haber akışı ve `lastmod` sitemap alanı
- `hreflang` yalnızca TR olduğu için şimdilik gerek yok
- Search Console + yapılandırılmış veri doğrulama (deploy sonrası)

## Ölçüm

Platform analytics (`analytics-ingest`) ile organik landing → Auto başlatma funnel’ı izlenmeli. UTM’siz trafik için `document.referrer` ve landing path event’leri önerilir.

## Dosyalar

- `data/seo/*.json` — içerik ve URL envanteri
- `scripts/lib/seo.cjs` — HTML üretimi
- `css/seo-landing.css` — rehber stil
- `sitemap.xml`, `robots.txt` — build ile güncellenir
