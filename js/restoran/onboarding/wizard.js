/**
 * GarsonAI restaurant onboarding wizard — flow controller.
 */

import {
  ONBOARDING_STEP_IDS,
  getNextOnboardingStepId,
  getPreviousOnboardingStepId,
  calculateCompletionPercent
} from './steps.js';
import {
  createOnboardingState,
  readOnboardingProgress,
  resumeOnboardingProgress,
  writeOnboardingProgress,
  clearOnboardingProgress
} from './progress.js';
import {
  getDataKeyForStep,
  validateOnboardingState,
  validateOnboardingStep
} from './validation.js';
import {
  buildOnboardingSummaryRows,
  buildRestaurantSetupSummary,
  completeOnboarding,
  markOnboardingCompleted
} from './completion.js';
import { applyDemoMenuToOnboardingData, createDemoOnboardingDataset } from './demo-data.js';

/**
 * @typedef {import('./progress.js').OnboardingWizardState} OnboardingWizardState
 * @typedef {import('./steps.js').OnboardingStepId} OnboardingStepId
 * @typedef {import('./validation.js').ValidationResult} ValidationResult
 * @typedef {import('./completion.js').OnboardingCompletionResult} OnboardingCompletionResult
 */

export const GARSON_ONBOARDING_PANEL_PATH = '/garson/panel/kurulum/';

/**
 * @param {string} restaurantId
 * @param {{ resume?: boolean, useDemoDefaults?: boolean }} [options]
 * @returns {OnboardingWizardState}
 */
export function createOnboardingWizard(restaurantId, options = {}) {
  const id = String(restaurantId || '').trim();
  if (!id) {
    throw new Error('restaurantId is required');
  }

  if (options.resume !== false) {
    const resumed = resumeOnboardingProgress(id);
    if (resumed.completedSteps.length || resumed.status === 'in_progress') {
      return resumed;
    }
  }

  const data = options.useDemoDefaults ? createDemoOnboardingDataset() : undefined;
  return createOnboardingState(id, { data });
}

/**
 * @param {OnboardingWizardState} state
 * @returns {OnboardingStepId}
 */
export function getCurrentOnboardingStep(state) {
  return state.currentStep;
}

/**
 * @param {OnboardingWizardState} state
 * @param {OnboardingStepId} stepId
 * @param {unknown} payload
 * @returns {{ state: OnboardingWizardState, validation: ValidationResult }}
 */
export function submitOnboardingStep(state, stepId, payload) {
  const validation = validateOnboardingStep(stepId, payload);
  if (!validation.valid) {
    return { state, validation };
  }

  const dataKey = getDataKeyForStep(stepId);
  const completedSteps = state.completedSteps.includes(stepId)
    ? state.completedSteps
    : [...state.completedSteps, stepId];

  const nextStep = getNextOnboardingStepId(stepId) || stepId;

  const nextState = {
    ...state,
    currentStep: nextStep,
    completedSteps,
    data: {
      ...state.data,
      [dataKey]: {
        ...state.data[dataKey],
        ...(payload && typeof payload === 'object' ? payload : {})
      }
    },
    status: 'in_progress',
    completionPercent: calculateCompletionPercent(completedSteps),
    updatedAt: new Date().toISOString()
  };

  writeOnboardingProgress(nextState);
  return { state: nextState, validation };
}

/**
 * @param {OnboardingWizardState} state
 * @returns {OnboardingWizardState}
 */
export function goToPreviousOnboardingStep(state) {
  const previous = getPreviousOnboardingStepId(state.currentStep);
  if (!previous) return state;

  const nextState = {
    ...state,
    currentStep: previous,
    updatedAt: new Date().toISOString()
  };

  writeOnboardingProgress(nextState);
  return nextState;
}

/**
 * @param {OnboardingWizardState} state
 * @returns {{ state: OnboardingWizardState, validation: ValidationResult }}
 */
export function validateCurrentOnboardingStep(state) {
  if (state.currentStep === 'finish') {
    return validateOnboardingState(state);
  }
  const dataKey = getDataKeyForStep(state.currentStep);
  const validation = validateOnboardingStep(state.currentStep, state.data[dataKey]);
  return { state, validation };
}

/**
 * @param {OnboardingWizardState} state
 * @returns {{ state: OnboardingWizardState, result: OnboardingCompletionResult, validation: ValidationResult }}
 */
export function finalizeOnboardingWizard(state) {
  const validation = validateOnboardingState(state);
  if (!validation.valid) {
    return { state, result: null, validation };
  }

  const completedState = markOnboardingCompleted(state);
  writeOnboardingProgress(completedState);
  const result = completeOnboarding(completedState);

  return {
    state: completedState,
    result,
    validation: { valid: true, errors: [] }
  };
}

/**
 * @param {OnboardingWizardState} state
 * @returns {{ summary: ReturnType<typeof buildRestaurantSetupSummary>, rows: ReturnType<typeof buildOnboardingSummaryRows>, completionPercent: number }}
 */
export function getOnboardingWizardSummary(state) {
  return {
    summary: buildRestaurantSetupSummary(state),
    rows: buildOnboardingSummaryRows(state),
    completionPercent: state.status === 'completed' ? 100 : calculateCompletionPercent(state.completedSteps)
  };
}

/**
 * @param {OnboardingWizardState} state
 * @returns {OnboardingWizardState}
 */
export function applyDemoMenuPreset(state) {
  const nextState = {
    ...state,
    data: applyDemoMenuToOnboardingData(state.data),
    updatedAt: new Date().toISOString()
  };
  writeOnboardingProgress(nextState);
  return nextState;
}

/**
 * @param {string} restaurantId
 * @returns {OnboardingWizardState|null}
 */
export function loadOnboardingWizard(restaurantId) {
  return readOnboardingProgress(restaurantId);
}

/**
 * @param {string} restaurantId
 */
export function resetOnboardingWizard(restaurantId) {
  clearOnboardingProgress(restaurantId);
}

/**
 * @param {OnboardingWizardState} state
 * @returns {boolean}
 */
export function isOnboardingWizardComplete(state) {
  return state.status === 'completed' && state.completionPercent === 100;
}

/**
 * @returns {readonly OnboardingStepId[]}
 */
export function listOnboardingSteps() {
  return ONBOARDING_STEP_IDS;
}
