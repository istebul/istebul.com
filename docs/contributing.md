# Contributing Guide

## Development flow

1. Create a focused branch.
2. Keep changes small and testable.
3. Run the local quality gates before opening a PR.

```bash
npm ci
npm test
npm run build
npm run build:check
npm run analyze:bundle
```

## Code standards

- Keep browser code as ES modules.
- Keep Netlify Functions and scripts CommonJS unless the whole project is migrated deliberately.
- Do not hardcode secrets or production API keys.
- Do not add direct analytics/monitoring script tags to `index.html`; use consent-gated loaders.
- Avoid `console.log` in production source files under `js/`.

## Testing expectations

- Unit tests cover pure logic and sanitization.
- Integration tests cover serverless helper behavior and health endpoints.
- Smoke tests protect critical UI, security, SEO and build contracts.
- E2E tests should use deterministic selectors and avoid arbitrary waits when possible.

## Pull request checklist

- Tests pass locally.
- New public API behavior is documented in `docs/openapi.yaml`.
- New production risks are reflected in `docs/quality-security-checklist.md`.
- Accessibility and performance checks remain green.
