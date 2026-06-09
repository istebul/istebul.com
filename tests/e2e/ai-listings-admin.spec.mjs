import { test, expect } from '@playwright/test';

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
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    category: 'vehicle',
    title: '2021 Audi A4',
    status: 'pending_review',
    source_type: 'csv',
    duplicate_status: 'similar',
    created_at: '2026-06-07T10:00:00.000Z',
    updated_at: '2026-06-07T10:00:00.000Z',
    attributes: { brand: 'Audi', model: 'A4', year: 2021 },
    latest_analysis: {
      ai_score: 55,
      risk_score: 72,
      quality_score: 48,
      decision_score: 55,
      created_at: '2026-06-07T10:00:00.000Z',
      tags: ['executive_label:Riskli']
    }
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    category: 'housing',
    title: 'Kadıköy Daire',
    status: 'draft',
    source_type: 'manual',
    created_at: '2026-06-06T10:00:00.000Z',
    updated_at: '2026-06-06T10:00:00.000Z',
    attributes: {},
    latest_analysis: {
      ai_score: 40,
      risk_score: 40,
      quality_score: 50,
      decision_score: 40
    }
  }
];

async function installAdminMocks(page) {
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

    if (url.includes('/ai-listings/listings/import')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { created_count: 0, analyzed_count: 0, invalid_count: 0 } })
      });
    }

    if (url.includes('/ai-listings/listings/') && route.request().method() === 'GET') {
      const listingId = url.split('/listings/')[1]?.split('/')[0] ?? MOCK_LISTINGS[0].id;
      const listing = MOCK_LISTINGS.find((item) => item.id === listingId) ?? MOCK_LISTINGS[0];
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
      const requestUrl = new URL(url);
      let listings = [...MOCK_LISTINGS];
      const status = requestUrl.searchParams.get('status');
      const category = requestUrl.searchParams.get('category');
      const limit = Number(requestUrl.searchParams.get('limit') ?? '0');

      if (status) listings = listings.filter((item) => item.status === status);
      if (category) listings = listings.filter((item) => item.category === category);
      if (Number.isFinite(limit) && limit > 0) listings = listings.slice(0, limit);

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { listings } })
      });
    }

    return route.continue();
  });
}

async function openAdminKararMerkezi(page) {
  await installAdminMocks(page);
  await page.goto('/admin/ai-listings/');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('#ai-listings-view-nav')).toBeVisible();
  await expect(page.locator('#ai-listings-list .ai-listings-admin__listing-card').first()).toBeVisible({
    timeout: 15000
  });
}

test.describe('Admin Karar Merkezi', () => {
  test('decision tab loads listings, search, status filters and refresh', async ({ page }) => {
    await openAdminKararMerkezi(page);

    await expect(page.locator('#ai-listings-decision-panel')).toBeVisible();
    await expect(page.locator('#ai-listings-sidebar')).toBeVisible();
    await expect(page.locator('.ai-listings-admin__listing-card')).toHaveCount(3);

    await page.locator('#ai-listings-search').fill('BMW');
    await expect(page.locator('.ai-listings-admin__listing-card')).toHaveCount(1);

    await page.locator('#ai-listings-search').fill('');
    const approvedChip = page.locator('#ai-listings-status-filters [data-status-filter="approved"]');
    await approvedChip.click();
    await expect(page.locator('.ai-listings-admin__listing-card')).toHaveCount(1);

    await page.locator('#ai-listings-status-filters [data-status-filter=""]').click();
    await page.locator('#ai-listings-filter-limit').fill('2');
    await page.locator('#ai-listings-filter-limit').press('Enter');
    await expect(page.locator('.ai-listings-admin__listing-card')).toHaveCount(2);

    await page.locator('#ai-listings-refresh-list-btn').click();
    await expect(page.locator('#ai-listings-status')).toContainText(/ilan yüklendi|İlan bulunamadı/i);
    await expect(page.locator('.ai-listings-admin__listing-card').first()).toBeVisible();
  });

  test('repository and analytics tabs render isolated hosts', async ({ page }) => {
    await openAdminKararMerkezi(page);

    await page.locator('[data-admin-view="repository"]').click();
    await expect(page.locator('#ai-listings-repository-panel')).toBeVisible();
    await expect(page.locator('#ai-listings-repository-content')).toContainText(/Veri Havuzu/);
    await expect(page.locator('#ai-listings-sidebar')).toHaveAttribute('hidden', '');

    await page.locator('[data-admin-view="analytics"]').click();
    await expect(page.locator('#ai-listings-analytics-panel')).toBeVisible();
    await expect(page.locator('#ai-listings-analytics-content')).toContainText(/Analitik/);
    await expect(page.locator('#ai-listings-analytics-kpi')).toBeVisible();
  });

  test('recommendations panel keeps card badges and profile form stable', async ({ page }) => {
    await openAdminKararMerkezi(page);

    await page.locator('[data-admin-view="recommendations"]').click();
    await expect(page.locator('[data-admin-view="recommendations"]')).toHaveClass(/view-tab--active/);
    await expect(page.locator('#ai-listings-recommendations-panel')).toBeVisible();
    await page.waitForFunction(() => {
      const host = document.getElementById('ai-listings-recommendations-content');
      return Boolean(host && host.innerHTML.includes('Öneriler'));
    }, { timeout: 15000 });
    await expect(page.locator('[data-rec-action="generate"]')).toBeVisible();

    await page.locator('[data-rec-action="generate"]').click();
    await expect(page.locator('[data-rec-record-id]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.ai-rec-card__label, .ai-rec-card__score').first()).toBeVisible();
  });

  test('new listing menu opens drawer without breaking list state', async ({ page }) => {
    await openAdminKararMerkezi(page);

    await page.locator('#ai-listings-new-menu-btn').click();
    await expect(page.locator('#ai-listings-new-menu')).toBeVisible();
    await page.locator('[data-menu-action="create"]').click();
    await expect(page.locator('#ai-listings-create-drawer')).toBeVisible();
    await page.locator('#ai-listings-drawer-close').click();
    await expect(page.locator('.ai-listings-admin__listing-card')).toHaveCount(3);
  });

  test('mobile layout avoids horizontal overflow on decision and analytics tabs', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAdminKararMerkezi(page);

    const workspaceOverflow = await page.evaluate(() => {
      const workspace = document.querySelector('#ai-listings-workspace');
      if (!workspace) return false;
      return workspace.scrollWidth > workspace.clientWidth + 2;
    });
    expect(workspaceOverflow).toBe(false);

    await page.locator('[data-admin-view="analytics"]').click();
    await expect(page.locator('#ai-listings-analytics-content')).toContainText(/Analitik/);

    const analyticsOverflow = await page.evaluate(() => {
      const panel = document.querySelector('#ai-listings-analytics-content');
      if (!panel) return false;
      return panel.scrollWidth > panel.clientWidth + 2;
    });
    expect(analyticsOverflow).toBe(false);
  });
});
