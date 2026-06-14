# isteBu v2 — Yayın Öncesi (Go‑Live) Checklist

Bu doküman, projeyi **istebul.com** domain’i ile **Cloudflare Pages + Supabase** üzerinde canlıya almak için gereken adımları “tamamlandı” mantığıyla listeler.

> Not: Bu repo daha önce başka işletim sisteminde kurulmuş `node_modules` içerdiği için build hatası üretebiliyordu. Artık `package-lock.json` temiz kurulum + build doğrulaması geçti.

---

## 0) Repo hijyeni (tek seferlik)

- [ ] `node_modules/` **repoda commit edilmemeli**. `.gitignore` içinde olduğundan emin olun.
- [ ] Temiz kurulum:
  - `npm ci`
- [ ] Test:
  - `npm test`
- [ ] Prod build:
  - `npm run build`
  - `npm run build:check`
  - (opsiyonel) `npm run analyze:bundle` → `dist/bundle-report.json`

---

## 1) Supabase (Production) kurulumu

### 1.0 Güvenlik notu (anahtarlar)
- [ ] **SUPABASE_SERVICE_ROLE_KEY** (ve gerekiyorsa anon key) daha önce sohbet/ekran görüntüsü vb. bir yerde paylaşıldıysa **hemen rotate edin**.
  - Supabase → Project Settings → API (veya Security) → “Rotate keys / Regenerate” adımlarını kullanın.
  - Rotate sonrası Cloudflare Pages env değişkenlerini yeni değerlerle güncelleyin.

### 1.1 Proje oluşturma
- [ ] Supabase’de yeni bir **Production** projesi oluşturun.
- [ ] Bölge (region) seçimini (mümkünse) hedef kullanıcı kitlesine yakın yapın.

### 1.2 SQL kurulumu
- [ ] Supabase → **SQL Editor**:
  - `supabase-setup.sql` dosyasını **tamamını** çalıştırın.
- [ ] Daha önce kurulmuş eski bir şema varsa:
  - `supabase-hardening-migration.sql` dosyasını çalıştırın.

### 1.3 Storage (images)
- [ ] `images` bucket oluştu mu? (Setup SQL bunu ekliyor.)
- [ ] Policies oluştu mu?
  - Public read
  - Authenticated insert
  - Owner update/delete (foldername ile)

### 1.4 Auth ayarları
- [ ] Supabase Auth → **Site URL**:
  - `https://istebul.com`
- [ ] Auth → **Redirect URLs**:
  - `https://istebul.com/*`
  - (opsiyonel staging) `https://<staging-domain>/*`

### 1.5 Key’ler
- [ ] Aşağıdakileri hazır edin (Cloudflare Pages env + GitHub Secrets):
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (**sadece serverless functions**)

---

## 2) Cloudflare Pages (Production) kurulumu

### 2.1 Site oluşturma
- [ ] Cloudflare Dashboard → **Workers & Pages → Create application → Pages**
- [ ] Proje adı: `istebul-com` (workflow `CF_PAGES_PROJECT` ile eşleşmeli)
- [ ] Build settings (GitHub Actions deploy kullanılıyorsa dashboard build opsiyonel):
  - Build command: `npm run build`
  - Publish directory: `dist`

> Production deploy `.github/workflows/production-deploy.yml` üzerinden `wrangler pages deploy dist --project-name=istebul-com` ile yapılır.

### 2.2 Environment Variables (Cloudflare Pages)
- [ ] Required:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] AI (opsiyonel):
  - `CLAUDE_API_KEY`
  - `CLAUDE_MODEL` (varsayılan: `ai-3-5-sonnet-20241022`)
- [ ] Monitoring (opsiyonel ama önerilir):
  - `SENTRY_DSN`
  - `LOGROCKET_APP_ID`
- [ ] CORS origin (isteğe bağlı override):
  - `ALLOWED_ORIGIN=https://istebul.com`

### 2.3 CORS / Origin kontrolü
- [ ] `functions/api/*` ve `functions/ai-proxy.js` CORS header’ları:
  - Varsayılan `https://istebul.com`
  - Domain değişirse:
    - Cloudflare Pages env: `ALLOWED_ORIGIN`
    - `_headers` dosyasındaki ilgili header’ları da güncelleyin.

---

## 3) Domain + DNS (istebul.com)

### 3.1 Cloudflare’de domain bağlama
- [ ] Cloudflare → **Workers & Pages → istebul-com → Custom domains**
- [ ] `istebul.com` ve `www.istebul.com` ekleyin
- [ ] `www.istebul.com` için yönlendirme kararı verin:
  - (öneri) `www` → apex redirect veya tersi.

### 3.2 DNS kayıtları
- [ ] Cloudflare DNS’te apex ve `www` kayıtları Pages projesine yönlendirilmiş mi?
- [ ] SSL sertifikası Cloudflare’de aktif mi?

---

## 4) Yayın öncesi son kontroller

- [ ] Cloudflare Pages preview veya staging URL’de:
  - Auth (login/register)
  - İlan listeleme + detay
  - İlan oluşturma (auth required)
  - Görsel yükleme
  - Mesajlaşma (realtime)
  - Karar asistanı akışı
- [ ] Pages Functions:
  - `/api/health` 200 dönüyor mu?
  - `/ai-proxy` ve `upload-image` yetkisizken 401 dönüyor mu?
- [ ] PWA:
  - Offline sayfası
  - Service worker update davranışı (cache versiyonu)

---

## 5) Canlıya alma

- [ ] `main` branch push veya **Actions → Production Deploy → Run workflow** ile deploy tetikleyin.
- [ ] Live smoke strict geçti mi? (`npm run smoke:live:strict -- https://www.istebul.com`)
- [ ] Canlı domain üzerinden smoke kontrol yapın.
- [ ] (Opsiyonel) İzleme araçları: Sentry/LogRocket event geliyor mu?
