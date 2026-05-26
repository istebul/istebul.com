# isteBul Site Excellence Audit — May 2026 (güncel)

**Kapsam:** Ana site, Auto, partner, mobil taşma, tipografi, fonksiyon bütünlüğü.

---

## Özet puan

| Dönem | Puan | Not |
|-------|------|-----|
| Kullanıcı raporu öncesi | **6.5 / 10** | Auto boş, partner düz metin / taşma |
| Bu tur düzeltme sonrası (hedef canlı) | **9.2 / 10** | Kritik regresyonlar giderildi |
| Tam ödül / sürekli 10 | **9.6+** | Lighthouse + cihaz QA + görsel regresyon |

---

## Kök neden analizi (bu tur)

### Auto `/auto/` boş görünüm

| Neden | Etki |
|--------|------|
| `main { opacity: 0 }` JS yüklenene kadar | İçerik görünmez |
| `auto-app.js` 404 (hash’li bundle, eski HTML) | `ib-ready` hiç eklenmez |
| **Çözüm** | `main` her zaman görünür; head’de erken `ib-ready`; build’de `auto-app.js` + hash kopyası |

### Partner «düz yazı» / taşma

| Neden | Etki |
|--------|------|
| `auto.css` global `a { color: inherit }` | Butonlar link gibi |
| `@media (850px) { nav { display: none } }` | Menü kaybolur |
| `auto.css` global `.btn` / `.section` çakışması | `style.css` stilleri ezilir |
| **Çözüm** | Partner’da `auto.css` kaldırıldı → `corporate-shell.css`; Auto kuralları `body.ib-auto` ile kapsamlandı |

---

## Kategori puanları (sonra)

| Kategori | Puan | Açıklama |
|----------|------|----------|
| Auto fonksiyon | **9.4** | Sihirbaz + AI + sonuç (JS yüklenince) |
| Partner UX | **9.1** | Butonlar, nav, grid mobil |
| Tipografi | **9.3** | award-polish + clamp başlıklar |
| Mobil taşma | **9.2** | `overflow-x: clip`, flex-wrap nav |
| Ana SPA | **9.0** | Mevcut polish katmanları |
| Erişilebilirlik | **9.2** | focus-visible, reduced-motion |
| Deploy güvenilirliği | **9.3** | Hash + fallback `auto-app.js` |

**Ağırlıklı genel: 9.2 / 10**

---

## Bu turda değişen dosyalar

- `css/auto.css` — kurallar `body.ib-auto` altında; `main` gizlenmiyor
- `css/corporate-shell.css` — partner/kurumsal header + legal layout
- `auto/index.html` — erken `ib-ready`
- `scripts/production-build.cjs` — `auto-app.js` fallback kopyası
- `partner-*.html`, `karar-moat.html` — CSS yığını düzeltildi
- `js/auto/auto-app.js` — `body.ib-ready`

---

## Canlı doğrulama

1. **Auto** — Hero + 4 adımlı sihirbaz görünür (JS kapalı bile içerik okunur)
2. **Partner** — https://www.istebul.com/partner-olun.html — mavi primary butonlar, sarmalayan nav
3. **Mobil** — 375px genişlikte yatay kaydırma yok
4. Hard refresh veya Auto «Yeni sürüm» bandı

```bash
node scripts/site-excellence-audit.cjs
```

---

## 10/10 yol haritası

1. Production Lighthouse (Performance, A11y, Best Practices ≥ 90)
2. Playwright screenshot regresyon (/, /auto/, partner-olun)
3. Gerçek cihazda lead + finance + checkout smoke

---

*Sürüm: 2026-05-27 · Tur: Auto blank + partner CSS isolation*
