# Ops runbook — Supabase migration + iyzico (prod)

**Proje ref:** `hjfrcdstbyonmgatgwcc`  
**Site:** https://www.istebul.com  
**Güncelleme:** 2026-06-01 · v2.2.19+

Bu rehber, **Hafta 1** maddelerini (30 günlük plan) uygular: veritabanı migration, edge ödeme fonksiyonları, iyzico sandbox testi. Secret değerlerini buraya yazmayın; yalnızca Dashboard / CLI kullanın.

İlgili: `docs/LIVE_DATA_30DAY_CHECKLIST.md` · `docs/payments-env.md` · `docs/CANLIYA_ALMA_REHBERI.md`

---

## Commercial agreement gate (2026-06-18)

| Alan | Durum |
|------|--------|
| **Status** | `READY-INACTIVE` |
| **Live payments** | `NO-GO` |
| **Sandbox smoke** | `DEFERRED` |
| **Reason** | Commercial payment provider agreement pending |

**Karar:** Ödeme sağlayıcı ticari anlaşması tamamlanmadan **canlı ödeme açılmaz**. `IYZICO_BASE_URL` production canlı endpoint’e (`https://api.iyzipay.com`) alınmaz. Sandbox smoke, merchant panel erişimi ve anlaşma oluşana kadar **HOLD** — bu runbook’taki Bölüm 4 ve sonrası operasyonel adımlar referans içindir; otomatik GO yoktur.

**Mevcut teknik durum (kod):**

