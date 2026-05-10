# Troubleshooting Guide

## Supabase configuration warning

If the app logs missing Supabase configuration, set these variables in the target environment:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

For Netlify Functions also configure:

- `SUPABASE_SERVICE_ROLE_KEY`

## Netlify Functions fail locally

Check that dependencies are installed and environment variables are available. Then run the app with the local server or Netlify CLI.

## AI proxy returns configuration error

Set `CLAUDE_API_KEY` in Netlify environment variables. The browser must never receive this key.

## Monitoring does not start

Monitoring is intentionally consent-gated. It starts only when all conditions are true:

- User accepted cookie/analytics consent.
- `SENTRY_DSN` or `LOGROCKET_APP_ID` is configured.
- CSP allows the required provider CDN and ingest domains.

## Smoke test fails on domain checks

The production domain should be `istebul.com` in:

- `index.html`
- `robots.txt`
- `sitemap.xml`
- `docs/openapi.yaml`
- `js/app.js`

## Build output check fails

Run:

```bash
npm run build
npm run build:check
```

If required files are missing, update `scripts/production-build.js` and `scripts/check-build-output.js` together.

## E2E tests are flaky

Prefer stable selectors over text-only selectors, ensure the local server is running, and seed deterministic test data for authenticated flows.
