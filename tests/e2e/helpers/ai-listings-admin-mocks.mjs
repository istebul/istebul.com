/**
 * AI listings admin E2E mock'ları — contrast guard ve admin spec'lerinde paylaşılır.
 */
const MOCK_LISTINGS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    category: 'vehicle',
    title: '2021 BMW 320i',
    status: 'approved',
    source_type: 'manual',
    created_at: '2026-06-08T10:00:00.000Z',
    updated_at: '2026-06-08T10:00:00.000Z',
    attributes: { brand: 'BMW', model: '320i', year: 2021 },
    latest_analysis: {
      ai_score: 85,
      risk_score: 25,
      quality_score: 88,
      decision_score: 85,
      created_at: '2026-06-08T10:00:00.000Z',
      tags: ['executive_label:Satın Alınabilir']
    }
  }
];

export async function installAiListingsAdminMocks(page) {
  await page.addInitScript(() => {
    window.__env = {
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_ANON_KEY: 'e2e-test-anon-key'
    };
    localStorage.setItem('istebul_ai_listings_secret', 'e2e-test-secret');
    localStorage.setItem(
      'istebul-auth-admin-v1',
      JSON.stringify({
        access_token: 'e2e-token',
        token_type: 'bearer',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        refresh_token: 'e2e-refresh',
        user: {
          id: 'admin-user-id',
          email: 'admin@example.com',
          app_metadata: {},
          user_metadata: {}
        }
      })
    );
  });

  await page.route('**/*', async (route) => {
    const url = route.request().url();

    if (url.includes('/auth/v1/token') || url.includes('/auth/v1/user')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'e2e-token',
          token_type: 'bearer',
          expires_in: 3600,
          user: { id: 'admin-user-id', email: 'admin@example.com' }
        })
      });
    }

    if (url.includes('/auth/v1/session')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            session: {
              access_token: 'e2e-token',
              user: { id: 'admin-user-id', email: 'admin@example.com' }
            }
          }
        })
      });
    }

    if (url.includes('/rest/v1/profiles')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ role: 'admin', is_banned: false })
      });
    }

    if (url.includes('/ai-listings/listings/') && route.request().method() === 'GET') {
      const listing = MOCK_LISTINGS[0];
      if (url.includes('/events')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, data: { events: [] } })
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { listing, latest_analysis: listing.latest_analysis } })
      });
    }

    if (url.includes('/ai-listings/listings')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { listings: MOCK_LISTINGS } })
      });
    }

    return route.continue();
  });
}
