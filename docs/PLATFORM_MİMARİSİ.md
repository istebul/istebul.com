# İSTEBUL — Platform Mimarisi

**Belge türü:** Platform Foundation Charter (PR-000)  
**Kapsam:** Mevcut durumun resmi haritası + hedef platform modeli (kod değişikliği yok)  
**İlgili:** [`GELİŞTİRME_PRENSİPLERİ.md`](./GELİŞTİRME_PRENSİPLERİ.md), [`TÜRKÇE_TERİM_STANDARTLARI.md`](./TÜRKÇE_TERİM_STANDARTLARI.md)

---

## 1. Platform yapısı

```text
                    ┌─────────────────────────────┐
                    │   İSTEBUL Platform Markası  │
                    │   (ortak kimlik / yönlendirme) │
                    └──────────────┬──────────────┘
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
   ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
   │  İSTEBUL AI   │       │   GarsonAI    │       │   Business    │
   │ Karar platformu│       │ Restoran İS   │       │ İş Zekâsı /   │
   │               │       │               │       │ işletme yönet.│
   └───────────────┘       └───────────────┘       └───────────────┘
```

**İlke:** Ürünler kardeş niteliğindedir; hiyerarşik alt modül değildir.

### 1.1 Ürün özeti

| Ürün | Giriş (mevcut) | Rol |
|------|----------------|-----|
| **İSTEBUL AI** | `/` (bugün AI pazarlama + SPA kabuğu), dikeyler `/auto/`, `/konut/`, … | Çok dikeyli AI karar destek |
| **GarsonAI** | `/garson/`, panel `/garson/panel/`, ERP `/garson/erp/`, müşteri `/r/…` | Restoran işletim sistemi |
| **Business** | `/business/` | İş Zekâsı / işletme yönetimi foundation yüzeyi |

### 1.2 Hedef kök davranış

| URL | Hedef rol |
|-----|-----------|
| `istebul.com/` | Yalnızca **Platform Landing** — kullanıcıyı doğru ürüne yönlendirir |
| Ürün girişleri | Ürün kendi mimarisinde yaşamaya devam eder |

> Not: `/` kesimi (cutover) bu charter’ın uygulama kapsamı dışındadır; ayrı, aşamalı entegrasyon planı ve onay ister. Bugün `/` hâlâ İSTEBUL AI pazarlama + SPA kabuğudur.

---

## 2. Ürün ilişkileri

### 2.1 İzin verilen ilişkiler

| İlişki | Örnek |
|--------|--------|
| Marka / legal escape | Garson veya Business footer → `/` veya yasal sayfalar |
| Keşif linki | Platform Landing → `/garson/`, `/business/`, AI girişi |
| Opsiyonel gelecekteki platform hizmetleri | Ortak abonelik / bildirim **adaptörü** (ürün iş kuralına sızmadan) |

### 2.2 Yasak ilişkiler

| İlişki | Neden |
|--------|--------|
| Ürün A UI’sinin ürün B admin’ine gömülmesi | Panel bağımsızlığı |
| Ortak zorunlu kullanıcı havuzu | Tenant / güvenlik / ürün hızı |
| Karar motorunun Garson sipariş akışına karışması | İş kuralı izolasyonu |
| Business foundation’ın AI `category-registry` dikeyi sayılması | Yanlış IA / yanlış bağımlılık |

### 2.3 IA uyarısı (mevcut durum)

Ana SPA navigasyonunda GarsonAI bugün “Karar Kategorileri” altında listelenir; Business ana nav’da yoktur. Bu durum **ürün modeli ile uyumsuzdur**. Düzeltme ayrı, dikkatli bir UX/PR işidir; bu charter yalnızca riski kayda geçirir.

---

## 3. Klasör organizasyonu

### 3.1 Platform / ortak (ince)

| Yol | Açıklama |
|-----|----------|
| `assets/brand/` | Ortak marka varlıkları |
| `css/ib-brand-logo-v1.css`, DS token dosyaları | Marka / design-system adayları |
| Yasal / kurumsal HTML | `kvkk.html`, `gizlilik.html`, `hakkimizda.html`, … |
| `docs/` | Mimari ve süreç (bu belgeler dahil) |

### 3.2 İSTEBUL AI (karar platformu)

