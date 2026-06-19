/**
 * Public /secenekler catalog mocks — deterministic ai_listings without production Supabase.
 */
import { PUBLISHED_VEHICLE_LISTING_ROWS } from '../../fixtures/secenekler-vehicle-listings.mjs';

const E2E_SUPABASE_URL = 'http://127.0.0.1:54321';
const E2E_SUPABASE_ANON_KEY = 'e2e-secenekler-anon-key';

const E2E_ENV_JS_BODY = `window.__env = Object.assign({}, window.__env || {}, ${JSON.stringify({
  SUPABASE_URL: E2E_SUPABASE_URL,
  SUPABASE_ANON_KEY: E2E_SUPABASE_ANON_KEY,
  SENTRY_DSN: '',
  LOGROCKET_APP_ID: '',
  GOOGLE_OAUTH_ENABLED: 'true',
  GA4_MEASUREMENT_ID: '',
  CF_WEB_ANALYTICS_TOKEN: '',
  PLAUSIBLE_DOMAIN: '',
  CLARITY_PROJECT_ID: ''
})});`;

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ listings?: typeof PUBLISHED_VEHICLE_LISTING_ROWS }} [options]
 */
export async function installSeceneklerCatalogMocks(page, options = {}) {
  const listings = options.listings ?? PUBLISHED_VEHICLE_LISTING_ROWS;

  await page.addInitScript(({ supabaseUrl, supabaseAnonKey }) => {
    const applyCatalogEnv = () => {
      window.__env = {
        ...(window.__env || {}),
        SUPABASE_URL: supabaseUrl,
        SUPABASE_ANON_KEY: supabaseAnonKey
      };
      window.__ibAiListings = {
        aiListingsPublicEnabled: true,
        loadedAt: new Date().toISOString()
      };
    };
    applyCatalogEnv();
    document.addEventListener('DOMContentLoaded', applyCatalogEnv, { once: true });
  }, { supabaseUrl: E2E_SUPABASE_URL, supabaseAnonKey: E2E_SUPABASE_ANON_KEY });

  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === 'GET' && /\/env\.js(\?|$)/.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: E2E_ENV_JS_BODY
      });
    }

    if (method === 'GET' && url.includes('/rest/v1/site_settings')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'content-range': '0-0/1'
        },
        body: JSON.stringify([{ key: 'ai_listings_public_enabled', value: 'true' }])
      });
    }

    if (method === 'GET' && url.includes('/rest/v1/ai_listing_analyses')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'content-range': '0-0/0'
        },
        body: JSON.stringify([])
      });
    }

    if (method === 'GET' && url.includes('/rest/v1/ai_listings')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'content-range': `0-${Math.max(listings.length - 1, 0)}/${listings.length}`
        },
        body: JSON.stringify(listings)
      });
    }

    if (method === 'GET' && url.includes('/functions/v1/ai-listings/listings/public')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: { listings }
        })
      });
    }

    return route.continue();
  });
}
