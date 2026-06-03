import { VACATION_STEPS, STEP_OPTIONS } from './tatil-config.js';

/** Tatil tipi (goal) seçimine göre adım metinleri ve seçenek filtreleri */
export const GOAL_FLOW = {
  deniz: {
    typeValues: ['deniz-resort', 'cocuk-dostu', 'ekonomik-kacamak', 'villa-butik'],
    peopleValues: ['tek', 'cift', 'aile', 'arkadas', 'cocuklu-aile', 'is-tatil'],
    expectationValues: [
      'Sessizlik',
      'Çocuk dostu',
      'Gece hayatı',
      'Doğa',
      'Gastronomi',
      'Güvenlik',
      'Uygun fiyat',
      'Lüks deneyim',
      'Spa'
    ],
    transportValues: ['ucak', 'otobus', 'arac', 'karma'],
    comfortValues: ['temel', 'dengeli', 'premium', 'luks']
  },
  sehir: {
    typeValues: ['kultur-sehir', 'ekonomik-kacamak', 'villa-butik', 'vizesiz-yurtdisi'],
    peopleValues: ['tek', 'cift', 'arkadas', 'is-tatil'],
    expectationValues: [
      'Gastronomi',
      'Instagramlık yerler',
      'Güvenlik',
      'Uygun fiyat',
      'Gece hayatı',
      'Macera'
    ],
    typeStep: {
      title: 'Şehir tatili formatınız',
      subtitle: 'Konaklama ve tempo seçiminize göre rota önerileri değişir.'
    },
    peopleStep: {
      title: 'Şehir gezisine kimlerle çıkıyorsunuz?',
      subtitle: 'Grup yapısı konaklama bölgesi ve günlük tempo için önemli.'
    }
  },
  doga: {
    typeValues: ['doga', 'villa-butik', 'ekonomik-kacamak'],
    peopleValues: ['tek', 'cift', 'arkadas', 'aile'],
    expectationValues: ['Doğa', 'Sessizlik', 'Macera', 'Güvenlik', 'Uygun fiyat', 'Spa'],
    transportValues: ['arac', 'otobus', 'karma'],
    peopleStep: {
      title: 'Doğa kaçamağına kimlerle gidiyorsunuz?',
      subtitle: 'Ulaşım ve konaklama tipi grup yapınıza göre ayarlanır.'
    }
  },
  'luks-resort': {
    typeValues: ['luks', 'deniz-resort', 'villa-butik'],
    peopleValues: ['tek', 'cift', 'arkadas'],
    expectationValues: ['Lüks deneyim', 'Spa', 'Sessizlik', 'Gastronomi', 'Güvenlik', 'Instagramlık yerler'],
    comfortValues: ['premium', 'luks'],
    defaultComfort: 'premium',
    peopleStep: {
      title: 'Lüks resort deneyimine kimler katılacak?',
      subtitle: 'Servis seviyesi ve oda tipi grup profilinize göre önerilir.'
    }
  },
  balayi: {
    typeValues: ['villa-butik', 'luks', 'deniz-resort'],
    peopleValues: ['cift', 'tek'],
    expectationValues: [
      'Lüks deneyim',
      'Spa',
      'Sessizlik',
      'Gastronomi',
      'Instagramlık yerler',
      'Güvenlik'
    ],
    transportValues: ['ucak', 'karma'],
    comfortValues: ['premium', 'luks'],
    defaultPeople: 'cift',
    defaultTravelers: '2',
    defaultComfort: 'premium',
    typeStep: {
      title: 'Balayı deneyimi türü',
      subtitle: 'Butik, resort veya villa konforu öneri skorunu doğrudan etkiler.'
    },
    peopleStep: {
      title: 'Balayı seyahatiniz',
      subtitle: 'Çoğunlukla çift planlanır; kişi sayısını netleştirmeniz yeterli.'
    },
    expectationsStep: {
      title: 'Balayında öncelikleriniz',
      subtitle: 'Romantik tempo, mahremiyet ve konfor beklentilerinizi işaretleyin (en fazla 5).'
    },
    noteStep: {
      title: 'Balayı için ek not',
      subtitle: 'Özel kutlama, diyet veya rota beklentinizi paylaşabilirsiniz.'
    }
  },
  'cocuklu-aile': {
    typeValues: ['cocuk-dostu', 'deniz-resort', 'villa-butik'],
    peopleValues: ['cocuklu-aile', 'aile'],
    expectationValues: [
      'Çocuk dostu',
      'Güvenlik',
      'Sessizlik',
      'Uygun fiyat',
      'Doğa',
      'Spa',
      'Gastronomi'
    ],
    defaultPeople: 'cocuklu-aile',
    typeStep: {
      title: 'Aile tatili formatı',
      subtitle: 'Çocuk kulübü, animasyon veya villa konforu seçiminize göre filtrelenir.'
    },
    peopleStep: {
      title: 'Aile yapınız',
      subtitle: 'Yetişkin ve çocuk sayısı konaklama ile aktivite önerilerini belirler.'
    },
    expectationsStep: {
      title: 'Aile tatilinde öncelikleriniz',
      subtitle: 'Çocuk güvenliği ve tempo beklentilerinizi seçin (en fazla 5).'
    }
  },
  wellness: {
    typeValues: ['luks', 'villa-butik', 'doga'],
    peopleValues: ['tek', 'cift'],
    expectationValues: ['Spa', 'Sessizlik', 'Doğa', 'Güvenlik', 'Lüks deneyim', 'Gastronomi'],
    transportValues: ['ucak', 'karma', 'arac'],
    comfortValues: ['dengeli', 'premium', 'luks'],
    typeStep: {
      title: 'Wellness / spa deneyimi',
      subtitle: 'Termal, butik spa veya doğa içi dinlenme programına göre öneri değişir.'
    },
    peopleStep: {
      title: 'Wellness tatiline kimlerle gidiyorsunuz?',
      subtitle: 'Genelde bireysel veya çift profili için programlar özelleştirilir.'
    },
    expectationsStep: {
      title: 'Rahatlama ve bakım öncelikleriniz',
      subtitle: 'Spa, sessizlik ve tempo beklentilerinizi işaretleyin (en fazla 5).'
    }
  },
  kultur: {
    typeValues: ['kultur-sehir', 'ekonomik-kacamak', 'vizesiz-yurtdisi'],
    peopleValues: ['tek', 'cift', 'arkadas', 'aile'],
    expectationValues: [
      'Gastronomi',
      'Instagramlık yerler',
      'Güvenlik',
      'Uygun fiyat',
      'Macera'
    ],
    typeStep: {
      title: 'Kültür turu formatı',
      subtitle: 'Yurt içi rota veya vizesiz yurt dışı seçenekleri buna göre açılır.'
    },
    peopleStep: {
      title: 'Kültür turuna kimlerle katılıyorsunuz?',
      subtitle: 'Grup yapısı rehberli tur ve konaklama tipini belirler.'
    }
  }
};

