/**
 * GarsonAI onboarding wizard — demo restaurant dataset.
 */

import { DEMO_RESTAURANT_SLUG } from '../tenant.js';
import { createDefaultWorkingHoursSchedule } from './steps.js';

export const DEMO_ONBOARDING_RESTAURANT_ID = 'a0000000-0000-4000-8000-00000000cafe';

/**
 * @returns {import('./progress.js').OnboardingWizardData}
 */
export function createDemoOnboardingDataset() {
  return {
    restaurantInfo: {
      restaurantName: 'Demo Cafe',
      businessType: 'cafe',
      phone: '+90 232 555 0101',
      address: 'Kordon, Alsancak, İzmir'
    },
    workingHours: {
      schedule: {
        ...createDefaultWorkingHoursSchedule(),
        sunday: { open: '10:00', close: '20:00', closed: false }
      }
    },
    menuSetup: {
      mode: 'demo_menu'
    },
    whatsapp: {
      phoneNumberId: 'demo-phone-number-id',
      verifyToken: 'demo-verify-token-12345',
      webhookStatus: 'verified'
    },
    kitchen: {
      kdsEnabled: true,
      printerOption: 'thermal',
      notifications: true
    },
    ai: {
      welcomePrompt: 'Merhaba! Demo Cafe rezervasyon ve ön sipariş asistanınıza hoş geldiniz.',
      autoOrderParsing: true,
      aiEnabled: true
    }
  };
}

/**
 * @returns {{ restaurantId: string, slug: string, data: import('./progress.js').OnboardingWizardData, menu: Array<Record<string, unknown>> }}
 */
export function createDemoRestaurantSetup() {
  const data = createDemoOnboardingDataset();

  return {
    restaurantId: DEMO_ONBOARDING_RESTAURANT_ID,
    slug: DEMO_RESTAURANT_SLUG,
    data,
    menu: [
      {
        id: 'cat-main',
        restaurant_id: DEMO_ONBOARDING_RESTAURANT_ID,
        name: 'Ana yemekler',
        items: [
          {
            id: 'item-levrek',
            restaurant_id: DEMO_ONBOARDING_RESTAURANT_ID,
            name: 'Izgara levrek',
            price: 420,
            active: true,
            stock_status: 'in_stock'
          },
          {
            id: 'item-kebap',
            restaurant_id: DEMO_ONBOARDING_RESTAURANT_ID,
            name: 'Adana kebap',
            price: 360,
            active: true,
            stock_status: 'low_stock'
          }
        ]
      },
      {
        id: 'cat-dessert',
        restaurant_id: DEMO_ONBOARDING_RESTAURANT_ID,
        name: 'Tatlılar',
        items: [
          {
            id: 'item-sutlac',
            restaurant_id: DEMO_ONBOARDING_RESTAURANT_ID,
            name: 'Sütlaç',
            price: 120,
            active: true,
            stock_status: 'in_stock'
          }
        ]
      }
    ]
  };
}

/**
 * @param {import('./progress.js').OnboardingWizardData} [base]
 * @returns {import('./progress.js').OnboardingWizardData}
 */
export function applyDemoMenuToOnboardingData(base) {
  const dataset = base || createDemoOnboardingDataset();
  return {
    ...dataset,
    menuSetup: {
      mode: 'demo_menu'
    }
  };
}