- HMAC unit test + docs hazır (PR #402, main `5afaba37+`).
- Edge functions (`create-payment-session`, `iyzico-webhook`) deploy edilebilir; secrets yoksa veya sandbox değilse checkout **503** / webhook **NOT_CONFIGURED** — kasıtlı inaktif davranış.
- Canlı ödeme runtime’ı ticari GO olmadan etkinleştirilmez.

**Production’da sağlayıcı enable öncesi:** Operasyon + ticari onay ile açık **manuel GO** gerekir. Secret değerlerini bu belgeye veya repoya yazmayın.

**Anlaşma tamamlandıktan sonra minimum sıra:**

1. Merchant / sandbox panel erişimini doğrula
2. Supabase’de sandbox env secret **adlarını** tanımla (`IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL`, `IYZICO_WEBHOOK_SECRET`, `PAYMENT_SUCCESS_URL`, `PAYMENT_FAILURE_URL`)
3. Sandbox checkout smoke (`create-payment-session` → initialize success)
4. Webhook log: `signature_valid: true`
5. Entitlement oluşumu (`user_entitlements` / Pro)
6. Operasyonel **GO** kaydı
7. Ancak ondan sonra **live enable** değerlendirmesi (`IYZICO_BASE_URL` canlı endpoint)

---

## Ön koşullar

- [ ] Supabase hesabında bu projeye **Owner** veya migration yetkisi
- [ ] [Supabase CLI](https://supabase.com/docs/guides/cli) kurulu (`supabase --version`)
- [ ] [iyzico Merchant Panel](https://merchant.iyzipay.com) sandbox API anahtarları
- [ ] GitHub repo’da `SUPABASE_ACCESS_TOKEN` secret (otomatik `db push` + edge deploy için)

---

## Bölüm 1 — Supabase migration (≈10 dk)

### 1.1 CLI ile bağlan

```bash
cd /path/to/istebul.com
export SUPABASE_ACCESS_TOKEN="sbp_..."   # dashboard → Account → Access Tokens
supabase login   # token yoksa
supabase link --project-ref hjfrcdstbyonmgatgwcc --yes
```

### 1.2 Migration’ları uygula

```bash
supabase db push --yes --include-all
```

`db push` hata verirse (migration history drift):

```bash
# Yedek: doğrudan pooler URL (Dashboard → Settings → Database → Connection string)
export SUPABASE_DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@..."
supabase db push --yes --include-all --db-url "$SUPABASE_DATABASE_URL"
```

Veya SQL Editor’da tek dosyayı çalıştırın:  
`supabase/migrations/20260620_live_data_settings.sql`

### 1.3 Doğrulama (SQL Editor)

```sql
-- Canlı veri bayrakları
SELECT key, value, updated_at
FROM public.site_settings
WHERE key IN ('live_providers_enabled', 'live_finance_feed_url');

-- Public okuma allowlist (live_providers_enabled dahil)
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'site_settings'
  AND policyname = 'Public read allowlisted site_settings';
```

Beklenen:

| key | value (ilk kurulum) |
|-----|---------------------|
| `live_providers_enabled` | `false` |
| `live_finance_feed_url` | `` (boş) |

**Önemli:** Feed hazır olmadan `live_providers_enabled` **true yapmayın** (yanlış “canlı veri” iddiası).

### 1.4 Yerel script

```bash
node scripts/verify-supabase-lead-schema.cjs
npm run audit:live-data
```

---

## Bölüm 2 — Edge functions deploy (≈15 dk)

`main` push ile CI çoğu fonksiyonu deploy eder; **ödeme webhook’ları** için aşağıdaki listeyi de kontrol edin.

### 2.1 Ödeme + durum fonksiyonları (manuel veya CI)

```bash
export SUPABASE_ACCESS_TOKEN="sbp_..."
PROJECT=hjfrcdstbyonmgatgwcc

for fn in \
  create-payment-session \
  iyzico-webhook \
  paytr-create-payment-session \
  paytr-webhook \
  payment-provider-status; do
  echo "Deploying $fn..."
  supabase functions deploy "$fn" --project-ref "$PROJECT"
done
```

### 2.2 Webhook URL’leri (iyzico paneline kaydedin)

| Sağlayıcı | URL |
|-----------|-----|
| iyzico | `https://hjfrcdstbyonmgatgwcc.supabase.co/functions/v1/iyzico-webhook` |
| PayTR | `https://hjfrcdstbyonmgatgwcc.supabase.co/functions/v1/paytr-webhook` |

---

## Bölüm 3 — iyzico secrets (≈10 dk)

**Supabase Dashboard** → Project **hjfrcdstbyonmgatgwcc** → **Edge Functions** → **Secrets**

| Secret | Sandbox örneği | Production |
|--------|----------------|------------|
| `IYZICO_API_KEY` | Sandbox API key | Canlı API key |
| `IYZICO_SECRET_KEY` | Sandbox secret | Canlı secret |
| `IYZICO_BASE_URL` | `https://sandbox-api.iyzipay.com` | `https://api.iyzipay.com` |
| `IYZICO_WEBHOOK_SECRET` | Paneldeki webhook secret | Aynı (canlı) |
| `PAYMENT_SUCCESS_URL` | `https://www.istebul.com/profil?payment=success` | Aynı |
| `PAYMENT_FAILURE_URL` | `https://www.istebul.com/profil?payment=failed` | Aynı |

CLI alternatifi (tek satır örnek — değerleri kendi ortamınızdan alın):

```bash
supabase secrets set \
  IYZICO_API_KEY="..." \
  IYZICO_SECRET_KEY="..." \
  IYZICO_BASE_URL="https://sandbox-api.iyzipay.com" \
  IYZICO_WEBHOOK_SECRET="..." \
  PAYMENT_SUCCESS_URL="https://www.istebul.com/profil?payment=success" \
  PAYMENT_FAILURE_URL="https://www.istebul.com/profil?payment=failed" \
  --project-ref hjfrcdstbyonmgatgwcc
```

`SUPABASE_SERVICE_ROLE_KEY` ve `SUPABASE_ANON_KEY` edge’de zaten tanımlı olmalı (Supabase otomatik enjekte eder).

---

## Bölüm 4 — Sandbox test ödemesi (≈20 dk)

### 4.1 Admin’de sağlayıcı durumu

1. https://www.istebul.com/admin-panel.html → giriş (admin rolü)
2. **Ödeme** sekmesi → iyzico **configured** / aktif görünmeli  
   (Edge: `payment-provider-status` — secrets doluysa `configured`)

### 4.2 Kullanıcı akışı

1. Siteye normal kullanıcı ile giriş
2. Fiyatlandırma → **isteBul Pro** → ödeme başlat
3. iyzico sandbox checkout’u tamamla (test kartı — iyzico dokümantasyonu)
4. Dönüş URL: `/profil?payment=success`

### 4.3 Veritabanı / log

SQL Editor:

```sql
SELECT id, user_id, status, provider, created_at
FROM public.orders
ORDER BY created_at DESC
LIMIT 5;
```

Supabase → **Edge Functions** → `iyzico-webhook` → **Logs**: imza doğrulama hatası olmamalı.

### 4.4 Hata kodları

| Belirti | Olası neden |
|---------|-------------|
| `PAYMENT_PROVIDER_NOT_CONFIGURED` | Secrets eksik veya yanlış proje |
| 401 checkout | Kullanıcı oturumu yok |
| Webhook 401/403 | `IYZICO_WEBHOOK_SECRET` uyumsuz |
| Ödeme OK ama Pro yok | `iyzico-webhook` deploy edilmemiş |

---

## Bölüm 5 — Canlı veri modu (feed sonrası)

1. Admin → **Ayarlar** → **Canlı veri**
2. `live_finance_feed_url` → edge’in okuyacağı feed URL (public değil)
3. Feed canlı test edildikten sonra **Canlı sağlayıcı modu** açın
4. Ana sitede karar panelinde mod: **Canlı sağlayıcı modu** (simülasyon uyarısı kalkar)

---

## Bölüm 6 — GitHub / Cloudflare (site zaten canlıysa)

Site deploy için: `docs/CANLIYA_ALMA_REHBERI.md` Adım 1–6.

Hızlı kontrol:

```bash
curl -sS https://www.istebul.com/build-manifest.json | head -c 200
npm run smoke:live -- https://www.istebul.com
```

---

## Checklist (kopyala-yapıştır)

```
[ ] supabase db push OK
[ ] site_settings live_providers_enabled = false (başlangıç)
[ ] Edge: create-payment-session, iyzico-webhook deploy
[ ] IYZICO_* secrets (sandbox)
[ ] iyzico panel webhook URL kayıtlı
[ ] 1 sandbox ödeme → orders satırı
[ ] Admin ödeme sekmesi configured
[ ] (Sonra) live_finance_feed_url + canlı mod
```

---

## Destek komutları

```bash
npm run go-live:verify
node scripts/live-data-readiness-audit.cjs
gh run list --branch main --limit 3
```
