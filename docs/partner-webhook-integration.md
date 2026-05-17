# isteBul Partner Webhook Integration

isteBul Auto sends qualified hot leads to partner webhook endpoints via HTTPS JSON POST.

## Endpoint

Partner must provide an HTTPS webhook URL.

Example:

https://partner-domain.com/api/istebul/leads

## Method

POST

## Headers

Content-Type: application/json
x-istebul-signature: <hmac_sha256_signature>

## Signature Validation

Signature algorithm:

HMAC_SHA256(raw_request_body, shared_secret)

Partner validates incoming requests using the shared secret.

## Success Response

Any HTTP 2xx response is treated as successful delivery.

Example:

{
  "ok": true
}

Non-2xx responses are treated as failed deliveries and retried automatically.

## Retry Policy

Failed deliveries retry:

- 15 minutes
- 1 hour
- 6 hours
- 24 hours

Maximum retry count:
5

Then lead becomes:

dispatch_dead

## Example Payload

{
  "email": "customer@example.com",
  "phone": "905551112233",
  "budget": 2500000,
  "usage": "family",
  "body": "suv",
  "fuel": "hybrid",
  "km": 15000,
  "loan": "yes",
  "interest_type": "vehicle_offer",
  "vehicle": "BMW X5",
  "lead_score": 150,
  "priority": "very_hot",
  "partner_route": "dealer_partner",
  "estimated_revenue": 7500,
  "source": "auto"
}

## Partner Routes

dealer_partner
finance_partner
insurance_partner
premium_report
general_sales

## Test Flow

1. Partner provides test webhook URL
2. isteBul sends test lead
3. Partner validates payload + signature
4. Partner returns 2xx
5. isteBul verifies dispatched status
6. Production webhook goes live