| Yol | Açıklama |
|-----|----------|
| `index.html`, `js/app.js`, `js/core/router.js` | Ana SPA kabuğu |
| `js/features/`, `js/decision/`, `js/engines/`, `js/auto/` … | AI ürün mantığı ve dikeyler |
| `auto/`, `konut/`, `tatil/`, `finans/`, `sigorta/`, `kasko/`, … | Dikey giriş HTML’leri |
| `admin-panel.html`, `admin/` | AI / platform operasyon admin yüzeyleri |
| `css/homepage*.css`, `ai-decision-platform-home.css`, … | AI home / DS katmanları |

### 3.3 GarsonAI

| Yol | Açıklama |
|-----|----------|
| `garson/` | Pazarlama, başvuru, giriş, panel, mutfak, zeka yüzeyleri |
| `js/restoran/` | Garson runtime |
| `css/garsonai-*.css` | Garson tasarım sistemi |
| `apps/restaurant-admin-erp/` | React ERP → `/garson/erp/` |
| `apps/restaurant-customer-cx/` | Müşteri deneyimi → `/r/` |
| `functions/garson/` | Garson API (Pages Functions) |
| İlgili Supabase migrasyonları | Tenant / CX / ödemeler (ürün veri alanı) |

### 3.4 Business

| Yol | Açıklama |
|-----|----------|
| `business/index.html` (+ alt sayfalar) | Canlı giriş `/business/` MVP uygulaması |
| `css/business-page.css` | App shell + dashboard stilleri |
| `js/business/business-app.js` | TS foundation boot (esbuild bundle) |
| `src/business/` | Type-safe component / route / mock iskeleti (auth/API yok) |

### 3.5 Altyapı (çapraz kesen, dikkatli kullanım)

| Yol | Not |
|-----|-----|
| `functions/` | Ürün bazlı klasörleme tercih edilir; ortak proxy bilinçli sınırla |
| `supabase/` | Migrasyonlar ürün ön eki / sahiplik ile izlenmeli |
| `scripts/production-build.cjs` | Ürün bundle’larını ayırır (ör. Garson admin chunk) |
| `server.cjs`, `_redirects`, `wrangler.toml` | Yönlendirme ve barındırma — onaysız değiştirilmez |

---

## 4. Yönlendirme mantığı

### 4.1 Katmanlar

| Katman | Mekanizma |
|--------|-----------|
| Cloudflare Pages | `dist/` çıktısı; `_redirects` |
| SPA fallback | `/* → /index.html 200` (son kural) — AI kabuğu |
| Local | `server.cjs` statik + SPA fallback |
| Client SPA | `js/core/router.js` + `route-surface` |
| Full-page çıkış | `js/runtime/full-page-navigation.js` (`/garson`, `/business`, dikeyler, `*.html`) |

### 4.2 Ürün giriş sözleşmesi (hedef)

| Ürün | Giriş | Navigasyon türü |
|------|-------|-----------------|
| Platform | `/` (hedef) | İnce statik hub; ürün bundle’ı yok |
| İSTEBUL AI | Onaylı AI girişi + mevcut SPA/dikey path’ler | SPA + full-page dikeyler |
| GarsonAI | `/garson/` | Full-page ürün ağacı |
| Business | `/business/` | Full-page foundation |

### 4.3 Kesim riski

`/` Platform Landing’e alındığında etkilenecekler: SEO canonical, `sitemap.xml`, locale shell’ler (`/en`, `/de`, …), PWA `start_url`, “Ana sayfa” link anlamı, homepage audit / e2e. Bu yüzden yönlendirme matrisiz cutover **yasak** kabul edilir.

### 4.4 Cutover URL matrisi (PR-567 prep)

Canlı (`current`) vs hedef (`target`) URL kaydı ve chrome geçiş noktaları:

- Kod: `src/platform/constants/platform-url-map.ts`
- Doküman: [`EPIC_002_CUTOVER_URL_MATRIX.md`](./EPIC_002_CUTOVER_URL_MATRIX.md)

Prep PR kullanıcı trafiğini veya SEO’yu değiştirmez; yalnızca merkezi altyapıyı hazırlar.

---

## 5. Admin yapıları

| Ürün | Admin / operasyon yüzeyi | Bağımsızlık |
|------|---------------------------|-------------|
| İSTEBUL AI | `admin-panel.html`, `admin/*`, ilgili CRM/ops sayfaları | Ayrı |
| GarsonAI | `/garson/panel/*` (P6), `/garson/erp/*` (P7 React; P6’yı bilerek bozmaz) | Ayrı |
| Business | Henüz ayrı admin (yol haritasında); foundation’da yok | Ayrı olacak |

