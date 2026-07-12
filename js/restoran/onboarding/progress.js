/**
 * GarsonAI onboarding wizard — client-side progress persistence.
 */

import {
  ONBOARDING_WIZARD_VERSION,
  ONBOARDING_STEP_IDS,
  calculateCompletionPercent,
  createEmptyOnboardingData
} from './steps.js';

export const GARSON_ONBOARDING_STORAGE_KEY = 'garsonai_onboarding_v1';

/**
 * @typedef {import('./steps.js').OnboardingStepId} OnboardingStepId
 */

/**
 * @typedef {Object} OnboardingRestaurantInfo
 * @property {string} restaurantName
 * @property {string} businessType
 * @property {string} phone
 * @property {string} address
 */

/**
 * @typedef {Object} OnboardingWorkingHours
 * @property {Record<string, { open: string, close: string, closed: boolean }>} schedule
 */

/**
 * @typedef {Object} OnboardingMenuSetup
 * @property {'manual'|'import_later'|'demo_menu'} mode
 */

/**
 * @typedef {Object} OnboardingWhatsappConfig
 * @property {string} phoneNumberId
 * @property {string} verifyToken
 * @property {string} webhookStatus
 */

/**
 * @typedef {Object} OnboardingKitchenConfig
 * @property {boolean} kdsEnabled
 * @property {string} printerOption
 * @property {boolean} notifications
 */

/**
 * @typedef {Object} OnboardingAiConfig
 * @property {string} welcomePrompt
 * @property {boolean} autoOrderParsing
 * @property {boolean} aiEnabled
 */

/**
 * @typedef {Object} OnboardingWizardData
 * @property {OnboardingRestaurantInfo} restaurantInfo
 * @property {OnboardingWorkingHours} workingHours
 * @property {OnboardingMenuSetup} menuSetup
 * @property {OnboardingWhatsappConfig} whatsapp
 * @property {OnboardingKitchenConfig} kitchen
 * @property {OnboardingAiConfig} ai
 */

/**
 * @typedef {Object} OnboardingWizardState
 * @property {number} version
 * @property {string} restaurantId
 * @property {OnboardingStepId} currentStep
 * @property {OnboardingStepId[]} completedSteps
 * @property {OnboardingWizardData} data
 * @property {'not_started'|'in_progress'|'completed'} status
 * @property {number} completionPercent
 * @property {string} updatedAt
 * @property {string} [completedAt]
 */

/**
 * @param {string} restaurantId
 * @returns {string}
 */
export function buildOnboardingStorageKey(restaurantId) {
  const id = String(restaurantId || '').trim() || 'draft';
  return `${GARSON_ONBOARDING_STORAGE_KEY}:${id}`;
}

/**
 * @param {unknown} value
 * @returns {OnboardingWizardData}
 */
function normalizeWizardData(value) {
  const empty = createEmptyOnboardingData();
  if (!value || typeof value !== 'object') return empty;

  const source = /** @type {Record<string, unknown>} */ (value);
  const restaurantInfo = /** @type {Record<string, unknown>} */ (
    source.restaurantInfo && typeof source.restaurantInfo === 'object' ? source.restaurantInfo : {}
  );
  const workingHours = /** @type {Record<string, unknown>} */ (
    source.workingHours && typeof source.workingHours === 'object' ? source.workingHours : {}
  );
  const menuSetup = /** @type {Record<string, unknown>} */ (
    source.menuSetup && typeof source.menuSetup === 'object' ? source.menuSetup : {}
  );
  const whatsapp = /** @type {Record<string, unknown>} */ (
    source.whatsapp && typeof source.whatsapp === 'object' ? source.whatsapp : {}
  );
  const kitchen = /** @type {Record<string, unknown>} */ (
    source.kitchen && typeof source.kitchen === 'object' ? source.kitchen : {}
  );
  const ai = /** @type {Record<string, unknown>} */ (
    source.ai && typeof source.ai === 'object' ? source.ai : {}
  );

  return {
    restaurantInfo: {
      restaurantName: String(restaurantInfo.restaurantName ?? empty.restaurantInfo.restaurantName),
      businessType: String(restaurantInfo.businessType ?? empty.restaurantInfo.businessType),
      phone: String(restaurantInfo.phone ?? empty.restaurantInfo.phone),
      address: String(restaurantInfo.address ?? empty.restaurantInfo.address)
    },
    workingHours: {
      schedule:
        workingHours.schedule && typeof workingHours.schedule === 'object'
          ? /** @type {OnboardingWorkingHours['schedule']} */ (workingHours.schedule)
          : empty.workingHours.schedule
    },
    menuSetup: {
      mode: /** @type {OnboardingMenuSetup['mode']} */ (
        String(menuSetup.mode || empty.menuSetup.mode)
      )
    },
    whatsapp: {
      phoneNumberId: String(whatsapp.phoneNumberId ?? empty.whatsapp.phoneNumberId),
      verifyToken: String(whatsapp.verifyToken ?? empty.whatsapp.verifyToken),
      webhookStatus: String(whatsapp.webhookStatus ?? empty.whatsapp.webhookStatus)
    },
    kitchen: {
      kdsEnabled:
        typeof kitchen.kdsEnabled === 'boolean' ? kitchen.kdsEnabled : empty.kitchen.kdsEnabled,
      printerOption: String(kitchen.printerOption ?? empty.kitchen.printerOption),
      notifications:
        typeof kitchen.notifications === 'boolean'
          ? kitchen.notifications
          : empty.kitchen.notifications
    },
    ai: {
      welcomePrompt: String(ai.welcomePrompt ?? empty.ai.welcomePrompt),
      autoOrderParsing:
        typeof ai.autoOrderParsing === 'boolean'
          ? ai.autoOrderParsing
          : empty.ai.autoOrderParsing,
      aiEnabled: typeof ai.aiEnabled === 'boolean' ? ai.aiEnabled : empty.ai.aiEnabled
    }
  };
}

