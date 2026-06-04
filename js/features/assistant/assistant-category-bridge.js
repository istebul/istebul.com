/**
 * Karar Asistanı ↔ dikey sayfa enum köprüsü ve AI insight girdisi.
 */

const AUTO_USAGE_TO_VERTICAL = Object.freeze({
  longRoad: 'long',
  prestige: 'business',
  city: 'city',
  family: 'family',
  long: 'long',
  business: 'business'
});

const TATIL_ASSISTANT_TO_VERTICAL = Object.freeze({
  familyResort: 'deniz',
  honeymoon: 'balayi',
  culture: 'kultur',
  nature: 'doga',
  luxury: 'ultra'
});

const VERTICAL_BY_ASSISTANT = Object.freeze({
  arac: 'auto',
  ev: 'konut',
  tatil: 'tatil',
  finansman: 'finansman'
});

export function normalizeAutoUsage(usage = '') {
  const key = String(usage || '').trim();
  return AUTO_USAGE_TO_VERTICAL[key] || key || 'city';
}

export function normalizeTatilGoal(vacationType = '') {
  const key = String(vacationType || '').trim();
  return TATIL_ASSISTANT_TO_VERTICAL[key] || key;
}

export function assistantVerticalId(categoryId = '') {
  return VERTICAL_BY_ASSISTANT[categoryId] || 'auto';
}

/**
 * Ana sayfa asistan sonucu için ai-insight-engine girdisi.
 */
export function buildAssistantInsightInput(categoryId, categoryConfig, primary, answers = {}, recommendations = []) {
  const vertical = assistantVerticalId(categoryId);
  const normalizedAnswers = { ...answers };

  if (categoryId === 'arac') {
    normalizedAnswers.usage = normalizeAutoUsage(answers.usage);
  }
  if (categoryId === 'tatil' && answers.vacationType) {
    normalizedAnswers.vacation_goal = normalizeTatilGoal(answers.vacationType);
  }
  if (categoryId === 'finansman') {
    if (answers.purpose) normalizedAnswers.purpose = answers.purpose;
    if (answers.term) normalizedAnswers.term_months = answers.term;
    if (answers.capacity) normalizedAnswers.capacity = answers.capacity;
    if (answers.rateSensitivity) normalizedAnswers.rate_sensitivity = answers.rateSensitivity;
  }

  const alt = recommendations.find((item) => item.name !== primary?.name);
  const bestFinance = primary?.financeComparisons?.[0];

  return {
    vertical,
    planTier: 'guest',
    decisionScore: primary?.score,
    overallRisk: primary?.riskLevel || 'Orta',
    answers: normalizedAnswers,
    recommendation: {
      name: primary?.name,
      label: primary?.name,
      score: primary?.score
    },
    strengths: [primary?.scoreNote, primary?.realisticComment].filter(Boolean),
    weaknesses: [],
    costs: {
      budget: Number(answers.budget) || null,
      total: primary?.yearlyCost || primary?.price || null,
      monthlyPayment: bestFinance?.monthlyPayment || null,
      termMonths: bestFinance?.term || Number(answers.term) || null,
      principal: primary?.price || Number(answers.budget) || null
    },
    alternatives: alt ?
      [{ title: alt.name, description: alt.scoreNote || '', meta: `${alt.score}/100` }]
    : []
  };
}

/** Dikey sayfaya devam linki (query ile profil taşıma). */
export function buildVerticalContinueHref(categoryId, answers = {}) {
  const params = new URLSearchParams();
  if (categoryId === 'arac') {
    if (answers.budget) params.set('budget', answers.budget);
    if (answers.usage) params.set('usage', normalizeAutoUsage(answers.usage));
    if (answers.fuel) params.set('fuel', answers.fuel);
    if (answers.body) params.set('body', answers.body);
    return `/auto/${params.toString() ? `?${params}` : ''}`;
  }
  if (categoryId === 'ev') {
    return '/konut/';
  }
  if (categoryId === 'tatil') {
    if (answers.vacationType) params.set('goal', normalizeTatilGoal(answers.vacationType));
    if (answers.budget) params.set('budget', answers.budget);
    return `/tatil/${params.toString() ? `?${params}` : ''}`;
  }
  if (categoryId === 'finansman') {
    if (answers.purpose) params.set('purpose', answers.purpose);
    if (answers.budget) params.set('amount', answers.budget);
    if (answers.term) params.set('term', answers.term);
    return `/finans/${params.toString() ? `?${params}` : ''}`;
  }
  return '/';
}
