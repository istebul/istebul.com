import { FINANS_STEPS, FINANS_OPTIONS } from './finans-config.js';

export const PURPOSE_FLOW = {
  arac: {
    amountValues: ['250k', '500k', '1m', '2m', 'manuel'],
    termValues: ['12', '24', '36', '48', '60'],
    amountStep: {
      title: 'Taşıt kredisi tutarı',
      subtitle: 'Araç bedeli ve peşinat planınıza göre çekilecek kredi tutarı.'
    },
    termStep: {
      title: 'Taşıt kredisi vadesi',
      subtitle: 'Vade; aylık taksit ile toplam faiz maliyetini birlikte belirler.'
    },
    cashflowStep: {
      title: 'Araç kredisi için nakit akışınız',
      subtitle: 'Gelir, gider ve mevcut borçlar taksit kapasitesini belirler.'
    }
  },
  konut: {
    amountValues: ['500k', '1m', '2m', 'manuel'],
    termValues: ['36', '48', '60'],
    amountStep: {
      title: 'Konut / ipotek kredisi tutarı',
      subtitle: 'Konut bedeli ve peşinat sonrası finanse edilecek tutar.'
    },
    termStep: {
      title: 'İpotek vadesi',
      subtitle: 'Konut kredilerinde uzun vade aylık yükü düşürür; toplam faizi artırabilir.'
    },
    cashflowStep: {
      title: 'Konut kredisi için gelir ve borç profili',
      subtitle: 'Net gelir, sabit giderler ve mevcut kredi taksitleri skorun temelidir.'
    }
  },
  tatil: {
    amountValues: ['250k', '500k', '1m', 'manuel'],
    termValues: ['12', '24', '36'],
    amountStep: {
      title: 'Tatil finansmanı tutarı',
      subtitle: 'Tatil paketi, ulaşım ve konaklama için planladığınız kredi tutarı.'
    },
    termStep: {
      title: 'Tatil kredisi vadesi',
      subtitle: 'Kısa vade tatil harcamalarında aylık yükü kontrol etmek için önemlidir.'
    },
    cashflowStep: {
      title: 'Tatil kredisi için ödeme kapasitesi',
      subtitle: 'Tatil dönemi dışındaki aylık nakit akışınız sürdürülebilirliği belirler.'
    }
  },
  ihtiyac: {
    amountValues: ['250k', '500k', '1m', 'manuel'],
    termValues: ['12', '24', '36', '48'],
    amountStep: {
      title: 'İhtiyaç kredisi tutarı',
      subtitle: 'Tüketici kredisi için talep edeceğiniz tutar.'
    },
    termStep: {
      title: 'İhtiyaç kredisi vadesi',
      subtitle: 'Kısa vadede toplam maliyet, uzun vadede aylık yük değişir.'
    }
  },
  isletme: {
    amountValues: ['500k', '1m', '2m', 'manuel'],
    termValues: ['12', '24', '36', '48', '60'],
    amountStep: {
      title: 'İşletme finansmanı tutarı',
      subtitle: 'Nakit akışı, stok veya yatırım için kullanılacak tutar.'
    },
    termStep: {
      title: 'İşletme kredisi vadesi',
      subtitle: 'Nakit döngünüze göre geri ödeme planı modellenir.'
    },
    cashflowStep: {
      title: 'İşletme nakit akışı ve borç yükü',
      subtitle: 'Değişken gelir ve mevcut ticari borçlar kapasiteyi etkiler.'
    },
    sensitivityStep: {
      title: 'Faiz ve nakit akışı hassasiyeti',
      subtitle: 'İşletme riski ve faiz artışına karşı dayanıklılık.'
    }
  }
};

function flowForPurpose(purpose) {
  return PURPOSE_FLOW[purpose] || null;
}

function pickOptions(allOptions, allowedValues) {
  if (!allowedValues?.length) return allOptions;
  const byValue = new Map(allOptions.map((o) => [o.value, o]));
  return allowedValues.map((value) => byValue.get(value)).filter(Boolean);
}

export function getFinansStepMeta(purpose, step) {
  const flow = flowForPurpose(purpose);
  if (!flow || !step?.id) return {};
  const key = `${step.id}Step`;
  return flow[key] || {};
}

export function getFinansOptions(stepId, purpose) {
  const flow = flowForPurpose(purpose);
  if (!flow) return FINANS_OPTIONS[stepId] || [];

  if (stepId === 'amount') return pickOptions(FINANS_OPTIONS.amount, flow.amountValues);
  if (stepId === 'term') return pickOptions(FINANS_OPTIONS.term, flow.termValues);
  if (stepId === 'capacity') return FINANS_OPTIONS.capacity;
  if (stepId === 'income') return FINANS_OPTIONS.income;
  if (stepId === 'earlyPayment') return FINANS_OPTIONS.earlyPayment;
  if (stepId === 'rateSensitivity') return FINANS_OPTIONS.rateSensitivity;
  if (stepId === 'riskTolerance') return FINANS_OPTIONS.riskTolerance;
  return FINANS_OPTIONS[stepId] || [];
}

export function resetFieldsOnPurposeChange(state, previousPurpose, newPurpose) {
  if (previousPurpose === newPurpose) return;

  const amountOpts = getFinansOptions('amount', newPurpose);
  if (state.amount_range && !amountOpts.some((o) => o.value === state.amount_range)) {
    state.amount_range = '';
    state.amount_manual = null;
  }

  const termOpts = getFinansOptions('term', newPurpose);
  if (state.term_months && !termOpts.some((o) => o.value === state.term_months)) {
    state.term_months = '';
  }
}

export function getFinansSteps(purpose) {
  return FINANS_STEPS.map((step) => ({
    ...step,
    ...getFinansStepMeta(purpose, step)
  }));
}

/** @param {object} state @param {{ id?: string }|null} step */
export function canAdvanceFinansStep(state, step) {
  if (!step) return false;
  if (step.id === 'purpose') return Boolean(state.purpose);
  if (step.id === 'amount') {
    if (!state.amount_range) return false;
    if (state.amount_range === 'manuel') return Boolean(state.amount_manual);
    return true;
  }
  if (step.id === 'term') return Boolean(state.term_months);
  if (step.id === 'capacity') {
    if (!state.capacity_range) return false;
    if (state.capacity_range === 'manuel') return Boolean(state.capacity_manual);
    return true;
  }
  if (step.id === 'cashflow') {
    return Boolean(state.income_type) && Boolean(state.early_payment) && Boolean(state.monthly_income);
  }
  if (step.id === 'sensitivity') {
    return Boolean(state.rate_sensitivity) && Boolean(state.risk_tolerance);
  }
  return true;
}
