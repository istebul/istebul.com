/**
 * GarsonAI onboarding wizard — per-step validation helpers.
 */

import {
  MENU_SETUP_MODES,
  RESTAURANT_BUSINESS_TYPES,
  WEEKDAY_KEYS
} from './steps.js';

const PHONE_PATTERN = /^\+?[0-9\s()-]{10,18}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string[]} errors
 */

/**
 * @param {string[]} errors
 * @returns {ValidationResult}
 */
function buildResult(errors) {
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function asString(value) {
  return String(value ?? '').trim();
}

/**
 * @param {unknown} payload
 * @returns {ValidationResult}
 */
export function validateRestaurantInfoStep(payload) {
  const errors = [];
  const data = payload && typeof payload === 'object' ? payload : {};
  const record = /** @type {Record<string, unknown>} */ (data);

  const restaurantName = asString(record.restaurantName);
  const businessType = asString(record.businessType).toLowerCase();
  const phone = asString(record.phone);
  const address = asString(record.address);

  if (!restaurantName || restaurantName.length < 2) {
    errors.push('Restoran adı en az 2 karakter olmalıdır.');
  }

  if (!RESTAURANT_BUSINESS_TYPES.includes(businessType)) {
    errors.push('Geçerli bir işletme türü seçin.');
  }

  if (!phone || !PHONE_PATTERN.test(phone)) {
    errors.push('Geçerli bir telefon numarası girin.');
  }

  if (!address || address.length < 5) {
    errors.push('Adres en az 5 karakter olmalıdır.');
  }

  return buildResult(errors);
}

/**
 * @param {unknown} payload
 * @returns {ValidationResult}
 */
export function validateWorkingHoursStep(payload) {
  const errors = [];
  const data = payload && typeof payload === 'object' ? payload : {};
  const record = /** @type {Record<string, unknown>} */ (data);
  const schedule =
    record.schedule && typeof record.schedule === 'object'
      ? /** @type {Record<string, { open?: string, close?: string, closed?: boolean }>} */ (
          record.schedule
        )
      : null;

  if (!schedule) {
    errors.push('Çalışma saatleri planı gerekli.');
    return buildResult(errors);
  }

  let hasOpenDay = false;

  for (const day of WEEKDAY_KEYS) {
    const entry = schedule[day];
    if (!entry || typeof entry !== 'object') {
      errors.push(`${day} için çalışma saati tanımlayın.`);
      continue;
    }

    if (entry.closed) continue;
    hasOpenDay = true;

    const open = asString(entry.open);
    const close = asString(entry.close);

    if (!TIME_PATTERN.test(open) || !TIME_PATTERN.test(close)) {
      errors.push(`${day} için geçerli saat formatı kullanın (HH:MM).`);
      continue;
    }

    if (open >= close) {
      errors.push(`${day} için kapanış saati açılıştan sonra olmalıdır.`);
    }
  }

  if (!hasOpenDay) {
    errors.push('En az bir gün açık olmalıdır.');
  }

  return buildResult(errors);
}

/**
 * @param {unknown} payload
 * @returns {ValidationResult}
 */
export function validateMenuSetupStep(payload) {
  const data = payload && typeof payload === 'object' ? payload : {};
  const record = /** @type {Record<string, unknown>} */ (data);
  const mode = asString(record.mode).toLowerCase();

  if (!MENU_SETUP_MODES.includes(mode)) {
    return buildResult(['Menü kurulum modu seçin: manual, import_later veya demo_menu.']);
  }

  return buildResult([]);
}

/**
 * @param {unknown} payload
 * @returns {ValidationResult}
 */
export function validateWhatsappStep(payload) {
  const errors = [];
  const data = payload && typeof payload === 'object' ? payload : {};
  const record = /** @type {Record<string, unknown>} */ (data);

  const phoneNumberId = asString(record.phoneNumberId);
  const verifyToken = asString(record.verifyToken);
  const webhookStatus = asString(record.webhookStatus).toLowerCase();

  if (!phoneNumberId) {
    errors.push('phone_number_id gerekli.');
  }

  if (!verifyToken || verifyToken.length < 8) {
    errors.push('Verify token en az 8 karakter olmalıdır.');
  }

  if (!['pending', 'verified', 'active'].includes(webhookStatus)) {
    errors.push('Webhook durumu pending, verified veya active olmalıdır.');
  }

  return buildResult(errors);
}

/**
 * @param {unknown} payload
 * @returns {ValidationResult}
 */
export function validateKitchenStep(payload) {
  const errors = [];
  const data = payload && typeof payload === 'object' ? payload : {};
  const record = /** @type {Record<string, unknown>} */ (data);

  if (typeof record.kdsEnabled !== 'boolean') {
    errors.push('KDS etkinlik durumu seçilmelidir.');
  }

  const printerOption = asString(record.printerOption).toLowerCase();
  if (!['none', 'thermal', 'network'].includes(printerOption)) {
    errors.push('Yazıcı seçeneği none, thermal veya network olmalıdır.');
  }

  if (typeof record.notifications !== 'boolean') {
    errors.push('Bildirim tercihi seçilmelidir.');
  }

  return buildResult(errors);
}

/**
 * @param {unknown} payload
 * @returns {ValidationResult}
 */
export function validateAiStep(payload) {
  const errors = [];
  const data = payload && typeof payload === 'object' ? payload : {};
  const record = /** @type {Record<string, unknown>} */ (data);

  const welcomePrompt = asString(record.welcomePrompt);

  if (!welcomePrompt || welcomePrompt.length < 10) {
    errors.push('Karşılama mesajı en az 10 karakter olmalıdır.');
  }

  if (typeof record.autoOrderParsing !== 'boolean') {
    errors.push('Otomatik sipariş ayrıştırma tercihi seçilmelidir.');
  }

  if (typeof record.aiEnabled !== 'boolean') {
    errors.push('AI etkinlik durumu seçilmelidir.');
  }

  return buildResult(errors);
}

/**
 * @param {import('./steps.js').OnboardingStepId} stepId
 * @param {unknown} payload
 * @returns {ValidationResult}
 */
export function validateOnboardingStep(stepId, payload) {
  switch (stepId) {
    case 'restaurant-info':
      return validateRestaurantInfoStep(payload);
    case 'working-hours':
      return validateWorkingHoursStep(payload);
    case 'menu-setup':
      return validateMenuSetupStep(payload);
    case 'whatsapp':
      return validateWhatsappStep(payload);
    case 'kitchen':
      return validateKitchenStep(payload);
    case 'ai':
      return validateAiStep(payload);
    case 'finish':
      return buildResult([]);
    default:
      return buildResult(['Bilinmeyen adım.']);
  }
}

/**
 * @param {import('./progress.js').OnboardingWizardState} state
 * @returns {ValidationResult}
 */
export function validateOnboardingState(state) {
  const errors = [];

  for (const stepId of [
    'restaurant-info',
    'working-hours',
    'menu-setup',
    'whatsapp',
    'kitchen',
    'ai'
  ]) {
    const result = validateOnboardingStep(stepId, state.data[getDataKeyForStep(stepId)]);
    if (!result.valid) {
      errors.push(...result.errors.map((message) => `${stepId}: ${message}`));
    }
  }

  return buildResult(errors);
}

/**
 * @param {import('./steps.js').OnboardingStepId} stepId
 * @returns {keyof import('./progress.js').OnboardingWizardData}
 */
export function getDataKeyForStep(stepId) {
  switch (stepId) {
    case 'restaurant-info':
      return 'restaurantInfo';
    case 'working-hours':
      return 'workingHours';
    case 'menu-setup':
      return 'menuSetup';
    case 'whatsapp':
      return 'whatsapp';
    case 'kitchen':
      return 'kitchen';
    case 'ai':
      return 'ai';
    default:
      return 'restaurantInfo';
  }
}
