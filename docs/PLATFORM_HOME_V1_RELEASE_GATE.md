# Platform Home v1 — Release Quality Gate (PR-563)

**Tarih:** 2026-07-15  
**Kapsam:** Ana sayfa (`index.html` / Platform Home v1) yayın öncesi doğrulama  
**Kod politikası:** Yeni özellik yok; yalnızca doğrulama + gerekli küçük a11y düzeltmeleri  
**Karar:** **READY WITH WARNINGS**

Tekrarlanabilir statik gate:

```bash
npm run build
npm run lint
npm run test:smoke
npm run test:accessibility
node scripts/audit-footer-links.cjs
node scripts/audit-homepage-links.cjs
node scripts/audit-seo.cjs
node scripts/platform-home-v1-quality-gate.cjs
```

Platform unit (home IA) odak:

```bash
SUPABASE_URL=http://localhost SUPABASE_ANON_KEY=test \
  node --experimental-strip-types --no-warnings --test \
  tests/unit/platform-footer-ia.test.mjs \
  tests/unit/platform-nav-ia.test.mjs \
  tests/unit/platform-shell-home.test.mjs \
  tests/unit/i18n-marketing.test.mjs \
  tests/unit/home-category-prerender.test.mjs
```

---

## Yayın kararı

### READY WITH WARNINGS

Fonksiyonel / SEO sözleşmeleri / link sağlığı / smoke / lint / build / responsive / statik a11y kapıları geçti.  
Ancak lab CWV (özellikle mobil Lighthouse + CLS), Cloudflare soft-404 borcu ve suite-içi Garson/AdSense birim test kırıkları nedeniyle **koşullu yayın** önerilir.

---

## Kontrol matrisi (25 madde)

| # | Kontrol | Sonuç | Not |
|---|---|---|---|
| 1 | Build | PASS | `npm run build` exit 0 |
| 2 | Lint | PASS | `npm run lint` exit 0 |
| 3 | Unit test | WARN | Full suite **4423 pass / 5 fail** (home dışı); Platform Home suite **pass** |
| 4 | Smoke | PASS | `npm run test:smoke` |
| 5 | Broken link | PASS | `audit-homepage-links`, `audit-site-links` |
| 6 | Hash link | PASS | `#home`, `#landing-faq`, `#home-guides-strip`, `#how-it-works`, `#home-vertical-focus` |
| 7 | Responsive 320–1920 | PASS | Manual/device emulation — yatay taşma yok |
| 8 | Core Web Vitals | WARN | Desktop LCP iyi; CLS sınır üstü; mobil lab kötümser (local serve) |
| 9 | Lighthouse | WARN | SEO 100; A11y 94; Perf/BP ortam + borç |
| 10 | HTML doğruluğu | PASS | DOCTYPE, lang, build inline-handler audit OK |
| 11 | ARIA | WARN→fix | Geçersiz `role="listitem"` kaldırıldı (küçük düzeltme) |
| 12 | Klavye | PASS | Tab + odak halkaları; hash hedefler |
| 13 | Footer linkleri | PASS | `audit-footer-links` 36 unique, 5 rehber |
| 14 | Platform ürün kartları | PASS | `#platform-shell-home` + catalog CTA unit |
| 15 | CTA yönlendirmeleri | PASS | `/karar-asistani/`, ürün CTA’ları korundu |
| 16 | Analytics eventleri | PASS | `cta_decision_*` placement’ları wired; analytics audit OK |
| 17 | Schema.org | PASS | `data/schema/home-graph.json` + head link |
| 18 | OpenGraph | PASS | og:title/description/url/image |
| 19 | Twitter Card | PASS | `summary_large_image` |
| 20 | Canonical | PASS | `https://www.istebul.com/` |
| 21 | hreflang | PASS | tr/en/de/ar/it/fr/es/ja/zh + x-default |
| 22 | robots.txt | PASS | Allow/+/Sitemap satırı |
| 23 | sitemap | PASS | Ana sayfa `loc` mevcut |
| 24 | 404 | WARN | `serve` 404 verir; Cloudflare `/* → index.html 200` soft-404 riski (404.html yok) |
| 25 | favicon | PASS | `/favicon.ico` + dist kopyası |

---

## Bulgular

### Kritik

_Yok._

### Yüksek

