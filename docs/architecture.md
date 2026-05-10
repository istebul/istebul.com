# Architecture Guide

## Overview

istebul is a vanilla JavaScript single-page marketplace application deployed on Netlify and backed by Supabase.

## Runtime components

- **Browser SPA:** `index.html`, `css/style.css`, `js/app.js`
- **Routing:** `js/core/router.js`
- **API client:** `js/core/api.js`
- **Auth/data/storage:** Supabase Auth, Postgres and Storage
- **Serverless API:** Netlify Functions in `netlify/functions`
- **AI proxy:** `netlify/functions/claude-proxy.js`
- **Image upload:** `netlify/functions/upload-image.js`
- **Health check:** `netlify/functions/health.js`

## Data flow

1. User interacts with the SPA.
2. Router shows the matching section.
3. API client validates/sanitizes inputs.
4. Public reads go to Supabase or local fallback data.
5. Protected operations use Supabase auth tokens.
6. Sensitive operations go through Netlify Functions.

## Security boundaries

- Service role keys stay only in Netlify environment variables.
- Browser code only receives public anon keys.
- Function endpoints validate Bearer tokens where required.
- AI/upload endpoints use rate limiting headers and hashed client keys.
- Monitoring and analytics scripts load only after consent.

## Build output

`npm run build` creates `dist/` with minified HTML, CSS and JavaScript plus static assets, `robots.txt`, `sitemap.xml` and a build manifest.
