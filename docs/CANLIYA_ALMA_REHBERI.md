# isteBul — Canlıya alma rehberi (adım adım)

Domain alındı ve aktif; **otomatik deploy** için aşağıdaki zincirin tamamı gerekir. Bu rehberi sırayla uygulayın — her adımı tamamladıktan sonra işaretleyin.

---

## Durum özeti (neden şu an otomatik gitmiyor?)

1. **GitHub Actions**, `CLOUDFLARE_API_TOKEN` vb. secret’lar yoksa Cloudflare adımını **atlıyor** (workflow yeşil görünür ama site güncellenmez).
2. **SEO (#19) ve CRO (#20)** gibi işler henüz `main`’e merge edilmediyse canlıda görünmez.
3. İki deploy kanalı (Cloudflare Git + GitHub Actions) aynı anda açıksa karışıklık olur — **tek kanal** seçin.

---

## BÖLÜM A — Sizin yapacaklarınız (Cloudflare + GitHub)

### Adım 1 — Cloudflare hesap bilgileri (5 dk)

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → giriş yapın.
2. Sağ sütundan **Account ID**’yi kopyalayın → not defterine `CLOUDFLARE_ACCOUNT_ID` yazın.
3. **My Profile → API Tokens → Create Token**
   - Şablon: **Edit Cloudflare Workers** (veya özel token)
   - İzinler: **Account → Cloudflare Pages → Edit**
   - Account Resources: bu hesap
   - Zone Resources: isteBul zone (varsa)
4. Oluşan token’ı **bir kez** kopyalayın → `CLOUDFLARE_API_TOKEN`

### Adım 2 — GitHub repository secrets (10 dk)

1. GitHub → repo **istebul/istebul.com** → **Settings → Secrets and variables → Actions**
2. **New repository secret** ile ekleyin:

| Secret adı | Değer |
|------------|--------|
| `CLOUDFLARE_API_TOKEN` | Adım 1 token |
| `CLOUDFLARE_ACCOUNT_ID` | Adım 1 account id |
| `SUPABASE_URL` | `https://hjfrcdstbyonmgatgwcc.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API → **anon public** |

3. (Önerilen — edge + migration otomatik):

| Secret adı | Değer |
|------------|--------|
| `SUPABASE_ACCESS_TOKEN` | [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_DB_PASSWORD` | Supabase → Database → database password |

### Adım 3 — Cloudflare Pages proje ayarı (10 dk)

1. **Workers & Pages** → projenizi açın (muhtemelen **`istebul-com`** — adres `istebul-com.pages.dev` ise isim budur)
   - GitHub Actions’taki proje adı `CF_PAGES_PROJECT` ile aynı olmalı (repo’da varsayılan: `istebul-com`)
2. **Custom domains**: `istebul.com` ve `www.istebul.com` **Active** olmalı (sizde tamam).
3. **Settings → Builds & deployments**
   - **Önerilen (tek kanal):** GitHub Actions kullanın → Cloudflare’de **Connected Git** build’i **Pause** veya disconnect edin (çift deploy önlenir).
   - **Alternatif:** Sadece Cloudflare Git kullanacaksanız GitHub’daki `deploy-cloudflare` job’unu devre dışı bırakın ve şunları ayarlayın:
     - Build command: `npm run build`
     - Build output directory: `dist`
     - Root directory: `/`
     - Production branch: `main`

4. **Settings → Environment variables** → **Production** (build sırasında `env.js` için):

| Variable | Açıklama |
|----------|----------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | anon key |
| `SENTRY_DSN` | (opsiyonel) |
| `LOGROCKET_APP_ID` | (opsiyonel) |

5. **Settings → Functions** — Pages Functions için runtime secrets (checkout, AI, partner):  
   `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_*`, `GROQ_API_KEY`, `TURNSTILE_SECRET`, `SITE_URL=https://www.istebul.com`  
   (Bunlar Dashboard’da; GitHub secret değil.)

### Adım 4 — DNS kontrolü (domain aktifse genelde hazır)

Cloudflare zone’da:

- `istebul.com` → Pages CNAME veya flatten
- `www` → `istebul.com` veya doğrudan Pages

**SSL/TLS** → **Full (strict)** önerilir.

### Adım 5 — Kodu `main`’e alın (merge)

Açık release PR’ları merge edin (sırayla veya release PR tek seferde):

- SEO organik motor
- CRO dönüşüm iyileştirmeleri  
- veya hazırlanan **production-live-deploy** release PR

Merge sonrası `main`’e push otomatik **Production Deploy** workflow’unu tetikler.

### Adım 6 — Deploy’u tetikleyin ve doğrulayın (5 dk)

1. GitHub → **Actions → Production Deploy** → son `main` push run’ına girin.
2. **Cloudflare Pages** job’u **yeşil** ve log’da `Deployed` görmelisiniz.  
   Sarı uyarı `Missing secret` **olmamalı**.
3. Tarayıcıda:
   - https://www.istebul.com/build-manifest.json → `builtAt` bugünün tarihi
   - https://www.istebul.com/rehber/arac-kredisi-hesaplama/ → SEO sayfası (merge sonrası)
4. Yerel doğrulama (opsiyonel): `node scripts/verify-deploy-setup.cjs`

### Adım 7 — Manuel acil deploy (secret’lar hazırsa)

Bilgisayarınızda:

```bash
export CLOUDFLARE_API_TOKEN="..."
export CLOUDFLARE_ACCOUNT_ID="..."
export SUPABASE_URL="https://hjfrcdstbyonmgatgwcc.supabase.co"
export SUPABASE_ANON_KEY="..."
npm ci && npm run deploy:cf
```

---

## BÖLÜM B — Kullanıcılar yenilikleri anında görsün

| Katman | Davranış |
|--------|----------|
| HTML | `Cache-Control: no-cache` (_headers) |
| `env.js` / `build-manifest.json` | Her istekte ağdan (`no-store`) |
| JS/CSS | Hash’li dosya adları — yeni deploy = yeni URL |
| Uygulama | Yeni `builtAt` algılanınca **«Yeni sürüm — Güncelle»** banner |

Giriş yapmış kullanıcılar eski JS bundle’ı nadiren önbellekte tutabilir; banner **Güncelle** ile tek tık yenileme sağlar.

Service Worker varsayılan **kapalı** (`ISTEBU_ENABLE_SW`); PWA açmadığınız sürece SW eski shell riski düşük.

---

## BÖLÜM C — Agent / geliştirici (bizim taraf)

- [x] SEO + CRO → `cursor/production-live-deploy-0bbd` release branch
- [x] Sürüm kontrolü (`build-manifest.json`)
- [x] `scripts/verify-deploy-setup.cjs`
- [ ] Siz: Adım 1–2 secret’ları ekleyin → yazın «secret’lar eklendi»
- [ ] Merge release PR → `main`
- [ ] Actions log’unu birlikte kontrol

---

## Sorun giderme

| Belirti | Çözüm |
|---------|--------|
| Actions yeşil ama site eski | Cloudflare job skipped — Adım 2 secret’lar |
| `build-manifest` eski tarih | Deploy gerçekten yapılmadı; Adım 6 |
| 404 `/rehber/...` | SEO merge edilmedi; Adım 5 |
| Çift deploy / karışık build | Adım 3 tek kanal |
| Stripe/checkout çalışmıyor | CF Pages **Functions** secrets (Adım 3.5) |

---

**Secret’ları ekledikten sonra bana «hazır» yazın;** Actions log satırlarını birlikte okuyup ilk canlı deploy’u doğrularız.
