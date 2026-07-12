/**
 * GarsonAI restaurant onboarding wizard — step definitions.
 */

/** @typedef {'restaurant-info'|'working-hours'|'menu-setup'|'whatsapp'|'kitchen'|'ai'|'finish'} OnboardingStepId */

export const ONBOARDING_WIZARD_VERSION = 1;

/** @type {readonly OnboardingStepId[]} */
export const ONBOARDING_STEP_IDS = Object.freeze([
  'restaurant-info',
  'working-hours',
  'menu-setup',
  'whatsapp',
  'kitchen',
  'ai',
  'finish'
]);

/** @type {readonly string[]} */
export const RESTAURANT_BUSINESS_TYPES = Object.freeze([
  'cafe',
  'restaurant',
  'fast_food',
  'fine_dining',
  'bar',
  'other'
]);

/** @type {readonly string[]} */
export const MENU_SETUP_MODES = Object.freeze(['manual', 'import_later', 'demo_menu']);

/** @type {readonly string[]} */
export const WEEKDAY_KEYS = Object.freeze([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
]);

/** @type {Record<OnboardingStepId, { id: OnboardingStepId, title: string, description: string, fields: string[] }>} */
export const ONBOARDING_STEPS = Object.freeze({
  'restaurant-info': {
    id: 'restaurant-info',
    title: 'Restoran bilgileri',
    description: 'Temel işletme bilgilerinizi girin.',
    fields: ['restaurantName', 'businessType', 'phone', 'address']
  },
  'working-hours': {
    id: 'working-hours',
    title: 'Çalışma saatleri',
    description: 'Haftalık açılış ve kapanış saatlerini belirleyin.',
    fields: ['schedule']
  },
  'menu-setup': {
    id: 'menu-setup',
    title: 'Menü kurulumu',
    description: 'Menünüzü şimdi ekleyin veya daha sonra içe aktarın.',
    fields: ['mode']
  },
  whatsapp: {
    id: 'whatsapp',
    title: 'WhatsApp',
    description: 'WhatsApp Business API bağlantı bilgileri.',
    fields: ['phoneNumberId', 'verifyToken', 'webhookStatus']
  },
  kitchen: {
    id: 'kitchen',
    title: 'Mutfak',
    description: 'Mutfak ekranı ve bildirim tercihleri.',
    fields: ['kdsEnabled', 'printerOption', 'notifications']
  },
  ai: {
    id: 'ai',
    title: 'Yapay zeka',
    description: 'GarsonAI asistan ayarları.',
    fields: ['welcomePrompt', 'autoOrderParsing', 'aiEnabled']
  },
  finish: {
    id: 'finish',
    title: 'Kurulum özeti',
    description: 'Restoran kurulumunuzu tamamlayın.',
    fields: ['summary']
  }
});

/**
 * @param {OnboardingStepId} stepId
 * @returns {typeof ONBOARDING_STEPS[OnboardingStepId]|null}
 */
export function getOnboardingStep(stepId) {
  return ONBOARDING_STEPS[stepId] || null;
}

/**
 * @param {OnboardingStepId} stepId
 * @returns {number}
 */
export function getOnboardingStepIndex(stepId) {
  return ONBOARDING_STEP_IDS.indexOf(stepId);
}

/**
 * @param {OnboardingStepId} stepId
 * @returns {OnboardingStepId|null}
 */
export function getNextOnboardingStepId(stepId) {
  const index = getOnboardingStepIndex(stepId);
  if (index < 0 || index >= ONBOARDING_STEP_IDS.length - 1) return null;
  return ONBOARDING_STEP_IDS[index + 1];
}

/**
 * @param {OnboardingStepId} stepId
 * @returns {OnboardingStepId|null}
 */
export function getPreviousOnboardingStepId(stepId) {
  const index = getOnboardingStepIndex(stepId);
  if (index <= 0) return null;
  return ONBOARDING_STEP_IDS[index - 1];
}

/**
 * @param {string[]} completedSteps
 * @returns {number}
 */
export function calculateCompletionPercent(completedSteps = []) {
  const actionableSteps = ONBOARDING_STEP_IDS.filter((id) => id !== 'finish');
  if (!actionableSteps.length) return 0;
  const completed = actionableSteps.filter((id) => completedSteps.includes(id)).length;
  return Math.round((completed / actionableSteps.length) * 100);
}

/**
 * @returns {Record<string, { open: string, close: string, closed: boolean }>}
 */
export function createDefaultWorkingHoursSchedule() {
  return WEEKDAY_KEYS.reduce((schedule, day) => {
    schedule[day] = {
      open: '09:00',
      close: '22:00',
      closed: day === 'sunday'
    };
    return schedule;
  }, /** @type {Record<string, { open: string, close: string, closed: boolean }>} */ ({}));
}

/**
 * @returns {import('./progress.js').OnboardingWizardData}
 */
export function createEmptyOnboardingData() {
  return {
    restaurantInfo: {
      restaurantName: '',
      businessType: 'restaurant',
      phone: '',
      address: ''
    },
    workingHours: {
      schedule: createDefaultWorkingHoursSchedule()
    },
    menuSetup: {
      mode: 'manual'
    },
    whatsapp: {
      phoneNumberId: '',
      verifyToken: '',
      webhookStatus: 'pending'
    },
    kitchen: {
      kdsEnabled: true,
      printerOption: 'none',
      notifications: true
    },
    ai: {
      welcomePrompt: '',
      autoOrderParsing: true,
      aiEnabled: true
    }
  };
}