1. **Mobil lab LCP / FCP (Lighthouse mobile Perf ~30)**  
   - **Etki:** Lab “kırmızı”; alan CWV’yi garanti etmez ama yayın öncesi risk işareti.  
   - **Çözüm:** Cloudflare edge’de field RUM / CrUX doğrula; render-blocking + unused JS/CSS azaltma (ayrı performans PR).  
   - **Öncelik:** Yüksek (ölçüm takibi); home v1 go/no-go’yu tek başına bloklamaz çünkü local `serve` sıkıştırmasız.

2. **CLS (desktop lab ~0.189, mobile lab ~0.897)**  
   - **Etki:** Görsel kayma — cookie/banner, geç hydrate yüzeyler, font/shell.  
   - **Çözüm:** Layout-shift kaynaklarını field + DevTools ile hedefle (ayrı PR); rezervasyon boyutları / late inject azalt.  
   - **Öncelik:** Yüksek.

### Orta

3. **Cloudflare soft-404 (`/* /index.html 200`, `404.html` yok)**  
   - **Etki:** Bilinmeyen URL’ler 200 + ana sayfa içeriği → SEO soft-404.  
   - **Çözüm:** Markalı `404.html` + yönlendirme sıkılaştırma (ayrı PR; bu PR’da yeni UI yok).  
   - **Öncelik:** Orta.

4. **Lighthouse a11y: color-contrast (footer subhead / bazı kart badge-CTA)**  
   - **Etki:** WCAG AA kontrast uyarıları.  
   - **Çözüm:** Design-token kontrast iyileştirmesi (footer/kart) — görsel redesign değil, token tweak.  
   - **Öncelik:** Orta.

5. **Lighthouse a11y: heading-order (footer `h4` sırası)**  
   - **Etki:** Başlık hiyerarşisi uyarısı.  
   - **Çözüm:** Footer başlık seviyesini outline’a hizala (IA bozmadan).  
   - **Öncelik:** Orta.

6. **Full unit suite 5 fail (Platform Home dışı)**  
   - AdSense: ERP/CX HTML’de script yok (`dist/garson/erp/...`)  
   - Garson realtime mock (`unsubscribe` eksik)  
   - Garson production env tests: `SUPABASE_ANON_KEY=test` pollute  
   - Retention saved-decisions async `window` leak  
   - **Etki:** CI gürültüsü; Home v1 fonksiyonunu bozmaz.  
   - **Çözüm:** İlgili suite sahiplerine ayrı PR (Garson/Business’a bu gate’de dokunulmadı).  
   - **Öncelik:** Orta (CI hijyeni).

### Düşük

7. **Best Practices 74 (3P cookie / console / inspector)**  
   - **Etki:** Lab BP skoru.  
   - **Çözüm:** Consent + üçüncü parti yükleme yolunu gözden geçir.  
   - **Öncelik:** Düşük.

8. **Local LH’de text-compression uyarısı**  
   - **Etki:** Sadece `serve` ortamı; prod Cloudflare sıkıştırır.  
   - **Çözüm:** Lab’i prod-like proxy ile koş.  
   - **Öncelik:** Düşük.

---

## Bu PR’daki küçük düzeltmeler

- Kategori kartlarında ve fiyatlandırma kartlarında geçersiz `role="listitem"` kaldırıldı; kapsayıcı `role="group"`.
- Ana sayfa `filter-btn` / `add-listing-btn` → `type="button"`.
- Gate script: `scripts/platform-home-v1-quality-gate.cjs`.

---

## Lighthouse özeti (lab, `http://127.0.0.1:4173/` dist)

| Form factor | Perf | A11y | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Mobile | 30 | 94 | 74 | 100 | 11.6s | 0.897 | 191ms |
| Desktop | 91 | 94 | 74 | 100 | 0.6s | 0.189 | 0ms |

Artifact’lar: `/opt/cursor/artifacts/pr563/` (`lh-mobile.json`, `lh-desktop.json`, viewport screenshot’lar).

---

## Bilinen teknik borçlar

- SPA soft-404 (404 sayfası yok)
- Home CLS kaynakları
- Mobil bundle/unused JS ağırlığı
- Full unit suite’in Garson/AdSense kırıkları
- Footer kontrast / heading-order

---

## Geri alma

Küçük a11y commit’ini `git revert` etmek yeterlidir. Rapor/script silinse kapı doğrulaması etkilemez; ürün davranışı değişmez.
