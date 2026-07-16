# P8-E Payment Gateway Integration

GarsonAI rezervasyon akışını (Guarantee → Gateway → Authorization → Confirmed) gerçek ödeme sağlayıcılarına hazırlayan additive katman.

## Amaç

P8-A AI Core + P8-B Knowledge Graph + P8-C AI Concierge + P8-D AI Action Engine üzerine inşa.

- Gerçek API anahtarı gerektirmez (bu faz)
- Stripe / iyzico / PayTR için Strategy stub
- Mock ile authorize / capture / release / refund

## Paket

`src/payment-gateway/` → `@istebul/payment-gateway`

## Provider mimarisi

```
getPaymentGatewayProvider(code)
        ↓
Stripe | iyzico | PayTR | Mock  (Strategy)
        ↓
PaymentGatewayService.authorize / capture / release / refund
```

## Gateway konfigürasyonu

Restoran başına:

- `activeProvider`
- `mode` (test | live)
- `webhookSecret`
- `merchantId`
- `providerMetadata`

## Authorization akışı

`pending → authorized → captured → released → refunded` (+ `expired` / `cancelled`)

## Reservation Guarantee

Kurallar: sabit · kişi başı · yüzdesel · hafta sonu · özel gün  
`GuaranteeCalculator` + Action Engine `apply_guarantee` köprüsü.

## AI Action Engine entegrasyonu

`ConciergePaymentBridge`:

1. Guarantee gerekli mi?
2. Provider seç
3. Mock authorize
4. Sonucu konuşma mesajına ekle

`prepare_payment` (P8-D) skipped kalır — canlı tahsilat yok.

## Webhook mimarisi

`ProviderWebhookRouter` → Stripe / iyzico / PayTR handlers  
Sadece parse foundation — gerçek çağrı yok.

## Realtime

Kanal: `garson:{restaurant_id}:payment-gateway`

## ERP / CX

- ERP: `/garson/erp/payment-gateways`
- CX: Guarantee → Payment Gateway → Authorization → Summary → Confirmed

## Migration

`supabase/migrations/20260718_garsonai_p8e_payment_gateway.sql`  
Tablolar: `payment_gateway_configs`, `payment_authorizations`, `payment_webhooks`, `payment_provider_events`, `payment_settlements`

## Test

- `tests/unit/payment-gateway-platform.test.mjs`
- `tests/unit/payment-gateway-runtime.test.mjs`
