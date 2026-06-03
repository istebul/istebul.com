# Cloudflare Bot & Monitor Erişimi

## Sorun

Bazı User-Agent / IP kombinasyonları ana sayfada **403 Cloudflare challenge** alırken, `isteBul-production-smoke/1.0` UA ile 200 dönebilir. Bu durum:

- Uptime monitor false alarm
- Googlebot / Bingbot indexleme riski
- Rastgele kullanıcı oturumlarında kötü UX

## Önerilen Cloudflare ayarları

Cloudflare Dashboard → **isteBul.com** → **Security** → **WAF** / **Bots**

1. **Verified Bots** — Allow (Googlebot, Bingbot, Applebot)
2. **Bot Fight Mode** — Ana sayfa için agresif mod kullanıyorsanız, Verified Bots istisnasını açık tutun
3. **Custom rule (skip)** — önerilen ifadeler:
   - `(http.user_agent contains "isteBul-production-smoke")` → Skip all remaining rules
   - `(cf.client.bot)` → Skip (Verified Bots)
4. **Rate limiting** — `/api/*` için ayrı; statik HTML için geniş limit

## Repo içi doğrulama

```bash
node scripts/verify-bot-access.cjs https://www.istebul.com
```

Production deploy workflow (`smoke-live`) smoke UA kullanır. `verify-bot-access` CI'da uyarı üretir; Googlebot 403 ise dashboard ayarı gerekir.

## Referans

- `scripts/smoke-live.cjs` — smoke UA tanımı
- `.github/workflows/production-deploy.yml` — post-deploy smoke
