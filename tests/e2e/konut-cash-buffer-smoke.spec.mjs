import { test, expect } from '@playwright/test';

const VIEWPORT = { width: 390, height: 844 };

async function advanceKonutWizard(page, { cashBuffer = '0-1' } = {}) {
  const wizard = page.locator('#housing-wizard');
  await expect(wizard).toBeVisible();

  const clickNext = async () => {
    await page.evaluate(() => document.getElementById('housing-next')?.click());
    await page.waitForTimeout(150);
  };

  await wizard.locator('[data-field="purchasePurpose"][data-value="Satın almak istiyorum"]').click();
  await clickNext();

  await expect(wizard).toContainText(/Peşinat sonrası kaç aylık güvenlik payınız kalıyor/i);
  await wizard.locator(`[data-field="cash_buffer_months"][data-value="${cashBuffer}"]`).click();

  await wizard.locator('[data-input="totalBudget"]').fill('4000000');
  await wizard.locator('[data-input="downPayment"]').fill('1200000');
  await wizard.locator('[data-input="monthlyCapacity"]').fill('45000');
  await wizard.locator('[data-input="monthlyIncome"]').fill('80000');
  await wizard.locator('[data-input="useFinancing"]').selectOption('evet');
  await wizard.locator('[data-input="loanAmount"]').fill('2800000');
  await clickNext();

  await wizard.locator('[data-input="city"]').selectOption({ label: 'İstanbul' });
  await wizard.locator('[data-input="district"]').fill('Kadıköy');
  await wizard.locator('[data-action="toggle-location"][data-value="ulasim"]').click();
  await clickNext();

  await wizard.locator('[data-field="homeType"][data-value="Daire"]').click();
  await wizard.locator('[data-input="householdSize"]').fill('4');
  await clickNext();

  await wizard.locator('[data-action="toggle-risk"]').filter({ hasText: 'Deprem' }).click();
  await clickNext();

  const v2Root = page.locator('#housing-results .konut-v2-root');
  await expect(v2Root).toBeVisible({ timeout: 30000 });
  return v2Root;
}

test.describe('Konut cash buffer post-deploy smoke @390px', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await page.goto('/konut/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#housing-wizard')).toBeVisible();
  });

  test('0-1 ay seçiminde AI nakit güvenliği vurgular', async ({ page }) => {
    const v2Root = await advanceKonutWizard(page, { cashBuffer: '0-1' });

    await expect(v2Root.locator('[data-insight-why]')).toContainText(/güvenlik payı|nakit/i);
    await expect(v2Root.locator('[data-insight-risk]')).toContainText(/nakit tamponu|Peşinat sonrası/i);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2);
    expect(overflow).toBe(true);
  });

  test('6+ ay seçiminde AI güvenlik payı metni üretir', async ({ page }) => {
    const v2Root = await advanceKonutWizard(page, { cashBuffer: '6+' });

    await expect(v2Root.locator('[data-insight-why]')).toContainText(/6\+ aylık güvenlik payı|güvenlik payı/i);
    await expect(v2Root.locator('[data-insight-risk]')).not.toContainText(/Peşinat sonrası kısa nakit tamponu/i);
  });

  test('0-1 ay ve 6+ ay aynı girdilerde aynı skoru üretir', async ({ browser }) => {
    async function finishWithBuffer(cashBuffer) {
      const page = await browser.newPage();
      await page.setViewportSize(VIEWPORT);
      await page.goto('/konut/');
      await page.waitForLoadState('domcontentloaded');
      const v2Root = await advanceKonutWizard(page, { cashBuffer });
      const scoreText = await v2Root.locator('.konut-v2-hero-badge--score').innerText();
      await page.close();
      const match = String(scoreText).match(/(\d+)/);
      return match ? Number(match[1]) : null;
    }

    const scoreTight = await finishWithBuffer('0-1');
    const scoreStrong = await finishWithBuffer('6+');

    expect(scoreTight).not.toBeNull();
    expect(scoreStrong).toBe(scoreTight);
  });
});
