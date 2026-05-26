# Lighthouse baseline (2026-05-26)

## Komut

```bash
npm run build
npm run lhci          # Lab — static dist (SPA; Supabase beklemesi timeout yapabilir)
npm run analyze:bundle
```

## Lab durumu

`npm run lhci` statik `dist/index.html` üzerinde **PROTOCOL_TIMEOUT** verebilir (Chrome, sayfa yüklenirken uzun süren ağ çağrıları). Bu, canlı Cloudflare ortamından bağımsız bir CI/lab kısıtıdır.

**Önerilen ölçüm:** Production veya preview URL üzerinde Lighthouse (Chrome DevTools) veya haftalık workflow `.github/workflows/lighthouse-weekly.yml` artifact’ları.

## Bundle özeti (`analyze:bundle`)

- Ana SPA bundle ~793KB — bütçe izleme altında; `dist/bundle-report.json` referans.
- Ağır vendor’lar import map / harici CDN üzerinden ayrılmış.

## Öncelikli 3 iyileştirme

1. **Ana bundle küçültme** — Premium sayfa modüllerini route bazlı dynamic `import()` ile geciktir; ilk ziyaret JS yükünü düşürür (LCP / TTI).
2. **Üçüncü taraf bağlantı maliyeti** — Ana sayfada `loadListings` zaten kapalı; Lighthouse’ta statik sunumda Supabase/env çağrılarını marketing route’ta tamamen ertelemek veya mock (lab için).
3. **Kritik CSS yolu** — `enterprise-remediation.css` ve hero stillerini tek kritik blokta tut; gereksiz senkron stylesheet sayısını azalt (mevcut build hash + preload korunur).

## CI

- Haftalık: `Lighthouse Weekly` (Pazartesi 06:00 UTC), `continue-on-error: true`, artifact upload.
- Günlük gate: `npm run analyze:bundle` (mevcut `npm test` içinde).

## Canlı doğrulama

```bash
npm run smoke:live
# veya
node scripts/live-deploy-smoke.cjs https://www.istebul.com
```

Cloudflare bot challenge nedeniyle bazı ortamlarda HTTP 403 uyarısı normaldir; tarayıcıdan manuel kontrol esas alınır.
