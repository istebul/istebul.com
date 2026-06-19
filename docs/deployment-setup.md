# Deployment Setup Guide

Bu rehber, isteBu v2'yi production'a dağıtmak için adım adım talimatları içerir.

## 🔴 ÖNEMLİ: Güvenlik Checklist

- [ ] Supabase credentials `.env.local`'de saklandı
- [ ] `js/core/config.js`'de hardcoded key/secret YOK
- [ ] `.env.local` `.gitignore`'a ekli
- [ ] Cloudflare Pages Production environment variables set edildi
- [ ] GitHub Secrets'ta `CLOUDFLARE_API_TOKEN` ve `CLOUDFLARE_ACCOUNT_ID` set edildi
- [ ] Sentry DSN prod ortama configure edildi
- [ ] LogRocket App ID prod ortama configure edildi

---

## 1️⃣ Supabase Setup

### 1.1 Credentials Alma
1. [Supabase Dashboard](https://app.supabase.com) açın
2. Projenize gidin
3. **Settings → API** kısmından:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY`

### 1.2 Local Development
```bash
cp .env.example .env.local
# .env.local dosyasını düzenle ve credentials'ı doldur

npm run dev
# http://localhost:3000 açılacak
```

### 1.3 Database Initialize
```bash
# Supabase SQL Editor'da aç ve çalıştır:
cat supabase-setup.sql | pbcopy  # macOS
# Linux: cat supabase-setup.sql | xclip -selection clipboard
```

---

## 2️⃣ GitHub Actions + Cloudflare Pages Integration

### 2.1 GitHub Secrets Setup
1. GitHub Repository → **Settings → Secrets and variables → Actions**
2. Aşağıdaki secrets'ı ekle (detay: `.github/SECRETS.example.md`):

```
CLOUDFLARE_API_TOKEN    → Cloudflare API token (Pages:Edit)
CLOUDFLARE_ACCOUNT_ID   → Cloudflare Account ID
SUPABASE_URL            → Supabase project URL
SUPABASE_ANON_KEY       → Supabase anon public key
SUPABASE_ACCESS_TOKEN   → Supabase CLI token (migrations + edge deploy)
SENTRY_DSN              → Sentry DSN (opsiyonel)
LOGROCKET_APP_ID        → LogRocket ID (opsiyonel)
```

### 2.2 Cloudflare API Token Alma
1. [Cloudflare Dashboard](https://dash.cloudflare.com) açın
2. **My Profile → API Tokens → Create Token**
3. **Cloudflare Pages:Edit** ve gerekli zone izinlerini ver → copy & GitHub Secrets'a yapıştır

### 2.3 Account ID Alma
1. Cloudflare dashboard → sağ sütundan **Account ID** copy
2. GitHub Secrets → `CLOUDFLARE_ACCOUNT_ID` olarak kaydet

---

## 3️⃣ Monitoring Setup (Sentry & LogRocket)

### 3.1 Sentry Setup
1. [Sentry.io](https://sentry.io) → Create Account
2. **New Project** → JavaScript
3. DSN copy → GitHub Secrets + `.env.local`'e ekle

### 3.2 LogRocket Setup
1. [LogRocket](https://logrocket.com) → Sign up
2. **Create new app**
3. App ID copy → GitHub Secrets + `.env.local`'e ekle

---

## 4️⃣ Cloudflare Pages Environment Setup

### 4.1 Build Settings
Production deploy GitHub Actions üzerinden yapılır (`.github/workflows/production-deploy.yml`):
- Build command: `npm run build`
- Publish directory: `dist`
- Deploy command: `wrangler pages deploy dist --project-name=istebul-com`

### 4.2 Environment Variables
1. Cloudflare Dashboard → **Workers & Pages → istebul-com → Settings → Environment variables**
2. Production ortamına aşağıdaki değişkenleri ekle:

```
SUPABASE_URL              = https://your-project.supabase.co
SUPABASE_ANON_KEY         = your-anon-key
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key (Pages Functions için)
CLAUDE_API_KEY            = your-claude-key
SENTRY_DSN                = https://...@sentry.io/...
LOGROCKET_APP_ID          = your-logrocket-id
```

#### AI Proxy (Cloudflare Pages Functions — server-side)

`.env.example` ile uyumlu; canonical runbook: [`docs/AI_PROVIDER.md`](AI_PROVIDER.md)

| Variable | Not |
|----------|-----|
| `AI_PROVIDER` | Default: unset veya `groq` (Groq). |
| `GROQ_API_KEY` | Zorunlu when `AI_PROVIDER` unset/`groq`. |
| `OPENAI_API_KEY` | Zorunlu yalnızca `AI_PROVIDER=openai` iken. |
| `OPENAI_MODEL` | Opsiyonel override (default: `gpt-4o-mini`). |
| `AI_PROXY_TOKEN` | Opsiyonel ek koruma. |

Provider’lar arasında **otomatik fallback yoktur**. Production OpenAI aktivasyonu için sıra ve rollback: `AI_PROVIDER.md`.

---

## 5️⃣ Deploy Flow

### 5.1 Manual Deploy (Testing)
```bash
# Build test
npm run build

# Cloudflare Pages deploy (wrangler gerekli)
npx wrangler pages deploy dist --project-name=istebul-com
```

### 5.2 Automated Deploy (CI/CD)
1. Commit → push `main` branch
2. GitHub Actions **Production Deploy** workflow tetiklenir
3. Test & build → Supabase migrations/edge → Cloudflare Pages deploy
4. Live smoke strict (`npm run smoke:live:strict -- https://www.istebul.com`)

**Workflow yapısı** (`.github/workflows/production-deploy.yml`):
- Quality checks (tests, build, E2E release gate)
- Supabase migrations + edge functions deploy
- Cloudflare Pages deploy (`wrangler pages deploy dist --project-name=istebul-com`)
- Post-deploy live smoke strict

---

## 6️⃣ Production Checklist

### Pre-Launch
- [ ] All tests passing: `npm test`
- [ ] Build no errors: `npm run build`
- [ ] Bundle size OK: `npm run analyze:bundle`
- [ ] Lighthouse score 90+: `npm run lhci`
- [ ] Sentry/LogRocket live
- [ ] Cloudflare Pages env vars set
- [ ] Domain SSL certificate active

### Post-Deploy
- [ ] Homepage loads: `https://www.istebul.com`
- [ ] `/api/health` returns 200
- [ ] AI Asistan works
- [ ] Login/Register works
- [ ] Database queries work
- [ ] Errors appear in Sentry
- [ ] Session tracked in LogRocket
- [ ] (Opsiyonel) `/ai-proxy` manuel smoke — curl örneği ve adımlar: [`docs/AI_PROVIDER.md`](AI_PROVIDER.md)

---

## 🚨 Troubleshooting

### "Deploy fails on GitHub Actions"
1. Check logs: GitHub → Actions → Production Deploy → Latest workflow
2. Verify: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` set?
3. Verify: `.env.local` not committed to repo

### "Sentry/LogRocket not capturing errors"
1. Check DSN in `config.js` (`monitoring.sentryDsn`)
2. Check Sentry/LogRocket dashboard DSN setting
3. Check browser console for init errors

### "Supabase queries fail"
1. Verify credentials in `.env.local`
2. Check Supabase RLS policies enabled
3. Check network tab for API errors

---

## 📞 Support

- Sentry Docs: https://docs.sentry.io/
- LogRocket Docs: https://docs.logrocket.com/
- Cloudflare Pages Docs: https://developers.cloudflare.com/pages/
- Supabase Docs: https://supabase.com/docs

---

**Last updated:** June 14, 2026
