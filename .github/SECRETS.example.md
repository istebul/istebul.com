# GitHub Actions — Production secrets

Repository → **Settings → Secrets and variables → Actions → New repository secret**

## Zorunlu (Cloudflare Pages otomatik deploy)

| Secret | Nasıl alınır |
|--------|----------------|
| `CLOUDFLARE_API_TOKEN` | … + **Cloudflare Pages:Edit** + **Zone WAF Write** + **Bot Management Write** |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → sağ sütun Account ID |
| `CLOUDFLARE_ZONE_ID` | (Opsiyonel) Zone ID — yoksa script `istebul.com` adından çözümler |

**Not:** Pages proje adı dashboard’daki isimle aynı olmalı (ör. `istebul-com`). Farklıysa workflow’daki `CF_PAGES_PROJECT` env’ini güncelleyin veya repo secret `CLOUDFLARE_PAGES_PROJECT` ekleyin.
| `SUPABASE_URL` | `https://hjfrcdstbyonmgatgwcc.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |

**Cloudflare Pages (Production env)** — `functions/api/analytics-ingest.js` için zorunlu:

| Variable | Açıklama |
|----------|----------|
| `SUPABASE_URL` | `https://hjfrcdstbyonmgatgwcc.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role (gizli) |

## Önerilen (Supabase otomatik deploy)

| Secret | Nasıl alınır |
|--------|----------------|
| `SUPABASE_ACCESS_TOKEN` | https://supabase.com/dashboard/account/tokens — **migration + edge deploy için yeterli** (CLI password-less DB rolü) |
| `ANALYTICS_HASH_SALT` | Rastgele uzun string — internal traffic exclusion (`analytics-ingest`, edge) |
| `SUPABASE_DB_PASSWORD` | (Opsiyonel) Eski CLI veya açık postgres şifresi gerektiğinde |
| `SUPABASE_DATABASE_URL` | (Opsiyonel) Pooler connection string — `db push --db-url` yedek yolu |

## Opsiyonel

| Secret | Açıklama |
|--------|----------|
| `SENTRY_DSN` | Build-time monitoring |
| `LOGROCKET_APP_ID` | Build-time session replay |
| `GOOGLE_OAUTH_ENABLED` | `true` — Google OAuth butonunu gösterir (Supabase + Google Console gerekli) |

## Ziyaretçi analitiği (Cloudflare Pages env)

GitHub secret değil — **Cloudflare Pages → istebul-com → Settings → Environment variables** (Production):

| Variable | Açıklama |
|----------|----------|
| `PLAUSIBLE_DOMAIN` | `istebul.com` — Plausible dashboard’da site tanımlı olmalı |
| `CF_WEB_ANALYTICS_TOKEN` | Cloudflare Web Analytics beacon token |
| `GA4_MEASUREMENT_ID` | `G-XXXXXXXX` (opsiyonel) |
| `CLARITY_PROJECT_ID` | Microsoft Clarity proje ID (opsiyonel) |

Birinci taraf admin metrikleri için ayrıca `ANALYTICS_HASH_SALT` (GitHub secret, Supabase edge’e sync).

Detay: [docs/ZIYARETCI_ANALITIK_KURULUM.md](../docs/ZIYARETCI_ANALITIK_KURULUM.md)

## Tek seferlik CLI (repo admin)

```bash
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set SUPABASE_URL -b"https://hjfrcdstbyonmgatgwcc.supabase.co"
gh secret set SUPABASE_ANON_KEY
gh secret set SUPABASE_ACCESS_TOKEN
gh secret set SUPABASE_DB_PASSWORD
```

Secret’lar eklendikten sonra `main`’e push veya **Actions → Production Deploy → Run workflow** ile otomatik deploy başlar.
