# Cloudflare Pages — Production Deploy

## Otomatik deploy (önerilen)

`main` branch’e push → GitHub Actions `Deploy Cloudflare Pages` workflow çalışır.

### Gerekli GitHub Secrets

| Secret | Açıklama |
|--------|----------|
| `CLOUDFLARE_API_TOKEN` | Pages Edit izinli API token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare hesap ID |
| `SUPABASE_URL` | Build sırasında `env.js` için |
| `SUPABASE_ANON_KEY` | Build sırasında `env.js` için |
| `SENTRY_DSN` | Opsiyonel |
| `LOGROCKET_APP_ID` | Opsiyonel |

### Cloudflare Pages ortam değişkenleri (Runtime)

Dashboard → **Workers & Pages → istebul → Settings → Environment variables** (Production):

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `STRIPE_PRICE_ID_ANNUAL`, `STRIPE_TRIAL_DAYS`
- `GROQ_API_KEY` (ai-proxy)
- `PARTNER_WEBHOOK_SIGNING_SECRET`, `PARTNER_CALLBACK_SECRET`, `RETRY_WORKER_SECRET`
- `TURNSTILE_SECRET`
- `SITE_URL=https://istebul.com`

Pages Functions (`/functions`) bu secret’ları runtime’da kullanır.

## Manuel deploy (lokal)

```bash
npm ci
export SUPABASE_URL=...
export SUPABASE_ANON_KEY=...
npm run build
npx wrangler login
npx wrangler pages deploy dist --project-name=istebul
```

## Supabase (DB + Edge)

Migration’ları ve Edge Function’ları ayrı deploy edin:

```bash
supabase db push
supabase functions deploy auto-intake
supabase functions deploy analytics-ingest
supabase functions deploy partner-retry partner-dispatch partner-callback partner-application
```

## Build çıktısı

- **Publish directory:** `dist`
- **SPA routing:** `dist/_redirects`
- **Security headers:** `dist/_headers`
- **API / AI:** repo kökündeki `functions/` (Pages Functions)
