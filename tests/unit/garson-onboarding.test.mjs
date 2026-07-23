import test from 'node:test';
import assert from 'node:assert/strict';

const {
  ONBOARDING_STEP_IDS,
  ONBOARDING_STEPS,
  calculateCompletionPercent,
  createDefaultWorkingHoursSchedule,
  createEmptyOnboardingData,
  buildOnboardingStorageKey,
  createOnboardingState,
  readOnboardingProgress,
  writeOnboardingProgress,
  clearOnboardingProgress,
  resumeOnboardingProgress,
  setOnboardingStorageAdapter,
  validateOnboardingStep,
  validateOnboardingState,
  createDemoOnboardingDataset,
  createDemoRestaurantSetup,
  completeOnboarding,
  buildRestaurantSetupSummary,
  createOnboardingWizard,
  submitOnboardingStep,
  goToPreviousOnboardingStep,
  finalizeOnboardingWizard,
  getOnboardingWizardSummary,
  applyDemoMenuPreset,
  resetOnboardingWizard,
  isOnboardingWizardComplete,
  listOnboardingSteps,
  GARSON_ONBOARDING_STORAGE_KEY,
  GARSON_ONBOARDING_PANEL_PATH,
  DEMO_ONBOARDING_RESTAURANT_ID
} = await import('../../js/restoran/onboarding/index.js');

const RESTAURANT_ID = 'b1111111-1111-4111-8111-111111111111';

function installMemoryStorage() {
  const store = new Map();
  setOnboardingStorageAdapter({
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    }
  });
  return store;
}

function validRestaurantInfo() {
  return {
    restaurantName: 'Kıyı Balık',
    businessType: 'restaurant',
    phone: '+90 232 444 5566',
    address: 'Alsancak Mah. Kordon No:12 İzmir'
  };
}

function validWorkingHours() {
  return {
    schedule: createDefaultWorkingHoursSchedule()
  };
}

function validMenuSetup() {
  return { mode: 'manual' };
}

function validWhatsapp() {
  return {
    phoneNumberId: '123456789012345',
    verifyToken: 'verify-token-12345',
    webhookStatus: 'verified'
  };
}

function validKitchen() {
  return {
    kdsEnabled: true,
    printerOption: 'thermal',
    notifications: true
  };
}

function validAi() {
  return {
    welcomePrompt: 'Merhaba! Rezervasyon ve ön sipariş için size yardımcı olabilirim.',
    autoOrderParsing: true,
    aiEnabled: true
  };
}

function runFullWizard(restaurantId = RESTAURANT_ID) {
  installMemoryStorage();
  let state = createOnboardingWizard(restaurantId, { resume: false });

  const steps = [
    ['restaurant-info', validRestaurantInfo()],
    ['working-hours', validWorkingHours()],
    ['menu-setup', validMenuSetup()],
    ['whatsapp', validWhatsapp()],
    ['kitchen', validKitchen()],
    ['ai', validAi()]
  ];

  for (const [stepId, payload] of steps) {
    const result = submitOnboardingStep(state, stepId, payload);
    assert.equal(result.validation.valid, true, `${stepId} should validate`);
    state = result.state;
  }

  return state;
}

test('onboarding module exposes seven wizard steps', () => {
  assert.equal(ONBOARDING_STEP_IDS.length, 7);
  assert.deepEqual(listOnboardingSteps(), ONBOARDING_STEP_IDS);
  assert.equal(ONBOARDING_STEPS['restaurant-info'].fields.includes('restaurantName'), true);
  assert.equal(ONBOARDING_STEPS.whatsapp.fields.includes('phone_number_id'), false);
  assert.equal(ONBOARDING_STEPS.whatsapp.fields.includes('phoneNumberId'), true);
  assert.equal(ONBOARDING_STEPS.finish.title, 'Kurulum özeti');
  assert.equal(GARSON_ONBOARDING_PANEL_PATH, '/garson/panel/kurulum/');
});

