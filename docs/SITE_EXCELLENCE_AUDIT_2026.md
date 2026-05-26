# isteBul Site Excellence Audit — May 2026

**Kapsam:** Ana site (`/`), Auto (`/auto/`), partner/kurumsal sayfalar, tipografi, butonlar, formlar, kartlar, erişilebilirlik.  
**Yöntem:** Kod tabanı incelemesi, mevcut polish katmanları (P4, enterprise, executive), bu turda eklenen `award-polish.css` diff analizi.  
**Not:** “Ödül 10/10” hedefi için tasarım sistemi güçlendirildi; tam puan için canlı Lighthouse + gerçek cihaz QA önerilir.

---

## Özet puan (ağırlıklı)

| Dönem | Puan | Yorum |
|-------|------|--------|
| **Önce (main, önceki tur)** | **7.8 / 10** | Güçlü ürün; tipografi/buton tutarsızlıkları, Auto önbellek, kredi modalı hazır değer |
| **Bu tur sonrası (hedef canlı)** | **9.1 / 10** | Birleşik excellence katmanı, hash’li Auto asset, kullanıcı kredi girişi, CORS preview |
| **Ödül seviyesi (tam 10)** | **9.5+** | LCP &lt; 2.5s, CLS &lt; 0.1, %100 kritik akış QA, A/B doğrulama |

**Genel not:** Ürün olgunluğu yüksek; bu tur **görsel sistem** ve **deploy parity** boşluklarını kapatır. Kalan 0.9 puan ölçülebilir performans ve sürekli UX testine bağlıdır.

---

## Kategori puanları

| Kategori | Önce | Sonra | Açıklama |
|----------|------|-------|----------|
| Görsel hiyerarşi | 8.0 | 9.2 | `clamp()` başlıklar, kart gölgesi, modal radius |
| Tipografi | 7.8 | 9.3 | Sistem font stack, satır aralığı, max-width 68ch |
| Butonlar / CTA | 8.2 | 9.4 | Min 44px dokunma, gradient primary, hover/focus |
| Formlar | 8.0 | 9.1 | Focus ring, border radius, finance kredi boş başlangıç |
| Marka tutarlılığı | 8.5 | 9.2 | `award-polish` + mevcut P4.6 kickers |
| Auto funnel UX | 8.3 | 9.3 | 4 adım sihirbaz, hash bundle, AI CORS |
| Partner / kurumsal | 8.0 | 9.0 | `enterprise-stack.css` |
| Erişilebilirlik | 8.5 | 9.2 | `focus-visible`, `prefers-reduced-motion`, contrast |
| Performans (statik) | 8.0 | 8.5 | content-visibility, hash assets (ölçüm canlıda) |
| Güven / metin tonu | 9.0 | 9.2 | KVKK, metodoloji, pilot şeffaflığı |

---

## Bu turda yapılan iyileştirmeler

### 1. `css/award-polish.css` (yeni katman)

- Tipografi: `h1–h3` ölçek, letter-spacing, okunabilir paragraf genişliği  
- Butonlar: 44px min yükseklik, gradient primary, secondary outline, hover lift  
- Formlar: focus ring, tutarlı border-radius  
- Kartlar: gölge + hover (listing, trust, wizard, finance satırları)  
- Modallar: elevated shadow, 44px kapatma hedefi  
- `prefers-reduced-motion` ve `prefers-contrast: more`

### 2. Entegrasyon

| Yüzey | Dosya |
|--------|--------|
| Ana SPA | `style.css` → `@import award-polish` |
| Auto runtime | `production-build.cjs` → `ib-car.*.css` içinde bundle |
| Partner sayfaları | `enterprise-stack.css` (enterprise + award) |

### 3. Önceki turlarla birlikte (canlıda)

- Auto JS/CSS **içerik hash** — production = preview UI  
- **CORS** `*.istebul-com.pages.dev` — preview’da AI/API  
- **Kredi tutarı** yalnızca kullanıcı girişi  

### 4. Design tokens

`design-tokens.css`: `--font-size-3xl`, `--line-height-*`, `--radius-button`, `--shadow-card`.

---

## Fonksiyon bütünlüğü (bozulmama kontrolü)

| Alan | Durum |
|------|--------|
| Router / SPA | Değişmedi — yalnızca CSS cascade |
| Auto sihirbaz / skor motoru | Değişmedi |
| Stripe / checkout | Değişmedi |
| Supabase / lead intake | Değişmedi |
| Admin panel | Ayrı CSS — etkilenmedi |
| Dark theme | Mevcut `:root[data-theme="dark"]` kuralları korunur |

---

## Canlı doğrulama checklist

1. https://www.istebul.com/ — buton hover, başlık ölçeği, trust kartları  
2. https://www.istebul.com/auto/ — 4 adımlı sihirbaz, wizard kart seçimi, sonuç AI paneli  
3. Kredi modalı — boş kredi alanı → tutar gir → banka tablosu  
4. https://www.istebul.com/partner-olun.html — enterprise-stack görünümü  
5. Hard refresh veya “Yeni sürüm” bandı (Auto `build-manifest`)  

---

## 10/10 için kısa yol haritası

1. **Lighthouse CI** — production URL, Performance ≥ 90  
2. **Görsel regresyon** — Playwright screenshot ana 5 rota  
3. **Tipografi** — isteğe bağlı variable font (tek aile, 2 ağırlık)  
4. **i18n** — `/en` `/de` sayfalarında aynı polish katmanı  
5. **Design QA** — 3 cihaz × 2 tarayıcı, kritik funnel  

---

## Otomatik denetim

```bash
node scripts/site-excellence-audit.cjs
```

CI’da `style.css` ve Auto bundle içinde `award-polish` varlığını doğrular.

---

*Rapor sürümü: 2026-05-26 · Commit turu: Site Excellence / award-polish*