**Platform kuralı:** Admin birleştirme yok. Ortak “süper panel” önerilmez. Gelecekte operasyon görünürlüğü gerekirse **salt okunur platform gözlem** katmanı ayrı tasarlanır; ürün mutasyon API’leri birleştirilmez.

---

## 6. Paylaşılan katmanlar

### 6.1 Bugün fiilen paylaşılan (ince)

| Katman | Varlıklar |
|--------|-----------|
| Marka | `assets/brand/istebul-*.svg`, favicon / ikonlar |
| Legal | Kök yasal HTML |
| Ortam | `/env.js` (public config yüzeyi) |
| Bazı SEO/corporate shell stilleri | `seo-landing.css`, `corporate-footer-v1.css` (Business ve kurumsal) |
| Deploy iskeleti | Tek CF Pages projesi, çoklu statik giriş |

### 6.2 Bilinçli aday ortak hizmetler (gelecek; zorunlu değil)

Sıra önerisi (yalnızca ihtiyaç doğunca):

1. Marka + Platform Landing  
2. Tasarım token’ları / ortak UI kit (iş kuralı yok)  
3. Lisanslama / abonelik adaptörleri  
4. Bildirim altyapısı  
5. Kimlik doğrulama federasyonu (ürünler opt-in)

### 6.3 Paylaşılmayanlar

- Karar skor motorları ve AI dikey motorları  
- Garson rezervasyon / sipariş / mutfak / WhatsApp akışları  
- Business modül iş kuralları  
- Ürün admin kabukları ve React ERP/CX bileşenleri  

---

## 7. Tasarım sistemleri (ürün bazlı)

| Sistem | Kapsam |
|--------|--------|
| `istebul-design-system-v4` (+ premium v7) | İSTEBUL AI / bir kısım corporate-Business |
| `garsonai-design-system-v1` | GarsonAI marketing + admin görsel dili |
| React Tailwind/shadcn (apps) | Garson ERP / CX |

Platform Landing için öneri: **ince yeni yüzey** veya Business’e benzer SEO shell; `homepage.bundle` / Garson DS zorla import edilmez.

---

## 8. Gelecek yol haritası (standartlara uygun sıra)

Bu bölüm uygulama planı taslağıdır; PR-000 yalnızca standartları koyar.

### Faz 1 — Standartlar ve ürün kaydı

- Charter belgeleri (bu PR)
- Ürün kaydı (ör. `data/platform/product-registry`) — **ayrı PR**
- Navigasyon IA düzeltmesi (Garson = ürün, Business = görünür) — **ayrı, düşük riskli PR**

### Faz 2 — Paralel Platform Landing

- Örn. `/platform/` ince hub (3 ürün kartı)
- Build/static list + smoke test
- `/` hâlâ AI (trafik korunur)

### Faz 3 — Kök kesim

- Onaylı AI marketing URL’si (ör. `/ai/`)
- `/` = Platform Landing
- Redirect / sitemap / locale / rollback bayrağı
- Ürün kodlarına (Garson / Business motorları) dokunulmaz

Her faz: ayrı PR, insan onayı, ölçülebilir smoke, geri alma yolu.

---

## 9. Mimari riskler (tespit)

| Risk | Etki |
|------|------|
| `/` hem AI GTM hem gelecekteki platform hub | SEO ve ürün mesajı çakışması |
| SPA `/*` fallback | Kök değişiminde geniş yan etki |
| Garson’un “kategori” gibi görünmesi | Yanlış ürün modeli |
| Business’in home’da görünmemesi | Keşif eksikliği |
| `src/business` ile `business/index.html` ikiliği | Drift |
| Tek monorepo deploy | Disiplin yoksa çapraz ürün kırılması |
| Ortak `env.js` / Supabase projesi | Tenant ve yetki sınırlarının belgelenmesi şart |

---

## 10. Referans komutlar (değiştirmez; keşif)

| Amaç | Komut |
|------|--------|
| Yerel sunucu | `npm run dev` |
| Lint / check | `npm run lint`, `npm run check` |
| Birim test | `npm run test:unit` |
| Build | `npm run build` |

---

## 11. Belge sahipliği

- **Sahip:** Platform / Principal Architect  
- **Güncelleme:** Klasör veya ürün sınırı değişince bu belge aynı PR veya hemen sonraki charter PR ile güncellenir  
- **Uygulama kodu:** Bu belge tek başına route veya modül değiştirmez
