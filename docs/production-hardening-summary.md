# Production Hardening Summary

Completed:
- HTML no-cache via Cloudflare/cache rules.
- Hashed immutable CSS/JS assets.
- Root-relative CSS references for nested routes.
- Auth/login flow fixed.
- Signed-in header layout fixed.
- RLS audit completed; site_settings write/delete locked.
- Admin and partner endpoints protected.
- auto-intake origin lock deployed.
- Event and lead rate limits verified.
- Partner dispatch retry scheduling fixed.
- Partner callback requires explicit lead_id.
- Stripe checkout idempotency key made unique.
- Live secret scan clean.
- Security headers verified.
