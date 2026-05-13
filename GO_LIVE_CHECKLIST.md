# isteBu v2 — Yayın Öncesi (Go‑Live) Checklist

Bu doküman, projeyi **istebul.com** domain’i ile **Netlify + Supabase** üzerinde canlıya almak için gereken adımları “tamamlandı” mantığıyla listeler.

> Not: Bu repo daha önce başka işletim sisteminde kurulmuş `node_modules` içerdiği için build hatası üretebiliyordu. Artık `package-lock.json` Netlify CLI bağımlılığı olmadan güncellendi ve temiz kurulum + build doğrulaması geçti.

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
  - Rotate sonrası Netlify env değişkenlerini yeni değerlerle güncelleyin.

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
- [ ] Aşağıdakileri hazır edin (Netlify env’e gireceğiz):
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (**sadece serverless functions**)

---

## 2) Netlify (Production) kurulumu

### 2.1 Site oluşturma
- [ ] Netlify → “Add new site” → Git repo bağlayın.
- [ ] Build settings:
  - Build command: `npm run build`
  - Publish directory: `dist`
  - Functions directory: `netlify/functions`

> Bu ayarlar `netlify.toml` ile zaten tanımlı.

### 2.2 Environment Variables (Netlify)
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
- [ ] `netlify/functions/*` CORS header’ları:
  - Varsayılan `https://istebul.com`
  - Domain değişirse:
    - Netlify env: `ALLOWED_ORIGIN`
    - `netlify.toml` içindeki function header’larını da güncelleyin.

---

## 3) Domain + DNS (istebul.com)

### 3.1 Netlify’de domain bağlama
- [ ] Netlify → Domain settings → **Add custom domain**: `istebul.com`
- [ ] `www.istebul.com` için yönlendirme kararı verin:
  - (öneri) `www` → apex redirect veya tersi.

### 3.2 DNS kayıtları
- [ ] Netlify’nin verdiği şekilde DNS kayıtlarını girin:
  - Apex için A/ALIAS
  - `www` için CNAME
- [ ] SSL sertifikası Netlify’de “Provision certificate” ile aktif mi?

---

## 4) Yayın öncesi son kontroller

- [ ] Netlify deploy preview linkinde:
  - Auth (login/register)
  - İlan listeleme + detay
  - İlan oluşturma (auth required)
  - Görsel yükleme
  - Mesajlaşma (realtime)
  - Karar asistanı akışı
- [ ] Netlify Functions:
  - `/.netlify/functions/health` 200 dönüyor mu?
  - `upload-image` ve `ai-proxy` yetkisizken 401 dönüyor mu?
- [ ] PWA:
  - Offline sayfası
  - Service worker update davranışı (cache versiyonu)

---

## 5) Canlıya alma

- [ ] Netlify → Production deploy tetikleyin (main branch push veya manuel).
- [ ] Canlı domain üzerinden smoke kontrol yapın.
- [ ] (Opsiyonel) İzleme araçları: Sentry/LogRocket event geliyor mu?
