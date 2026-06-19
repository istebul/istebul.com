import { expect } from '@playwright/test';

export async function completeKonutWizard(page, { cashBuffer = '0-1' } = {}) {
  const wizard = page.locator('#housing-wizard');
  await expect(wizard).toBeVisible();

  const clickNext = async () => {
    await page.evaluate(() => document.getElementById('housing-next')?.click());
    await page.waitForTimeout(150);
  };

  await wizard.locator('[data-field="purchasePurpose"][data-value="Satın almak istiyorum"]').click();
  await clickNext();

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

  await expect(page.locator('#housing-results .konut-v2-root')).toBeVisible({ timeout: 30000 });
}