/**
 * @param {unknown} payload
 * @returns {OnboardingWizardState|null}
 */
export function normalizeOnboardingState(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const record = /** @type {Record<string, unknown>} */ (payload);
  const restaurantId = String(record.restaurantId ?? '').trim();
  if (!restaurantId) return null;

  const currentStepRaw = String(record.currentStep ?? ONBOARDING_STEP_IDS[0]);
  const currentStep = ONBOARDING_STEP_IDS.includes(/** @type {OnboardingStepId} */ (currentStepRaw))
    ? /** @type {OnboardingStepId} */ (currentStepRaw)
    : ONBOARDING_STEP_IDS[0];

  const completedSteps = Array.isArray(record.completedSteps)
    ? record.completedSteps
        .map((step) => String(step))
        .filter((step) => ONBOARDING_STEP_IDS.includes(/** @type {OnboardingStepId} */ (step)))
    : [];

  const statusRaw = String(record.status ?? 'in_progress');
  const status =
    statusRaw === 'completed' || statusRaw === 'not_started' ? statusRaw : 'in_progress';

  return {
    version: Number(record.version) || ONBOARDING_WIZARD_VERSION,
    restaurantId,
    currentStep,
    completedSteps: /** @type {OnboardingStepId[]} */ (completedSteps),
    data: normalizeWizardData(record.data),
    status,
    completionPercent: calculateCompletionPercent(completedSteps),
    updatedAt: String(record.updatedAt ?? new Date().toISOString()),
    completedAt: record.completedAt ? String(record.completedAt) : undefined
  };
}

/**
 * @param {string} restaurantId
 * @param {{ currentStep?: OnboardingStepId, data?: Partial<OnboardingWizardData> }} [options]
 * @returns {OnboardingWizardState}
 */
export function createOnboardingState(restaurantId, options = {}) {
  const id = String(restaurantId || '').trim();
  if (!id) {
    throw new Error('restaurantId is required for onboarding state');
  }

  const baseData = createEmptyOnboardingData();
  const data = options.data
    ? normalizeWizardData({ ...baseData, ...options.data })
    : baseData;

  const currentStep = options.currentStep || ONBOARDING_STEP_IDS[0];

  return {
    version: ONBOARDING_WIZARD_VERSION,
    restaurantId: id,
    currentStep,
    completedSteps: [],
    data,
    status: 'in_progress',
    completionPercent: 0,
    updatedAt: new Date().toISOString()
  };
}

/**
 * @typedef {Object} OnboardingStorageAdapter
 * @property {(key: string) => string|null} getItem
 * @property {(key: string, value: string) => void} setItem
 * @property {(key: string) => void} removeItem
 */

/** @type {OnboardingStorageAdapter|null} */
let storageAdapter = null;

/**
 * @param {OnboardingStorageAdapter} adapter
 */
export function setOnboardingStorageAdapter(adapter) {
  storageAdapter = adapter;
}

/**
 * @returns {OnboardingStorageAdapter}
 */
function resolveStorage() {
  if (storageAdapter) return storageAdapter;

  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return {
      getItem: (key) => globalThis.localStorage.getItem(key),
      setItem: (key, value) => globalThis.localStorage.setItem(key, value),
      removeItem: (key) => globalThis.localStorage.removeItem(key)
    };
  }

  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  };
}

/**
 * @param {string} restaurantId
 * @returns {OnboardingWizardState|null}
 */
export function readOnboardingProgress(restaurantId) {
  const storage = resolveStorage();
  const raw = storage.getItem(buildOnboardingStorageKey(restaurantId));
  if (!raw) return null;

  try {
    return normalizeOnboardingState(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * @param {OnboardingWizardState} state
 * @returns {OnboardingWizardState}
 */
export function writeOnboardingProgress(state) {
  const normalized = normalizeOnboardingState(state);
  if (!normalized) {
    throw new Error('Invalid onboarding state');
  }

  const storage = resolveStorage();
  storage.setItem(
    buildOnboardingStorageKey(normalized.restaurantId),
    JSON.stringify({
      ...normalized,
      completionPercent: calculateCompletionPercent(normalized.completedSteps),
      updatedAt: new Date().toISOString()
    })
  );

  return normalized;
}

/**
 * @param {string} restaurantId
 */
export function clearOnboardingProgress(restaurantId) {
  const storage = resolveStorage();
  storage.removeItem(buildOnboardingStorageKey(restaurantId));
}

/**
 * @param {string} restaurantId
 * @returns {OnboardingWizardState}
 */
export function resumeOnboardingProgress(restaurantId) {
  const existing = readOnboardingProgress(restaurantId);
  if (existing && existing.status !== 'completed') {
    return existing;
  }
  return createOnboardingState(restaurantId);
}