test('validateOnboardingStep rejects incomplete restaurant info', () => {
  const result = validateOnboardingStep('restaurant-info', {
    restaurantName: 'A',
    businessType: 'invalid',
    phone: '123',
    address: 'abc'
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 3);
});

test('validateOnboardingStep accepts valid step payloads', () => {
  assert.equal(validateOnboardingStep('restaurant-info', validRestaurantInfo()).valid, true);
  assert.equal(validateOnboardingStep('working-hours', validWorkingHours()).valid, true);
  assert.equal(validateOnboardingStep('menu-setup', validMenuSetup()).valid, true);
  assert.equal(validateOnboardingStep('whatsapp', validWhatsapp()).valid, true);
  assert.equal(validateOnboardingStep('kitchen', validKitchen()).valid, true);
  assert.equal(validateOnboardingStep('ai', validAi()).valid, true);
});

test('progress persistence can be resumed', () => {
  installMemoryStorage();

  const initial = createOnboardingState(RESTAURANT_ID);
  const submitted = submitOnboardingStep(initial, 'restaurant-info', validRestaurantInfo()).state;
  writeOnboardingProgress(submitted);

  const resumed = resumeOnboardingProgress(RESTAURANT_ID);
  assert.equal(resumed.restaurantId, RESTAURANT_ID);
  assert.equal(resumed.currentStep, 'working-hours');
  assert.deepEqual(resumed.completedSteps, ['restaurant-info']);
  assert.equal(resumed.data.restaurantInfo.restaurantName, 'Kıyı Balık');
  assert.equal(
    buildOnboardingStorageKey(RESTAURANT_ID),
    `${GARSON_ONBOARDING_STORAGE_KEY}:${RESTAURANT_ID}`
  );

  const loaded = readOnboardingProgress(RESTAURANT_ID);
  assert.equal(loaded?.currentStep, 'working-hours');

  clearOnboardingProgress(RESTAURANT_ID);
  assert.equal(readOnboardingProgress(RESTAURANT_ID), null);
});

test('createOnboardingWizard resumes in-progress state', () => {
  installMemoryStorage();
  const state = createOnboardingState(RESTAURANT_ID, {
    currentStep: 'menu-setup',
    data: { restaurantInfo: validRestaurantInfo() }
  });
  state.completedSteps = ['restaurant-info', 'working-hours'];
  writeOnboardingProgress(state);

  const resumed = createOnboardingWizard(RESTAURANT_ID);
  assert.equal(resumed.currentStep, 'menu-setup');
  assert.equal(resumed.completedSteps.includes('working-hours'), true);
});

test('wizard supports backward navigation without losing data', () => {
  installMemoryStorage();
  let state = createOnboardingWizard(RESTAURANT_ID, { resume: false });
  state = submitOnboardingStep(state, 'restaurant-info', validRestaurantInfo()).state;
  state = submitOnboardingStep(state, 'working-hours', validWorkingHours()).state;

  state = goToPreviousOnboardingStep(state);
  assert.equal(state.currentStep, 'working-hours');
  assert.equal(state.data.restaurantInfo.restaurantName, 'Kıyı Balık');
});

test('demo dataset aligns with demo-cafe tenant', () => {
  const demo = createDemoRestaurantSetup();
  assert.equal(demo.restaurantId, DEMO_ONBOARDING_RESTAURANT_ID);
  assert.equal(demo.slug, 'demo-cafe');
  assert.equal(demo.data.menuSetup.mode, 'demo_menu');
  assert.equal(demo.menu.length, 2);
  assert.equal(createDemoOnboardingDataset().restaurantInfo.restaurantName, 'Demo Cafe');
});

test('applyDemoMenuPreset switches menu mode to demo_menu', () => {
  installMemoryStorage();
  const state = createOnboardingState(RESTAURANT_ID);
  const updated = applyDemoMenuPreset(state);
  assert.equal(updated.data.menuSetup.mode, 'demo_menu');
});

test('finalizeOnboardingWizard returns completion payload', () => {
  const state = runFullWizard();
  const { result, validation, state: completedState } = finalizeOnboardingWizard(state);

  assert.equal(validation.valid, true);
  assert.equal(result.completed, true);
  assert.equal(result.restaurantId, RESTAURANT_ID);
  assert.equal(result.completionPercent, 100);
  assert.equal(result.summary.restaurantName, 'Kıyı Balık');
  assert.equal(result.summary.kitchenEnabled, true);
  assert.equal(result.summary.aiEnabled, true);
  assert.equal(isOnboardingWizardComplete(completedState), true);
});

test('getOnboardingWizardSummary exposes setup summary before completion', () => {
  installMemoryStorage();
  let state = createOnboardingWizard(RESTAURANT_ID, { resume: false });
  state = submitOnboardingStep(state, 'restaurant-info', validRestaurantInfo()).state;

  const summary = getOnboardingWizardSummary(state);
  assert.equal(summary.summary.restaurantName, 'Kıyı Balık');
  assert.equal(summary.rows.length, 6);
  assert.equal(summary.completionPercent, calculateCompletionPercent(['restaurant-info']));
});

test('validateOnboardingState fails when required steps are incomplete', () => {
  const state = createOnboardingState(RESTAURANT_ID, {
    data: createEmptyOnboardingData()
  });
  const validation = validateOnboardingState(state);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.length > 0);
});

test('completeOnboarding builds summary for finished wizard', () => {
  const state = runFullWizard();
  const completed = completeOnboarding({
    ...state,
    status: 'completed',
    completedSteps: [
      'restaurant-info',
      'working-hours',
      'menu-setup',
      'whatsapp',
      'kitchen',
      'ai',
      'finish'
    ],
    completionPercent: 100
  });

  assert.equal(completed.completed, true);
  assert.equal(completed.completionPercent, 100);
  assert.equal(completed.summary.menuMode, 'manual');
  assert.match(buildRestaurantSetupSummary(state).restaurantName, /Kıyı Balık/);
});

test('resetOnboardingWizard clears persisted progress', () => {
  installMemoryStorage();
  const state = runFullWizard();
  writeOnboardingProgress(state);
  assert.notEqual(readOnboardingProgress(RESTAURANT_ID), null);

  resetOnboardingWizard(RESTAURANT_ID);
  assert.equal(readOnboardingProgress(RESTAURANT_ID), null);
});
