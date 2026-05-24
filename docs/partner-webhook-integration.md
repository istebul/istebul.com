# isteBul Partner Webhook Integration

Enterprise reference for B2B lead delivery. Interactive docs: `/partner-docs.html` (includes local signature test console).

## Endpoint

Partner provides an HTTPS webhook URL (registered during onboarding; SSRF-safe validation).

Example: `https://partner-domain.com/api/istebul/leads`

## Method

`POST`

## Headers

| Header | Value | Required |
|--------|-------|----------|
| Content-Type | application/json | Yes |
| x-istebul-signature | HMAC-SHA256 hex of **raw body** | Yes |
| x-istebul-dispatch-id | UUID per delivery attempt | Yes |

## Signature validation

```
HMAC_SHA256(raw_request_body, shared_secret) → lowercase hex
```

**Secret precedence:** per-endpoint `shared_secret` on `partner_endpoints`, else platform `PARTNER_WEBHOOK_SIGNING_SECRET`.

**Critical:** Verify using the exact raw bytes received. Re-serializing JSON after parse will break signatures.

Use constant-time comparison (`timingSafeEqual`).

## Success response

Any HTTP **2xx** within the client timeout (8s) is success.

Example body:

```json
{ "ok": true }
```

## Error handling

| Condition | isteBul behavior |
|-----------|------------------|
| Non-2xx | Retry scheduled |
| Timeout / network | `network_or_timeout`, retry |
| All endpoints on route fail | Failover route if configured |
| 5 failed attempts | `partner_status = dispatch_dead` |

## Retry schedule

| After attempt # | Next retry |
|-----------------|------------|
| 1 | +15 minutes |
| 2 | +1 hour |
| 3 | +6 hours |
| 4–5 | +24 hours |

Maximum retries: **5**, then `dispatch_dead`.

## Failover routing

If primary route endpoints are unavailable (circuit open, daily cap, or all failed), isteBul tries configured failover routes (e.g. `dealer_partner` → `general_sales`).

## Example payload (production dispatch)

```json
{
  "email": "customer@example.com",
  "phone": "905551112233",
  "contact_name": "Ayşe Yılmaz",
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
  "source": "auto",
  "lead_id": "550e8400-e29b-41d4-a716-446655440000",
  "partner_endpoint_id": "660e8400-e29b-41d4-a716-446655440001",
  "partner_endpoint_name": "Example Dealer",
  "dispatch_attempt_id": "770e8400-e29b-41d4-a716-446655440002",
  "manual_dispatch": false
}
```

`dispatch_attempt_id` matches header `x-istebul-dispatch-id`.

## Partner routes

- dealer_partner
- finance_partner
- insurance_partner
- premium_report
- general_sales

## Test workflow

1. Complete self-serve onboarding at `/partner-basvuru.html` (webhook URL + HMAC self-test; secret not stored server-side).
2. Operations assigns `shared_secret` on the live endpoint.
3. Return 2xx on first hot lead; confirm `partner_status = dispatched` in logs.
4. Optional: report outcome via `partner-callback` (separate secret).

Test phones (`905551112233`, etc.) are skipped for production dispatch metrics.

## Partner callback (separate secret)

```
POST {SUPABASE_URL}/functions/v1/partner-callback
x-partner-callback-secret: <PARTNER_CALLBACK_SECRET>
```

Body:

```json
{
  "lead_id": "uuid",
  "partner_status": "won",
  "actual_revenue": 5000,
  "notes": "optional",
  "event_id": "optional-idempotency"
}
```

Allowed `partner_status`: accepted, won, lost, paid, closed, funded, delivered, rejected.

Do not use the webhook signing secret for callbacks.