const TYPE_STEP_BASE = {
  id: 'type',
  label: 'Format',
  title: 'Tatil formatınızı netleştirin',
  subtitle: 'Konaklama ve paket tipi öneri skorunu doğrudan etkiler.'
};

function flowForGoal(goal) {
  return GOAL_FLOW[goal] || null;
}

function pickOptions(allOptions, allowedValues) {
  if (!allowedValues?.length) return allOptions;
  const byValue = new Map(allOptions.map((o) => [o.value, o]));
  return allowedValues.map((value) => byValue.get(value)).filter(Boolean);
}

function pickChips(allChips, allowedValues) {
  if (!allowedValues?.length) return allChips;
  const set = new Set(allowedValues);
  return allChips.filter((c) => set.has(c));
}

export function getVacationFlowSteps(vacationGoal) {
  const flow = flowForGoal(vacationGoal);
  const steps = [...VACATION_STEPS];
  if (!flow?.typeValues?.length) return steps;

  const goalIndex = steps.findIndex((s) => s.id === 'goal');
  const typeStep = { ...TYPE_STEP_BASE, ...(flow.typeStep || {}) };
  const next = [...steps];
  next.splice(goalIndex + 1, 0, typeStep);
  return next;
}

export function getStepMeta(stepId, vacationGoal) {
  const base = VACATION_STEPS.find((s) => s.id === stepId) || TYPE_STEP_BASE;
  const flow = flowForGoal(vacationGoal);
  if (!flow) return { ...base };

  const overrideKey = `${stepId}Step`;
  const override = flow[overrideKey];
  return override ? { ...base, ...override } : { ...base };
}

