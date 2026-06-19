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

Dashboard → **Workers & Pages → istebul-com → Settings → Environment variables** (Production ve Preview).

**Genel Functions secrets:** `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_*`, `PARTNER_*`, `TURNSTILE_SECRET`, `SITE_URL`

### AI provider (`/ai-proxy` — Pages Functions)

Canonical runbook: [`docs/AI_PROVIDER.md`](AI_PROVIDER.md)

| Variable | Zorunluluk | Not |
|----------|------------|-----|
| `AI_PROVIDER` | Opsiyonel | Unset veya `groq` → **Groq** (production default). `openai` yalnızca bilinçli aktivasyonda. |
| `GROQ_API_KEY` | **Zorunlu** (default/`groq`) | `AI_PROVIDER` unset veya `groq` iken gerekli. |
| `OPENAI_API_KEY` | `AI_PROVIDER=openai` iken **zorunlu** | OpenAI seçiliyken Groq key olsa bile yeterli değil. |
| `OPENAI_MODEL` | Opsiyonel | Default runtime: `gpt-4o-mini`. |
| `AI_PROXY_TOKEN` | Opsiyonel | Ek POST koruması (`x-ai-proxy-token`). |

**Kurallar:**

- Provider’lar arasında **otomatik fallback yoktur**.
- Production OpenAI aktivasyonu: önce `OPENAI_API_KEY` (encrypted), opsiyonel `OPENAI_MODEL`, **en son** `AI_PROVIDER=openai`.
- Rollback: `AI_PROVIDER` sil veya `groq` yap; `GROQ_API_KEY` production’da korunmalı.

**Production OpenAI activation remains NO-GO** until deployment checklist, subprocessor/compliance docs, and Preview smoke are completed (see [`docs/DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md)).

## Cloudflare Git entegrasyonu

Dashboard’da ayrıca “Git connected” build varsa, **ya** GitHub Actions **ya** Cloudflare Git kullanın (ikisi birden çift deploy yapar).

Öneri: GitHub Actions’ı kullanın; Cloudflare’de **Builds** kapatılabilir veya build command boş bırakılır.

## Pages önizleme URL’leri

`git push origin main` sonrası Cloudflare her deploy için hash’li bir önizleme adresi üretir (ör. `https://8fe0aca7.istebul-com.pages.dev`). Bu adresler **aynı `dist` çıktısını** sunar; API ve Supabase edge fonksiyonları `*.istebul-com.pages.dev` kökenlerini CORS’ta kabul eder (`functions/_shared/cors-origins.js`, `supabase/functions/_shared/cors-origins.ts`).

Canlı doğrulama için: `https://www.istebul.com` veya `https://istebul-com.pages.dev` (son production deploy).

**Auto `/auto/`:** `auto-app.js` ve `ib-car.css` artık içerik hash’li dosya adlarıyla yayınlanır (`auto-app.<hash>.js`). Böylece `www` üzerinde eski immutable önbellek, yeni sihirbaz + AI akışını engellemez.

## Manuel deploy

```bash
npm run deploy:cf
```
