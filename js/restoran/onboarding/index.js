/**
 * GarsonAI restaurant onboarding wizard — public exports.
 */

export {
  ONBOARDING_WIZARD_VERSION,
  ONBOARDING_STEP_IDS,
  ONBOARDING_STEPS,
  RESTAURANT_BUSINESS_TYPES,
  MENU_SETUP_MODES,
  WEEKDAY_KEYS,
  getOnboardingStep,
  getOnboardingStepIndex,
  getNextOnboardingStepId,
  getPreviousOnboardingStepId,
  calculateCompletionPercent,
  createDefaultWorkingHoursSchedule,
  createEmptyOnboardingData
} from './steps.js';

export {
  GARSON_ONBOARDING_STORAGE_KEY,
  buildOnboardingStorageKey,
  createOnboardingState,
  normalizeOnboardingState,
  readOnboardingProgress,
  writeOnboardingProgress,
  clearOnboardingProgress,
  resumeOnboardingProgress,
  setOnboardingStorageAdapter
} from './progress.js';

export {
  validateRestaurantInfoStep,
  validateWorkingHoursStep,
  validateMenuSetupStep,
  validateWhatsappStep,
  validateKitchenStep,
  validateAiStep,
  validateOnboardingStep,
  validateOnboardingState,
  getDataKeyForStep
} from './validation.js';

export {
  DEMO_ONBOARDING_RESTAURANT_ID,
  createDemoOnboardingDataset,
  createDemoRestaurantSetup,
  applyDemoMenuToOnboardingData
} from './demo-data.js';

export {
  buildRestaurantSetupSummary,
  buildOnboardingSummaryRows,
  completeOnboarding,
  markOnboardingCompleted,
  getOnboardingCompletionPercent
} from './completion.js';

export {
  GARSON_ONBOARDING_PANEL_PATH,
  createOnboardingWizard,
  getCurrentOnboardingStep,
  submitOnboardingStep,
  goToPreviousOnboardingStep,
  validateCurrentOnboardingStep,
  finalizeOnboardingWizard,
  getOnboardingWizardSummary,
  applyDemoMenuPreset,
  loadOnboardingWizard,
  resetOnboardingWizard,
  isOnboardingWizardComplete,
  listOnboardingSteps
} from './wizard.js';
