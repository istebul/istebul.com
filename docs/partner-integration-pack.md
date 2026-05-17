# isteBul Partner Entegrasyon Paketi

## 1. Lead Webhook

isteBul, uygun müşteri adaylarını partner webhook endpoint'ine POST olarak gönderir.

### Endpoint

Partner, isteBul'a HTTPS webhook URL sağlamalıdır.

Örnek:

https://partner-domain.com/api/istebul/leads

### Headers

Content-Type: application/json
x-istebul-signature: <hmac_sha256_signature>

Signature mantığı:

HMAC_SHA256(raw_request_body, PARTNER_WEBHOOK_SIGNING_SECRET)

### Örnek lead payload

{
  "id": "lead_uuid",
  "phone": "905xxxxxxxxx",
  "email": "user@example.com",
  "budget": 1500000,
  "usage": "family",
  "body": "suv",
  "fuel": "hybrid",
  "km": 15000,
  "loan": "yes",
  "interest_type": "vehicle_offer",
  "vehicle": "Önerilen araç",
  "lead_score": 120,
  "priority": "hot",
  "partner_route": "dealer_partner",
  "estimated_revenue": 5000
}

Başarılı kabul için partner endpoint'i 2xx HTTP status dönmelidir.

## 2. Retry Davranışı

Partner webhook başarısız olursa isteBul otomatik tekrar dener.

Retry planı:

1. deneme sonrası: 15 dakika
2. deneme sonrası: 1 saat
3. deneme sonrası: 6 saat
sonraki denemeler: 24 saat
maksimum: 5 deneme

Maksimum deneme sonrası lead dispatch_dead durumuna alınır.

## 3. Partner Callback

Partner, lead sonucunu isteBul'a geri bildirmek için callback endpoint'ini kullanır.

Endpoint:

https://hjfrcdstbyonmgatgwcc.supabase.co/functions/v1/partner-callback

Method:

POST

Headers:

Content-Type: application/json
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <SUPABASE_ANON_KEY>
x-partner-callback-secret: <PARTNER_CALLBACK_SECRET>

Callback payload:

{
  "lead_id": "lead_uuid",
  "partner_status": "won",
  "actual_revenue": 5000,
  "notes": "Partner satış tamamlandı"
}

Telefon ile callback de desteklenir:

{
  "phone": "905xxxxxxxxx",
  "partner_status": "lost",
  "actual_revenue": 0,
  "notes": "Müşteri vazgeçti"
}

Desteklenen partner_status değerleri:

won
lost
paid
closed
funded
delivered
rejected

Başarılı response:

{
  "ok": true,
  "updated": 1,
  "lead": {
    "id": "lead_uuid",
    "partner_status": "won",
    "status": "won",
    "actual_revenue": 5000
  }
}

## 4. Test Komutu

ANON="<SUPABASE_ANON_KEY>"
CALLBACK_SECRET="<PARTNER_CALLBACK_SECRET>"

curl -s -X POST https://hjfrcdstbyonmgatgwcc.supabase.co/functions/v1/partner-callback \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -H "x-partner-callback-secret: $CALLBACK_SECRET" \
  -d '{"lead_id":"lead_uuid","partner_status":"won","actual_revenue":5000,"notes":"callback test"}'

## 5. Güvenlik Notları

- Partner webhook HTTPS olmalıdır.
- Webhook signature doğrulanmalıdır.
- Callback secret partner dışında paylaşılmamalıdır.
- Her callback tek lead günceller.
- 2xx olmayan partner response'ları retry kuyruğuna alınır.
- Test lead'ler production metriklerinden ayrı takip edilmelidir.

## 6. Operasyonel Durumlar

pending: Lead oluştu, partner gönderimi bekliyor
dispatched: Partner webhook başarılı
dispatch_failed: Partner webhook başarısız, retry bekliyor
dispatch_dead: Maksimum retry sonrası durduruldu
won: Kazanıldı
lost: Kaybedildi
paid / closed / funded / delivered: Partner özel başarılı kapanış durumları
rejected: Partner tarafından reddedildi
