# EPIC-002 — Platform Cutover URL Matrisi

**Belge türü:** Cutover hazırlık sözleşmesi (PR-567)  
**Durum:** PR-568 cutover uygulandı — `/` = Platform Landing, `/ai/` = İSTEBUL AI (indexable)  
**Kaynak kod:** `src/platform/constants/platform-url-map.ts`

---

## 1. Amaç

Platform Cutover sırasında değişecek (veya değişmeyecek) URL’leri tek tabloda kilitlemek.
Canlı davranış `current` sütunudur. `target` onaylı cutover PR’ına kadar **aktif değildir**.

---

## 2. Ürün / yüzey matrisi

| Anahtar | Rol | CURRENT (canlı) | TARGET (cutover) | Redirect? | SEO notu |
|---------|-----|-----------------|------------------|-----------|----------|
| `platform-root` | Platform hub | `/` | `/` | Hayır (anlam değişir) | Cutover’da canonical/schema/sitemap kök = Platform Landing |
| `istebul-ai` | AI ürün girişi | `/` | `/ai/` | İsteğe bağlı `/`→platform; AI deep-link’ler `/ai` | `/ai` bugün **noindex** — indexleme ayrı SEO PR |
| `garsonai` | GarsonAI girişi | `/garson/` | `/garson/` | Hayır | Değişmez |
| `business` | Business girişi | `/business/` | `/business/` | Hayır | Değişmez |
| `ai-landing` | AI Landing yüzeyi | `/ai/` | `/ai/` | — | Paralel klon (PR-566); cutover öncesi noindex |
| `ai-funnel` | Karar funneli | `/karar-asistani/` | `/karar-asistani/` | Hayır | Ürün girişi değil |
| `ai-pricing` | Planlar | `/planlar` | `/planlar` | Hayır | AI yüzeyi |
| `platform-preview` | Preview hub | `/platform-preview/` | `/platform-preview/` veya kaldır | Ayrı karar | noindex |

**CURRENT ≠ TARGET olan tek ürün girişi:** `istebul-ai` (`/` → `/ai/`).

---

## 3. Chrome (nav / footer) geçiş noktaları

| Yüzey | Bugün | Prep fasadı | Cutover’da |
|-------|-------|-------------|------------|
| Home nav Ürünler | `index.html` hardcoded | `PLATFORM_NAV_PRODUCT_LINKS_CURRENT` | `*_TARGET` veya faz bayrağı |
| Home footer Ürünler | `index.html` (`/#home`, …) | `PLATFORM_FOOTER_PRODUCT_LINKS_CURRENT` | AI → `/ai/` |
| Katalog kartları | `PLATFORM_PRODUCTS.url` (= current) | URL map current | map target |
| `/ai` chrome | `ai/index.html` hardcoded | (henüz bağlı değil) | AI chrome + map |
| `/platform-preview` | katalog current | aynı | ayrı karar |

PR-567 bu satırların **hiçbirini HTML’de yeniden yazmaz**.

---

## 4. Açık non-goals (bu PR ve prep aşaması)

- Ana sayfa (`/`) görünüm cutover  
- `/ai` noindex kaldırma / sitemap / robots  
- Canonical / meta / schema değişimi  
- Cloudflare `_redirects` traffic flip  
- GarsonAI / Business route veya ürün mantığı  
- Navigation / footer kullanıcıya görünen link değişimi  

---

## 5. Cutover PR checklist (gelecek)

1. Onay: SEO + ürün + platform  
2. `PLATFORM_URL_ACTIVE_PHASE` veya tüketicileri `target`’a taşı  
3. `index.html` nav/footer’ı fasaddan üret veya eşitle  
4. `/ai` indexability + home schema/canonical taşıma  
5. Redirect matrisi (`_redirects`) + locale shell’ler  
6. Audit / e2e / smoke yeşil  

Kaynak yardımcılar: `listPlatformUrlCutoverDeltas()`, `PLATFORM_INTERNAL_LINK_CONTRACT`.

---

## 6. İlgili belgeler

- [`PLATFORM_MİMARİSİ.md`](./PLATFORM_MİMARİSİ.md)  
- [`GELİŞTİRME_PRENSİPLERİ.md`](./GELİŞTİRME_PRENSİPLERİ.md)  
- `src/platform/README.md`
