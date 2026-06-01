# isteBul ödeme ortam değişkenleri

Türkiye ödemeleri **iyzico** (birincil) ve **PayTR** (yedek) üzerinden Supabase Edge Functions ile işlenir. **Stripe** pasif / global yedek modundadır; aktif checkout CTA’larında kullanılmaz.

## Supabase Secrets (production)

Aşağıdaki değerleri **Supabase Dashboard → Project Settings → Edge Functions → Secrets** bölümüne ekleyin. GitHub veya Cloudflare’a ödeme secret’ı eklemeyin.

| Secret | Açıklama |
|--------|----------|
| `IYZICO_API_KEY` | iyzico API anahtarı |
| `IYZICO_SECRET_KEY` | iyzico gizli anahtar |
| `IYZICO_BASE_URL` | `https://api.iyzipay.com` veya sandbox URL |
| `IYZICO_WEBHOOK_SECRET` | Webhook imza doğrulama (IYZWSv2 — `iyzico-webhook`) |
| `PAYTR_MERCHANT_ID` | PayTR mağaza no |
| `PAYTR_MERCHANT_KEY` | PayTR merchant key |
| `PAYTR_MERCHANT_SALT` | PayTR merchant salt |
| `PAYTR_BASE_URL` | `https://www.paytr.com` |
| `PAYTR_TEST_MODE` | `1` test, `0` canlı |
| `PAYMENT_SUCCESS_URL` | Örn. `https://www.istebul.com/profil?payment=success` |
| `PAYMENT_FAILURE_URL` | Örn. `https://www.istebul.com/profil?payment=failed` |

Stripe (pasif / legacy Cloudflare webhook):

| Secret | Açıklama |
|--------|----------|
| `STRIPE_SECRET_KEY` | Sadece legacy `/api/stripe-webhook` için |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook imzası |

## Webhook URL’leri

- iyzico: `https://hjfrcdstbyonmgatgwcc.supabase.co/functions/v1/iyzico-webhook`
- PayTR: `https://hjfrcdstbyonmgatgwcc.supabase.co/functions/v1/paytr-webhook`

## Edge Functions

| Function | Rol |
|----------|-----|
| `create-payment-session` | iyzico checkout (auth zorunlu) |
| `iyzico-webhook` | Ödeme sonucu + entitlement |
| `paytr-create-payment-session` | PayTR token / iframe |
| `paytr-webhook` | PayTR callback (`OK` / `FAIL`) |

## ENV yokken davranış

- Site ve build çalışmaya devam eder.
- Ödeme butonları **503** `PAYMENT_PROVIDER_NOT_CONFIGURED` döner; kullanıcıya: *Ödeme altyapısı hazırlandı. Sağlayıcı aktivasyonu tamamlandığında ödeme alınabilecektir.*
- Admin **Payments** sekmesinde sağlayıcılar `pending` / Stripe `passive` görünür.

## Deploy

1. Migration: `supabase db push` veya CI migration workflow.
2. Edge Functions deploy: `supabase functions deploy create-payment-session` (ve diğerleri).
3. Secrets eklendikten sonra yeniden deploy gerekmez; runtime’da okunur.
