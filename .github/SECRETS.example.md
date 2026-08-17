# GitHub Actions — Production secrets

Repository → **Settings → Secrets and variables → Actions → New repository secret**

## Zorunlu (Cloudflare Pages otomatik deploy)

| Secret | Nasıl alınır |
|--------|----------------|
| `CLOUDFLARE_API_TOKEN` | … + **Cloudflare Pages:Edit** + **Zone WAF Write** + **Bot Management Write** |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → sağ sütun Account ID |
| `CLOUDFLARE_ZONE_ID` | (Önerilen) Zone ID — token Zone Read vermiyorsa zorunlu; Dashboard → istebul.com → Overview sağ sütun |

**Not:** Pages proje adı dashboard’daki isimle aynı olmalı (ör. `istebul-com`). Farklıysa workflow’daki `CF_PAGES_PROJECT` env’ini güncelleyin veya repo secret `CLOUDFLARE_PAGES_PROJECT` ekleyin.
| `SUPABASE_URL` | `https://hjfrcdstbyonmgatgwcc.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |

**Cloudflare Pages (Production env)** — `functions/api/analytics-ingest.js` için zorunlu:

| Variable | Açıklama |
|----------|----------|
| `SUPABASE_URL` | `https://hjfrcdstbyonmgatgwcc.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role (gizli) |
| `WAREHOUSE_CYCLE_COUNT_CRON_SECRET` | Güçlü rastgele secret. Aynı değer GitHub Actions secret ve Supabase Edge Function secret olarak tanımlanır; WarehouseIQ aylık/yıllık sayım scheduler erişimini korur. |
| `TCMB_EVDS_API_KEY` | [EVDS 3](https://evds3.tcmb.gov.tr/) profil → API anahtarı (yalnızca sunucu; `/api/evds-snapshot`). Cloudflare’da yanlış isimle `EVDS_API_KEY` tanımlandıysa kod bunu da okur; tercih edilen ad `TCMB_EVDS_API_KEY`. |

### AFAD deprem snapshot (OD-2B) — ops notu

| Variable | Açıklama |
|----------|----------|
| `AFAD_EARTHQUAKE_ENABLED` | Cloudflare Pages **Production** env. Varsayılan: **kapalı** (tanımsız veya `false`). `true` yapılmadan `/api/afad-earthquake-snapshot` canlı AFAD upstream çağırmaz; güvenli `disabled` yanıt döner. |

**Öneri:** Production’da açmadan önce staging/preview ortamında `AFAD_EARTHQUAKE_ENABLED=true` ile endpoint contract ve sanitization doğrulaması yapın. Gerçek secret değeri bu dosyaya yazılmaz. Detay: `docs/OPEN_DATA_OD-2B_CLOSURE.md`.

## Önerilen (Supabase otomatik deploy)

| Secret | Nasıl alınır |
|--------|----------------|
| `SUPABASE_ACCESS_TOKEN` | https://supabase.com/dashboard/account/tokens — **migration + edge deploy için yeterli** (CLI password-less DB rolü) |
| `ANALYTICS_HASH_SALT` | Rastgele uzun string — internal traffic exclusion (`analytics-ingest`, edge) |
| `SUPABASE_DB_PASSWORD` | (Opsiyonel) Eski CLI veya açık postgres şifresi gerektiğinde |
| `SUPABASE_DATABASE_URL` | (Opsiyonel) Pooler connection string — `db push --db-url` yedek yolu |
| `AI_LISTINGS_EDGE_SECRET` | Rastgele uzun string (`openssl rand -hex 32`) — admin Karar Merkezi + `ai-listings` edge auth |

## Opsiyonel

| Secret | Açıklama |
|--------|----------|
| `GOOGLE_SITE_VERIFICATION` | Yalnızca URL-prefix + HTML tag doğrulaması seçilirse gerekir. Domain Property / DNS TXT doğrulaması kullanılıyorsa zorunlu değildir. [Search Console](https://search.google.com/search-console) → mülk ekle → **HTML etiketi** yöntemi → `content="..."` içindeki kod (tırnaksız). Build tüm indexlenebilir HTML sayfalarına `<meta name="google-site-verification">` enjekte eder (`scripts/lib/gsc-verification.cjs`). |
| `SENTRY_DSN` | Build-time monitoring |
| `LOGROCKET_APP_ID` | Build-time session replay |
| `GOOGLE_OAUTH_ENABLED` | `true` — Google OAuth butonunu gösterir (Supabase + Google Console gerekli) |

## Ziyaretçi analitiği (Cloudflare Pages env)

GitHub secret değil — **Cloudflare Pages → istebul-com → Settings → Environment variables** (Production):

| Variable | Açıklama |
|----------|----------|
| `PLAUSIBLE_DOMAIN` | `istebul.com` — Plausible dashboard’da site tanımlı olmalı |
| `CF_WEB_ANALYTICS_TOKEN` | Cloudflare Web Analytics beacon token |
| `GA4_MEASUREMENT_ID` | Google Analytics 4 → **Veri akışları** → web akışı → Ölçüm Kimliği (`G-SEV413SX9T`). Build → `dist/env.js`; çerez onayı sonrası yüklenir. Cloudflare Pages env ile override edilebilir. |
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
# Opsiyonel — yalnızca URL-prefix + HTML tag GSC doğrulaması seçilirse:
gh secret set GOOGLE_SITE_VERIFICATION
```

Secret’lar eklendikten sonra `main`’e push veya **Actions → Production Deploy → Run workflow** ile otomatik deploy başlar.
