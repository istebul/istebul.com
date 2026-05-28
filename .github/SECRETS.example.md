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
| `SUPABASE_ACCESS_TOKEN` | https://supabase.com/dashboard/account/tokens — **migration + edge deploy için yeterli** (CLI password-less DB rolü) |
| `SUPABASE_DB_PASSWORD` | (Opsiyonel) Eski CLI veya açık postgres şifresi gerektiğinde |
| `SUPABASE_DATABASE_URL` | (Opsiyonel) Pooler connection string — `db push --db-url` yedek yolu |

## Opsiyonel

| Secret | Açıklama |
|--------|----------|
| `SENTRY_DSN` | Build-time monitoring |
| `LOGROCKET_APP_ID` | Build-time session replay |
| `GOOGLE_OAUTH_ENABLED` | `true` — Google OAuth butonunu gösterir (Supabase + Google Console gerekli) |

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
