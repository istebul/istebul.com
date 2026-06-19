# Routing Öneri Raporu — `/karar-asistani`, `/karsilastir`, `/secenekler`

**Tarih:** 2026-06-08  
**Kapsam:** Mevcut SPA routing yapısına dokunulmadan, yalnızca öneri.  
**İlke:** isteBul bir ilan sitesi değil; AI destekli karar verme platformudur. Skor/TCO/risk hesapları deterministik kalır.

---

## Mevcut durum

| Yol | Bileşen | Kaynak |
|-----|---------|--------|
| `/karar-asistani` | `page-karar-analizi` | `js/core/router.js`, `js/runtime/route-surface.js` |
| `/karsilastir` | `compare` | Aynı |
| `/secenekler` | `ilanlar` | Aynı |

Bu rotalar SPA (`js/app.js`) içinde client-side yönlendirme ile çalışıyor. Cloudflare Pages `_routes.json` tüm `/*` isteklerini statik dosyalara yönlendiriyor; SPA fallback `index.html` üzerinden bootstrap ediliyor.

**Risk:** Doğrudan URL erişiminde (ör. paylaşılan link, GSC taraması) route bootstrap sırası veya eski bookmark'lar (`/ilanlar/`) tutarsız davranış üretebilir.

---

## Önerilen hedef mimari (aşamalı)

### Aşama 1 — Canonical URL netleştirme (düşük risk)

1. **Tek canonical set:** `/karar-asistani`, `/karsilastir`, `/secenekler` dışındaki alias'lar (`/ilanlar`, `/karar-analizi` vb.) 301 ile canonical'a yönlendirilsin.
2. **`route-document-meta.json` ve sitemap** yalnızca canonical URL'leri içersin.
3. **İç linkler** `data-native-route` ile SPA navigasyonu kullanmaya devam etsin; harici/SEO linkleri canonical path'e işaret etsin.

### Aşama 2 — Statik prerender yüzeyleri (orta risk)

Karar platformu kimliğini güçlendirmek için:

| Rota | Önerilen statik yüzey | Gerekçe |
|------|----------------------|---------|
| `/karar-asistani` | `karar-asistani/index.html` veya mevcut hub | SEO + ilk boyama; “karar asistanı” mesajı |
| `/karsilastir` | `karsilastir/index.html` | Karşılaştırma merkezi — ilan listesi değil |
| `/secenekler` | **Yeniden konumlandır** veya `/auto/`, `/konut/` vb. hub'lara böl | “Seçenekler” ilan çağrışımı yapıyor; karar kategorilerine yönlendirme daha uyumlu |

`/secenekler` için iki seçenek:

- **Seçenek A (muhafazakâr):** Sayfa başlığı ve hero metni “Karar seçenekleri” / “Kategori karşılaştırması” olarak güncellenir; route adı korunur.
- **Seçenek B (stratejik):** `/secenekler` → `/` veya kategori hub'larına 301; SPA route deprecate edilir (6 ay uyarı bandı).

### Aşama 3 — Cloudflare redirects manifest (düşük-orta risk)

`scripts/cloudflare-redirects-audit.cjs` ile uyumlu bir `_redirects` veya Workers kural seti:

```
/karar-asistani/*  /index.html  200
/karsilastir/*     /index.html  200
/secenekler/*      /index.html  200
/ilanlar           /secenekler  301
/ilanlar/*         /secenekler  301
```

200 rewrite SPA fallback; 301 eski alias temizliği.

### Aşama 4 — Test ve gözlemlenebilirlik

- `tests/unit/router.test.mjs` — canonical path seti sabitlensin.
- `tests/e2e/site-health.spec.mjs` — doğrudan URL smoke (200 + `#app` veya route surface mount).
- Analytics event: `route_surface_mismatch` — bootstrap path ≠ `location.pathname` durumunda uyarı.

---

## Dokunulmaması gerekenler (bu patch ile uyumlu)

- Skor motorları (`js/decision/*`, `js/features/kasko/kasko-engine.js`, `js/features/sigorta/sigorta-engine.js`) — deterministik.
- AI katmanı yalnızca açıklama/sentez (`ai-decision-commentary`, `kasko-ai-summary`).
- Vertical ürün rotaları (`/auto/`, `/kasko/`, `/sigorta/`, `/konut/`, `/finans/`, `/tatil/`) — ayrı statik uygulamalar.

---

## Öncelik sırası

1. Canonical redirect tablosu + sitemap uyumu (**hemen, kod değişikliği minimal**)
2. `/secenekler` UX kopyası — ilan dilinden karar diline (**içerik, routing yok**)
3. Statik prerender hub'ları (**ürün kararı sonrası**)
4. `/secenekler` route deprecate (**strateji onayı gerekir**)

---

## Sonuç

Routing değişikliği yapılmadan önce **Aşama 1** (canonical + redirect) yeterli güvenlik marjı sağlar. `/secenekler` adının platform vizyonuyla çelişmesi en büyük ürün borcu; teknik borç değil, isimlendirme/IA konusudur. Bu rapor uygulanana kadar mevcut SPA routing korunmalıdır.