export function getOptionsForStep(stepId, vacationGoal) {
  const flow = flowForGoal(vacationGoal);

  if (stepId === 'people') {
    return pickOptions(STEP_OPTIONS.people, flow?.peopleValues);
  }
  if (stepId === 'type') {
    return pickOptions(STEP_OPTIONS.type, flow?.typeValues);
  }
  if (stepId === 'expectations') {
    return pickChips(STEP_OPTIONS.expectations, flow?.expectationValues);
  }
  if (stepId === 'transport') {
    return pickOptions(STEP_OPTIONS.transport, flow?.transportValues);
  }
  if (stepId === 'comfort') {
    return pickOptions(STEP_OPTIONS.comfort, flow?.comfortValues);
  }

  return STEP_OPTIONS[stepId] || [];
}

export function applyGoalFlowDefaults(state, vacationGoal) {
  const flow = flowForGoal(vacationGoal);
  if (!flow) return;

  const peopleOpts = getOptionsForStep('people', vacationGoal);
  if (flow.defaultPeople && peopleOpts.some((o) => o.value === flow.defaultPeople)) {
    if (!state.people_type || !peopleOpts.some((o) => o.value === state.people_type)) {
      state.people_type = flow.defaultPeople;
    }
  }

  if (flow.defaultTravelers && (!state.travelers_count || state.people_type === flow.defaultPeople)) {
    if (state.people_type === flow.defaultPeople) {
      state.travelers_count = flow.defaultTravelers;
    }
  }

  const typeOpts = getOptionsForStep('type', vacationGoal);
  if (state.vacation_type && !typeOpts.some((o) => o.value === state.vacation_type)) {
    state.vacation_type = typeOpts[0]?.value || '';
  }

  const comfortOpts = getOptionsForStep('comfort', vacationGoal);
  if (flow.defaultComfort && comfortOpts.some((o) => o.value === flow.defaultComfort)) {
    if (!state.comfort_expectation || !comfortOpts.some((o) => o.value === state.comfort_expectation)) {
      state.comfort_expectation = flow.defaultComfort;
    }
  }

  if (state.expectations?.length) {
    const allowed = new Set(getOptionsForStep('expectations', vacationGoal));
    state.expectations = state.expectations.filter((e) => allowed.has(e));
  }
}

export function resetFieldsOnGoalChange(state, previousGoal, newGoal) {
  if (previousGoal === newGoal) return;

  const peopleOpts = getOptionsForStep('people', newGoal);
  if (state.people_type && !peopleOpts.some((o) => o.value === state.people_type)) {
    state.people_type = '';
    state.travelers_count = '';
    state.children_count = '';
    state.children_ages = '';
  }

  const typeOpts = getOptionsForStep('type', newGoal);
  if (!typeOpts.some((o) => o.value === state.vacation_type)) {
    state.vacation_type = typeOpts[0]?.value || '';
  }

  const transportOpts = getOptionsForStep('transport', newGoal);
  if (state.transport_preference && !transportOpts.some((o) => o.value === state.transport_preference)) {
    state.transport_preference = '';
  }

  const comfortOpts = getOptionsForStep('comfort', newGoal);
  if (state.comfort_expectation && !comfortOpts.some((o) => o.value === state.comfort_expectation)) {
    state.comfort_expectation = '';
  }

  if (state.expectations?.length) {
    const allowed = new Set(getOptionsForStep('expectations', newGoal));
    state.expectations = state.expectations.filter((e) => allowed.has(e));
  }

  applyGoalFlowDefaults(state, newGoal);
}

export function shouldShowChildrenFields(state) {
  return state.people_type === 'cocuklu-aile' || state.vacation_goal === 'cocuklu-aile';
}

export function findPeopleLabel(value, vacationGoal) {
  const opt = getOptionsForStep('people', vacationGoal).find((o) => o.value === value);
  if (opt) return opt.label;
  return STEP_OPTIONS.people?.find((o) => o.value === value)?.label || value || '';
}
