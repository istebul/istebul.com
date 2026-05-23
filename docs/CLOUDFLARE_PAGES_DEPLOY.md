# Otomatik production deploy

`main` branch’e her push:

1. **Test & Build** — lint, syntax, production build  
2. **Cloudflare Pages** — `dist` canlıya (`istebul.com`)  
3. **Supabase** — migration + edge functions (`SUPABASE_ACCESS_TOKEN` varsa)

Workflow: `.github/workflows/production-deploy.yml`

## İlk kurulum (bir kez)

GitHub repository secrets ekleyin — liste: `.github/SECRETS.example.md`

Minimum:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Supabase otomatik deploy için ek olarak:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

## Cloudflare Pages runtime env

Dashboard → **Workers & Pages → istebul → Settings → Environment variables** (Production):

`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_*`, `GROQ_API_KEY`, `PARTNER_*`, `TURNSTILE_SECRET`, `SITE_URL`

## Cloudflare Git entegrasyonu

Dashboard’da ayrıca “Git connected” build varsa, **ya** GitHub Actions **ya** Cloudflare Git kullanın (ikisi birden çift deploy yapar).

Öneri: GitHub Actions’ı kullanın; Cloudflare’de **Builds** kapatılabilir veya build command boş bırakılır.

## Manuel deploy

```bash
npm run deploy:cf
```
