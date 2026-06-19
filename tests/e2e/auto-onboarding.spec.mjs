import { test, expect } from '@playwright/test';

const waitForAutoReady = async (page) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('istebul_auto_soft_gate_dismissed', '1');
    } catch {
      /* ignore */
    }
  });
  await page.goto('/auto/');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('.wizard-progress')).toBeVisible({ timeout: 20000 });
};

/** Tamamlar 4 adımlı sihirbazı ve analiz gönderimini tetikler. */
const completeAutoWizard = async (page) => {
  await page.locator('[data-wizard-key="budget"].wizard-option', { hasText: '1 – 2 milyon TL' }).click();
  await page.locator('[data-wizard-key="usage"].wizard-option', { hasText: 'Aile' }).click();
  await page.locator('[data-wizard-key="household_size"].wizard-option', { hasText: '3-4 kişi' }).click();
  await page.getByRole('button', { name: /Devam et/i }).click();

  await page.locator('.wizard-option', { hasText: 'SUV' }).first().click();
  await page.locator('.wizard-option', { hasText: 'Hibrit' }).click();
  await page.getByRole('button', { name: /Devam et/i }).click();

  await page.locator('[data-wizard-key="km"].wizard-option', { hasText: '10.000 – 20.000 km' }).click();
  await page.locator('[data-wizard-key="city_ratio"].wizard-option', { hasText: 'Dengeli kullanım' }).click();
  await page.locator('[data-wizard-key="ownership_months"].wizard-option', { hasText: '36 ay' }).click();
  await page.locator('[data-wizard-key="location"].wizard-option', { hasText: 'İzmir' }).click();
  await page.getByRole('button', { name: /Devam et/i }).click();

  await page.locator('[data-wizard-key="loan"].wizard-option', { hasText: 'Evet' }).click();
  await page.getByRole('button', { name: /Analizi başlat/i }).click();
};

const dismissSoftAuthGateIfVisible = async (page) => {
  const gate = page.locator('#auto-soft-auth-gate');
  if (await gate.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /Önizlemeyle devam et/i }).click();
  }
};

test.describe('Auto onboarding', () => {
  test('hero TCO mesajı ve birincil CTA', async ({ page }) => {
    await waitForAutoReady(page);

    await expect(page.getByRole('heading', { name: /Pahalı bir araç hatasından/i })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Analiz başlat|TCO analizini başlat/i }).first()
    ).toBeVisible();
    await expect(page.locator('.auto-social-proof')).toContainText(/~2 dk/i);
  });

  test('wizard shows household_size question on first step', async ({ page }) => {
    await waitForAutoReady(page);

    await page.locator('[data-wizard-key="usage"].wizard-option', { hasText: 'Aile' }).click();
    await expect(page.locator('[data-wizard-part="household_size"]')).toBeVisible();
    await expect(page.locator('[data-wizard-key="household_size"].wizard-option')).toHaveCount(4);
  });

  test('wizard ilerleme ve ETA etiketi', async ({ page }) => {
    await waitForAutoReady(page);

    await expect(page.locator('.wizard-progress')).toBeVisible();
    await expect(page.locator('.wizard-progress-eta')).toContainText(/kaldı|Son adım/i);
    await expect(page.locator('.wizard-progress-milestones .wizard-milestone')).toHaveCount(4);
    await expect(page.locator('.wizard-question h3')).toBeVisible();
  });

  test('sihirbaz tamamlanınca sonuç kartları ve karar asistanı görünür', async ({ page }) => {
    await waitForAutoReady(page);
    await completeAutoWizard(page);

    await expect(page.locator('#auto-results .auto-v2-root')).toBeVisible({
      timeout: 20000
    });
    await dismissSoftAuthGateIfVisible(page);

    await expect(page.locator('[data-ai-explanation]')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Karar asistanı/i })).toBeVisible();
    await expect(page.locator('.ib-ai-reasoning-list li').first()).toBeVisible();
    await expect(page.locator('.ib-ai-finance-row').first()).toBeVisible();
    await expect(page.getByText(/uyum skoru/i).first()).toBeVisible();
  });
});
