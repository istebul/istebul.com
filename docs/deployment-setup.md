# Deployment Setup Guide

Bu rehber, isteBu v2'yi production'a dağıtmak için adım adım talimatları içerir.

## 🔴 ÖNEMLİ: Güvenlik Checklist

- [ ] Supabase credentials `.env.local`'de saklandı
- [ ] `js/core/config.js`'de hardcoded key/secret YOK
- [ ] `.env.local` `.gitignore`'a ekli
- [ ] Netlify Dashboard'da tüm environment variables set edildi
- [ ] GitHub Secrets'ta `NETLIFY_AUTH_TOKEN` ve `NETLIFY_SITE_ID` set edildi
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

## 2️⃣ GitHub Actions + Netlify Integration

### 2.1 GitHub Secrets Setup
1. GitHub Repository → **Settings → Secrets and variables → Actions**
2. Aşağıdaki secrets'ı ekle:

```
NETLIFY_AUTH_TOKEN    → Netlify'dan token al (Secrets: 1)
NETLIFY_SITE_ID       → Site ID (Secrets: 2)
SENTRY_DSN            → Sentry DSN (Secrets: 3)
LOGROCKET_APP_ID      → LogRocket ID (Secrets: 4)
```

### 2.2 Netlify Auth Token Alma
1. [Netlify Dashboard](https://app.netlify.com) açın
2. **User Settings → Applications → Personal access tokens**
3. **New access token** → copy & GitHub Secrets'a yapıştır

### 2.3 Site ID Alma
1. Netlify dashboard'da site seç
2. **Site settings** → Site information
3. `Site ID` copy & GitHub Secrets'a yapıştır

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

## 4️⃣ Netlify Environment Setup

### 4.1 Build Settings
1. Netlify Dashboard → **Site settings → Build & deploy**
2. Build command: `npm run build`
3. Publish directory: `dist`

### 4.2 Environment Variables
1. **Site settings → Build & deploy → Environment**
2. Repository ve Netlify için aynı environment variables ekle:

```
SUPABASE_URL              = https://your-project.supabase.co
SUPABASE_ANON_KEY         = your-anon-key
CLAUDE_API_KEY            = your-claude-key
SENTRY_DSN                = https://...@sentry.io/...
LOGROCKET_APP_ID          = your-logrocket-id
```

---

## 5️⃣ Deploy Flow

### 5.1 Manual Deploy (Testing)
```bash
# Build test
npm run build

# Local preview
netlify deploy --dir=dist --draft

# Production deploy
netlify deploy --prod --dir=dist
```

### 5.2 Automated Deploy (CI/CD)
1. Commit → push `main` branch
2. GitHub Actions triggered (`.github/workflows/ci.yml`)
3. Tests + Build passed → Netlify deploy automatic
4. Production live in ~2 minutes

**Status**: `.github/workflows/ci.yml` yapısında:
- Quality checks (tests, linting)
- Production build
- Netlify deploy step

---

## 6️⃣ Production Checklist

### Pre-Launch
- [ ] All tests passing: `npm test`
- [ ] Build no errors: `npm run build`
- [ ] Bundle size OK: `npm run analyze:bundle`
- [ ] Lighthouse score 90+: `npm run lhci`
- [ ] Sentry/LogRocket live
- [ ] All Netlify env vars set
- [ ] Domain SSL certificate active

### Post-Deploy
- [ ] Homepage loads: `https://your-domain.com`
- [ ] AI Asistan works
- [ ] Login/Register works
- [ ] Database queries work
- [ ] Errors appear in Sentry
- [ ] Session tracked in LogRocket

---

## 🚨 Troubleshooting

### "Deploy fails on GitHub Actions"
1. Check logs: GitHub → Actions → Latest workflow
2. Verify: `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` set?
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
- Netlify Docs: https://docs.netlify.com/
- Supabase Docs: https://supabase.com/docs

---

**Last updated:** May 10, 2026
