# GitHub Actions — Production secrets

Repository → **Settings → Secrets and variables → Actions → New repository secret**

## Zorunlu (Cloudflare Pages otomatik deploy)

| Secret | Nasıl alınır |
|--------|----------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard → My Profile → API Tokens → Create → Template **Edit Cloudflare Workers** + **Cloudflare Pages:Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → sağ sütun Account ID |

**Not:** Pages proje adı dashboard’daki isimle aynı olmalı (ör. `istebul-com`). Farklıysa workflow’daki `CF_PAGES_PROJECT` env’ini güncelleyin veya repo secret `CLOUDFLARE_PAGES_PROJECT` ekleyin.
| `SUPABASE_URL` | `https://hjfrcdstbyonmgatgwcc.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |

## Önerilen (Supabase otomatik deploy)

| Secret | Nasıl alınır |
|--------|----------------|
| `SUPABASE_ACCESS_TOKEN` | https://supabase.com/dashboard/account/tokens |
| `SUPABASE_DB_PASSWORD` | Supabase → Settings → Database → password (migration `db push` için) |

## Opsiyonel — cron workers

| Secret | Açıklama |
|--------|----------|
| `PARTNER_RETRY_URL` | `.../functions/v1/partner-retry` |
| `PARTNER_RETRY_SECRET` | Edge `RETRY_WORKER_SECRET` ile aynı |
| `LIFECYCLE_CRON_URL` | `.../functions/v1/lifecycle-cron` |
| `LIFECYCLE_CRON_SECRET` | Edge `LIFECYCLE_CRON_SECRET` ile aynı |
| `DATA_RETENTION_URL` | `.../functions/v1/data-retention-cron` |
| `DATA_RETENTION_CRON_SECRET` | Edge `DATA_RETENTION_CRON_SECRET` ile aynı |

## Opsiyonel — build & monitoring

| Secret | Açıklama |
|--------|----------|
| `SENTRY_DSN` | Build-time monitoring |
| `LOGROCKET_APP_ID` | Build-time session replay |
| `SUPABASE_SERVICE_ROLE_KEY` | `metrics:slo`, retention manual test (Actions’ta saklamayın — sadece güvenli runner) |

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
