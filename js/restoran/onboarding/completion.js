/**
 * GarsonAI onboarding wizard — completion and summary generation.
 */

import { ONBOARDING_STEPS, calculateCompletionPercent } from './steps.js';

/**
 * @typedef {import('./progress.js').OnboardingWizardState} OnboardingWizardState
 */

/**
 * @typedef {Object} OnboardingSetupSummary
 * @property {string} restaurantName
 * @property {string} businessType
 * @property {string} phone
 * @property {string} address
 * @property {string} menuMode
 * @property {boolean} whatsappReady
 * @property {boolean} kitchenEnabled
 * @property {boolean} aiEnabled
 * @property {string[]} enabledFeatures
 * @property {string} welcomePrompt
 */

/**
 * @typedef {Object} OnboardingCompletionResult
 * @property {true} completed
 * @property {string} restaurantId
 * @property {number} completionPercent
 * @property {OnboardingSetupSummary} summary
 * @property {string} completedAt
 */

/**
 * @param {OnboardingWizardState} state
 * @returns {OnboardingSetupSummary}
 */
export function buildRestaurantSetupSummary(state) {
  const { data } = state;
  const enabledFeatures = [];

  if (data.menuSetup.mode === 'demo_menu') {
    enabledFeatures.push('demo_menu');
  } else if (data.menuSetup.mode === 'manual') {
    enabledFeatures.push('manual_menu');
  } else {
    enabledFeatures.push('import_later');
  }

  if (data.whatsapp.webhookStatus === 'verified' || data.whatsapp.webhookStatus === 'active') {
    enabledFeatures.push('whatsapp');
  }

  if (data.kitchen.kdsEnabled) {
    enabledFeatures.push('kitchen_kds');
  }

  if (data.kitchen.notifications) {
    enabledFeatures.push('kitchen_notifications');
  }

  if (data.ai.aiEnabled) {
    enabledFeatures.push('ai_assistant');
  }

  if (data.ai.autoOrderParsing) {
    enabledFeatures.push('ai_order_parsing');
  }

  return {
    restaurantName: data.restaurantInfo.restaurantName,
    businessType: data.restaurantInfo.businessType,
    phone: data.restaurantInfo.phone,
    address: data.restaurantInfo.address,
    menuMode: data.menuSetup.mode,
    whatsappReady:
      data.whatsapp.webhookStatus === 'verified' || data.whatsapp.webhookStatus === 'active',
    kitchenEnabled: data.kitchen.kdsEnabled,
    aiEnabled: data.ai.aiEnabled,
    enabledFeatures,
    welcomePrompt: data.ai.welcomePrompt
  };
}

/**
 * @param {OnboardingWizardState} state
 * @returns {Array<{ stepId: string, title: string, status: 'completed'|'pending' }>}
 */
export function buildOnboardingSummaryRows(state) {
  return Object.values(ONBOARDING_STEPS)
    .filter((step) => step.id !== 'finish')
    .map((step) => ({
      stepId: step.id,
      title: step.title,
      status: state.completedSteps.includes(step.id) ? 'completed' : 'pending'
    }));
}

/**
 * @param {OnboardingWizardState} state
 * @returns {OnboardingCompletionResult}
 */
export function completeOnboarding(state) {
  const completedAt = new Date().toISOString();
  const actionableCompleted = [
    'restaurant-info',
    'working-hours',
    'menu-setup',
    'whatsapp',
    'kitchen',
    'ai'
  ];

  return {
    completed: true,
    restaurantId: state.restaurantId,
    completionPercent: 100,
    summary: buildRestaurantSetupSummary({
      ...state,
      completedSteps: actionableCompleted,
      status: 'completed'
    }),
    completedAt
  };
}

/**
 * @param {OnboardingWizardState} state
 * @returns {OnboardingWizardState}
 */
export function markOnboardingCompleted(state) {
  const actionableCompleted = [
    'restaurant-info',
    'working-hours',
    'menu-setup',
    'whatsapp',
    'kitchen',
    'ai',
    'finish'
  ];

  return {
    ...state,
    currentStep: 'finish',
    completedSteps: actionableCompleted,
    status: 'completed',
    completionPercent: 100,
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * @param {OnboardingWizardState} state
 * @returns {number}
 */
export function getOnboardingCompletionPercent(state) {
  if (state.status === 'completed') return 100;
  return calculateCompletionPercent(state.completedSteps);
}
