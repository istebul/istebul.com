# Cloudflare monitoring — isteBul.com

## Health endpoint (önerilen)

Uptime ve deploy smoke için HTML yerine API kullanın:

```bash
curl -s https://www.istebul.com/api/health
# {"ok":true,"service":"istebul.com","ts":"..."}
```

```bash
npm run smoke:live
```

## Bot challenge (403)

Ana sayfa (`/`) ve bazı statik yollar bot `User-Agent` ile **403** dönebilir (`cf-mitigated: challenge`). Bu beklenen davranıştır.

| Yol | Bot/curl | Tarayıcı |
|-----|----------|----------|
| `/api/health` | ✅ | ✅ |
| `/api/public-stats` | ✅ | ✅ |
| `/auto/` | Genelde ✅ | ✅ |
| `/` | ⚠️ 403 | ✅ |

## Cloudflare Dashboard önerileri

1. **Uptime** — Synthetic monitor: `GET https://www.istebul.com/api/health` (60s aralık).
2. **Allowlist** — GitHub Actions / internal smoke IP’leri için WAF skip rule (opsiyonel).
3. **Cache** — `env.js` ve `/api/*` için bypass (API zaten `Cache-Control: no-store` / kısa TTL).

## Deploy sonrası checklist

- [ ] `/api/health` → `ok: true`
- [ ] `/api/public-stats` → `mode: example` veya `live` (eşik ≥50 analiz)
- [ ] `/auto/` wizard + sonuç soft gate (anon)
- [ ] `/metodoloji` — prerender H1 görünür (kaynak HTML)
