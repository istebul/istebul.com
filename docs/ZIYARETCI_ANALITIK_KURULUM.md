# Ziyaretçi analitiği — kurulum rehberi (isteBul.com)

Bu rehber, **kaç kişi siteyi ziyaret etti** sorusunu üç kanaldan yanıtlamanız için adımları içerir.

## 1) Admin panel — birinci taraf (ürün analitiği)

**URL:** https://www.istebul.com/admin-panel.html → **Platform analitik**

| Metrik | Anlam |
|--------|--------|
| Toplam ziyaret | Çerez onaylı oturumlar (sayfa görüntüleme) |
| Ana sayfa ziyaret | `/` görüntülemeleri |
| Kategori / lead | Hunideki sonraki adımlar |

**Zaman filtresi:** Bugün · Son 7 gün · Son 30 gün · Tüm zamanlar

### Canlı veri için kontrol listesi

1. Supabase migration’lar uygulandı (`analytics_events`, internal traffic exclusion).
2. Edge function deploy: `analytics-ingest`, `admin-action`.
3. GitHub secret: `ANALYTICS_HASH_SALT` → production deploy workflow Supabase’a yazar.
4. Cloudflare Pages env: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (`/env.js` üzerinden tarayıcıya gider).
5. Ziyaretçi sitede **Kabul et** demeli (KVKK / çerez banner).

Veri modu: **Gerçek kullanıcı** (test trafiği hariç) veya **Tüm veri**.

```bash
npm run audit:analytics
```

## 2) Plausible — sayfa görüntüleme (önerilen, gizlilik dostu)

1. https://plausible.io hesabı açın.
2. Site ekleyin: `istebul.com` ve `www.istebul.com` (ikisi de dashboard’da tanımlı olmalı).
3. Cloudflare Pages → **istebul-com** → Settings → Environment variables:

| Değişken | Örnek |
|----------|--------|
| `PLAUSIBLE_DOMAIN` | `istebul.com` |

Build’de varsayılan: `config/public-env.defaults.json` içinde `PLAUSIBLE_DOMAIN` zaten `istebul.com`.

Script yalnızca ziyaretçi **çerezleri kabul ettikten** sonra yüklenir.

## 3) Cloudflare Web Analytics (ücretsiz, aynı hesap)

1. Cloudflare Dashboard → **Analytics & Logs** → **Web Analytics** → Add site `istebul.com`.
2. Beacon **token** kopyalayın.
3. Pages env:

| Değişken | Açıklama |
|----------|----------|
| `CF_WEB_ANALYTICS_TOKEN` | Beacon token |

## Opsiyonel

| Değişken | Hizmet |
|----------|--------|
| `GA4_MEASUREMENT_ID` | Google Analytics 4 |
| `CLARITY_PROJECT_ID` | Microsoft Clarity (oturum kaydı) |

Tümü çerez onayı sonrası `js/core/third-party-analytics.js` ile yüklenir.

## Teknik notlar

- Statik kurumsal sayfalar (`kvkk.html`, partner sayfaları, `/auto/`) çerez kabulünde artık `analytics-ingest` + Plausible’u birlikte başlatır.
- Dikey sayfalar (`/konut/`, `/tatil/`, …) doğrudan açılırsa alt bantta çerez banner’ı gösterilir.
- `/api/public-stats` ziyaretçi sayısı vermez; yalnızca analiz/lead özet metrikleri içindir.

## Hızlı doğrulama

1. Gizli pencerede siteyi açın → **Kabul et**.
2. Network sekmesinde `analytics-ingest` POST (200) ve isteğe bağlı `plausible.io` isteği.
3. Admin → Platform analitik → **Son 7 gün** → Toplam ziyaret > 0 (birkaç dakika gecikme normal).
