import { RESULT_BADGES, STEP_OPTIONS, BUDGET_PLANS } from './tatil-config.js';
import { findPeopleLabel } from './tatil-flow.js';
import {
  computeTripNights,
  formatTry,
  getBudgetDisplay,
  getDateSummary,
  getFlexibilityLabel
} from './tatil-utils.js';

const FALLBACK_SCENARIOS = [
  {
    title: 'Antalya — Belek',
    slug: 'antalya-belek',
    description: 'Aile dostu her şey dahil otel seçenekleri; uçuş + transfer paketleriyle uyumlu.',
    image_url: '/assets/images/placeholder.svg',
    config: { badge: 'logical', region: 'Akdeniz', fit: ['family', 'allInclusive'] }
  },
  {
    title: 'Kuşadası — Didim',
    slug: 'kusadasi-didim',
    description: 'Ekonomik sahil tatili; kısa mesafe ve esnek konaklama alternatifleri.',
    image_url: '/assets/images/placeholder.svg',
    config: { badge: 'economic', region: 'Ege', fit: ['budget', 'sea'] }
  },
  {
    title: 'Bodrum — Torba',
    slug: 'bodrum-torba',
    description: 'Konfor odaklı butik ve villa seçenekleri; sakin koy profili.',
    image_url: '/assets/images/placeholder.svg',
    config: { badge: 'comfort', region: 'Ege', fit: ['luxury', 'couple'] }
  }
];

const PLAN_COST = {
  ekonomik: { min: 20000, max: 60000, label: '₺20.000 – ₺60.000' },
  dengeli: { min: 60000, max: 140000, label: '₺60.000 – ₺140.000' },
  premium: { min: 140000, max: 260000, label: '₺140.000 – ₺260.000' },
  ultra: { min: 260000, max: 520000, label: '₺260.000+' }
};

function labelForGoal(value) {
  return STEP_OPTIONS.goal?.find((o) => o.value === value)?.label || value || '';
}

function labelForPeople(value, vacationGoal) {
  return findPeopleLabel(value, vacationGoal);
}

function labelForType(value) {
  return STEP_OPTIONS.type?.find((o) => o.value === value)?.label || value || '';
}

function estimateCostRange(state) {
  if (state.budget_range === 'manuel' && (state.budget_total || state.budget_manual)) {
    const t = Number(state.budget_total || state.budget_manual);
    const low = Math.round(t * 0.88);
    const high = Math.round(t * 1.12);
    return {
      label: `${formatTry(low)} – ${formatTry(high)} (hedef: ${formatTry(t)})`,
      target: t,
      isManual: true
    };
  }
  const plan = PLAN_COST[state.budget_range] || PLAN_COST.dengeli;
  return { label: plan.label, target: (plan.min + plan.max) / 2, isManual: false };
}

function budgetFitScore(state, cardMidCost) {
  if (!state.budget_manual || state.budget_range !== 'manuel') return null;
  const target = Number(state.budget_manual);
  const ratio = cardMidCost / target;
  if (ratio >= 0.85 && ratio <= 1.15) return 'high';
  if (ratio >= 0.7 && ratio <= 1.3) return 'medium';
  return 'low';
}

export function baseScore(state) {
  let score = 64;
  if (state.budget_range === 'dengeli') score += 5;
  if (state.budget_range === 'ekonomik') score += 2;
  if (state.budget_range === 'premium') score += 7;
  if (state.budget_range === 'ultra') score += 9;
  if (state.budget_range === 'manuel' && state.budget_manual) {
    if (state.budget_manual >= 80000) score += 8;
    else if (state.budget_manual >= 40000) score += 5;
  }
  if (state.vacation_goal === 'luks-resort' || state.vacation_goal === 'balayi') score += 5;
  if (state.people_type === 'cocuklu-aile') score += 4;
  if (state.people_type === 'yasli-aile') score += 3;
  if (['deniz-resort', 'cocuk-dostu'].includes(state.vacation_type)) score += 4;
  if (state.trip_nights && state.trip_nights >= 7) score += 3;
  score += Math.min((state.expectations?.length || 0) * 2, 8);
  return Math.min(score, 90);
}

function buildCostBreakdown(state, score) {
  const estimated = estimateCostRange(state);
  const travelers = Math.max(Number(state.travelers_count) || 1, 1);
  const nights = Math.max(Number(state.trip_nights) || 5, 3);
  const target = Number(estimated.target || 90000);
  const seasonFactor = state.date_flexibility === 'undecided' ? 1.08 : state.date_flexibility === 'net' ? 1.02 : 1;
  const comfortFactor = state.budget_range === 'ultra' ? 1.45 : state.budget_range === 'premium' ? 1.25 : 1;
  const base = target * seasonFactor * comfortFactor;
  const childrenCount = Number(state.children_count) || 0;

  const breakdown = {
    accommodation: Math.round(base * 0.38),
    transport: Math.round(base * 0.21),
    transfer: Math.round(base * 0.06),
    food: Math.round(base * 0.14),
    extras: Math.round(base * 0.1),
    children: Math.round(childrenCount * 3200),
    visaDocs: state.vacation_goal === 'yurtdisi' || state.vacation_goal === 'vizesiz-yurtdisi' ? 4200 : 0,
    carRental: state.vacation_type === 'doga' || state.vacation_type === 'villa-butik' ? 8500 : 3000
  };

  const visiblePrice = Math.round((breakdown.accommodation + breakdown.transport) * 0.82);
  const realTotal = Object.values(breakdown).reduce((sum, n) => sum + n, 0);
  const hidden = Math.max(realTotal - visiblePrice, 0);

  return {
    nights,
    travelers,
    visiblePrice,
    realTotal,
    hidden,
    perPerson: Math.round(realTotal / travelers),
    visiblePriceLabel: formatTry(visiblePrice),
    realTotalLabel: formatTry(realTotal),
    perPersonLabel: formatTry(Math.round(realTotal / travelers)),
    hiddenLabel: formatTry(hidden),
    lines: Object.entries(breakdown).map(([key, value]) => ({ key, value, label: formatTry(value) })),
    seasonRisk: score > 88 ? 'Düşük' : score > 78 ? 'Orta' : 'Yüksek'
  };
}

function buildScorePanel(state, score, budgetFit) {
  const family = state.people_type === 'cocuklu-aile' ? 95 : state.people_type === 'cift' ? 88 : 84;
  const comfort = state.budget_range === 'ultra' ? 96 : state.budget_range === 'premium' ? 91 : 84;
  const budgetEfficiency = budgetFit === 'high' ? 90 : budgetFit === 'medium' ? 82 : 74;
  const risk = state.date_flexibility === 'undecided' ? 'Orta' : score >= 88 ? 'Düşük' : 'Orta';
  return {
    general: score,
    family: Math.min(100, family),
    budgetEfficiency: Math.min(100, budgetEfficiency),
    comfort: Math.min(100, comfort),
    risk
  };
}

function buildAlternatives(primaryTitle, costs, state) {
  const set = [
    {
      title: 'Kaş (Antalya) alternatifi',
      reason: `${primaryTitle} yerine daha düşük yoğunluk ve benzer deniz kalitesi`,
      delta: 'Maliyet ~%11 daha düşük, risk bir kademe daha düşük',
      score: 86
    },
    {
      title: 'Datça (Muğla) alternatifi',
      reason: 'Bodrum benzeri deneyim, daha sakin rota',
      delta: 'Maliyet ~%14 daha düşük, deneyim kalitesi benzer',
      score: 84
    },
    {
      title: state.vacation_goal === 'sehir' ? 'Kültür rotası: Selanik + Kavala' : 'Yunan adası kısa rota',
      reason: 'Yurt dışı hissi için vize/ege geçiş alternatifleri',
      delta: `Maliyet ~%${state.budget_range === 'ekonomik' ? '9' : '16'} farklı, risk mevsime bağlı`,
      score: 82
    }
  ];
  return set.map((item) => ({
    ...item,
    cost: formatTry(Math.round(costs.realTotal * (item.score >= 85 ? 0.9 : 1.05))),
    risk: item.score > 85 ? 'Düşük-Orta' : 'Orta'
  }));
}

function buildTags(state, budgetFit) {
  const tags = [];
  if (budgetFit === 'high') tags.push({ text: 'Hedef bütçeye uyum', className: 'tag-budget' });
  if (budgetFit === 'medium') tags.push({ text: 'Bütçeye yakın profil', className: 'tag-budget' });
  if (state.people_type === 'cocuklu-aile') {
    tags.push({ text: 'Çocuk uygunluğu', className: 'tag-family' });
  }
  if (state.people_type === 'yasli-aile') {
    tags.push({ text: 'Erişilebilirlik odağı', className: 'tag-access' });
  }
  return tags;
}

function mapScenarioToResult(scenario, badgeKey, state, scoreOffset) {
  const badge = RESULT_BADGES[badgeKey] || RESULT_BADGES.logical;
  const cost = estimateCostRange(state);
  const score = Math.min(100, baseScore(state) + scoreOffset);
  const mid =
    state.budget_range === 'ekonomik'
      ? 30000
      : state.budget_range === 'dengeli'
        ? 78000
        : cost.target || 70000;
  const budgetFit = budgetFitScore(state, mid);

  const pros = [];
  const cautions = [];
  const why = [];

  if (state.people_type === 'cocuklu-aile') {
    pros.push('Çocuk dostu konaklama ve aktivite profiline uygun görünüyor');
    if (state.children_ages) {
      pros.push(`Çocuk yaş profili (${state.children_ages}) dikkate alındı`);
    }
    cautions.push('Okul tatili dönemlerinde doluluk ve fiyat artışı olabilir');
  } else if (state.people_type === 'aile') {
    pros.push('Yetişkin aile yapısı için esnek oda ve tempo seçenekleri');
    why.push('Aile seçiminiz çocuklu aile profilinden ayrı değerlendirildi; tempo daha esnek planlanabilir.');
  } else if (state.people_type === 'yasli-aile') {
    pros.push('Düşük tempo ve erişilebilirlik öncelikli değerlendirme');
    cautions.push('Sağlık ve transfer konforu için ek süre planlayın');
  }

  if (['deniz-resort', 'cocuk-dostu'].includes(state.vacation_type)) {
    pros.push('Deniz ve resort beklentisiyle örtüşen konaklama modeli');
  }
  if (state.vacation_type === 'vizesiz-yurtdisi') {
    cautions.push('Güncel giriş koşulları ve sigorta şartları partner tarafından doğrulanmalıdır');
  }

  if (badgeKey === 'economic') {
    pros.push('Maliyet kontrollü tatil profiline yakın tahmin aralığı');
    cautions.push('Sezon içi ek masraflar bütçeyi etkileyebilir');
    why.push('Ekonomik plan veya manuel hedef bütçenizle uyumlu maliyet bandı önceliklendirildi.');
  }
  if (badgeKey === 'comfort') {
    pros.push('Konfor ve hizmet kalitesi ağırlıklı profil');
    cautions.push('Yüksek sezonda müsaitlik sınırlı olabilir');
  }
  if (badgeKey === 'logical') {
    pros.push('Bütçe, konfor ve risk dengesi birlikte değerlendirildi');
    why.push('Seçimlerinize göre dengeli bir tatil modeli daha uygun görünüyor.');
  }

  cautions.push('Gösterilen fiyatlar tahminidir; kesin teklif partner onayı ile netleşir');

  const fitLabels = {
    tek: 'Yalnız gezginler',
    cift: 'Çiftler',
    aile: 'Yetişkin aileler (çocuksuz profil)',
    arkadas: 'Arkadaş grupları',
    'cocuklu-aile': 'Çocuklu aileler',
    'yasli-aile': 'Yaşlı bireyle seyahat edenler'
  };

  const suitability =
    badgeKey === 'economic'
      ? 'Bütçe hassasiyeti yüksek profiller'
      : badgeKey === 'comfort'
        ? 'Konfor ve hizmet beklentisi yüksek profiller'
        : 'Dengeli beklenti ve risk profili';

  const scorePanel = buildScorePanel(state, score, budgetFit);
  const costs = buildCostBreakdown(state, score);
  return {
    id: scenario.slug,
    title: scenario.title,
    description: scenario.description || '',
    image_url: scenario.image_url || '/assets/images/placeholder.svg',
    badge,
    score,
    estimatedCost: cost.label,
    audience: fitLabels[state.people_type] || 'Genel profil',
    suitability,
    pros,
    cautions,
    why: why[0] || 'Profilinizdeki amaç, bütçe ve seyahat tipi birlikte skorlandı.',
    tags: buildTags(state, budgetFit),
    region: scenario.config?.region || '',
    scores: scorePanel,
    costs,
    alternatives: buildAlternatives(scenario.title, costs, state)
  };
}

export function buildResults(state, scenarios = []) {
  const list = scenarios.length ? scenarios : FALLBACK_SCENARIOS;
  const byBadge = {
    logical: list.find((s) => s.config?.badge === 'logical') || list[0],
    economic: list.find((s) => s.config?.badge === 'economic') || list[1] || list[0],
    comfort: list.find((s) => s.config?.badge === 'comfort') || list[2] || list[0]
  };

  return [
    mapScenarioToResult(byBadge.logical, 'logical', state, 6),
    mapScenarioToResult(byBadge.economic, 'economic', state, -4),
    mapScenarioToResult(byBadge.comfort, 'comfort', state, 10)
  ];
}

export function buildResultsSummary(state, results = []) {
  const cost = estimateCostRange(state);
  const top = results[0];
  const fitScore = top?.score ?? baseScore(state);

  let familyFit = 'Seyahat grubunuza uygun konaklama ve tempo profili';
  if (state.people_type === 'cocuklu-aile') {
    familyFit = 'Çocuklu aile — aktivite ve konaklama uygunluğu öncelikli';
  } else if (state.people_type === 'yasli-aile') {
    familyFit = 'Yaşlı bireyle seyahat — erişilebilirlik ve düşük tempo';
  } else if (state.people_type === 'cift') {
    familyFit = 'Çiftler için konfor ve mahremiyet odaklı profil';
  }

  let seasonRisk = 'Sezon ve doluluk fiyat bandını etkileyebilir';
  if (state.date_flexibility === 'undecided') {
    seasonRisk = 'Tarih esnek — sezon/doluluk riski orta-yüksek';
  } else if (state.date_start && state.date_end) {
    seasonRisk = 'Net tarih — sezon riski daha öngörülebilir';
  } else if (state.date_period_note) {
    seasonRisk = `Dönem notu: ${state.date_period_note.slice(0, 48)}`;
  }

  const totalCostLabel = top?.costs?.realTotalLabel || cost.label;
  return {
    totalCostLabel,
    fitScore,
    seasonRisk: top?.costs?.seasonRisk ? `${seasonRisk} · ${top.costs.seasonRisk}` : seasonRisk,
    familyFit,
    topTitle: top?.title || 'Önerilen profil',
    scoreBand: fitScore >= 80 ? 'Güçlü uyum' : fitScore >= 65 ? 'Dengeli profil' : 'Alternatif değerlendirin',
    nextStep: 'Bir destinasyon seçin; sezon yoğunluğu ve ulaşım maliyetini tekrar kontrol edin.'
  };
}

export function buildAiCommentary(state, results) {
  const goal = labelForGoal(state.vacation_goal);
  const people = labelForPeople(state.people_type, state.vacation_goal);
  const vType = labelForType(state.vacation_type);
  const budget = getBudgetDisplay(state);
  const dates = getDateSummary(state);
  const flex = getFlexibilityLabel(state);
  const top = results[0];

  const bullets = [];

  if (budget) {
    bullets.push(
      state.budget_range === 'manuel' && state.budget_manual
        ? `Manuel bütçe hedefiniz (${formatTry(state.budget_manual)}) sonuç hesaplamasına dahil edilmiştir.`
        : `${budget} bandında tahmini maliyet aralığı değerlendirilmiştir.`
    );
  }

  bullets.push(
    `${people || 'Seyahat grubunuz'} için konaklama tipi ve tempo öncelikleri profile göre ayarlandı.`
  );

  if (state.people_type === 'cocuklu-aile') {
    const ages = state.children_ages ? ` (${state.children_ages})` : '';
    const count = state.children_count ? `${state.children_count} çocuk` : 'Çocuklu';
    bullets.push(
      `${count}${ages} profili nedeniyle ulaşım kolaylığı, otel içi aktivite çeşitliliği ve sağlık/erişim imkânları öncelikli değerlendirilmelidir.`
    );
  }

  if (state.people_type === 'aile') {
    bullets.push(
      'Yetişkin aile seçimi, çocuklu aile profilinden ayrı değerlendirildi; tempo ve oda planı daha esnek kurgulanabilir.'
    );
  }

  if (vType) {
    bullets.push(`“${vType}” beklentiniz konaklama ve aktivite yoğunluğu seçiminde temel alındı.`);
  }

  if (dates || flex) {
    const seasonNote =
      state.date_flexibility === 'undecided'
        ? 'Tarih esnekliği yüksek; sezon ve doluluk riski fiyat bandını genişletebilir.'
        : flex === '1 hafta esneyebilir' || flex === '1–2 gün esneyebilir'
          ? 'Tarih esnekliğiniz alternatif dönemlerde daha uygun fiyat bulmanıza yardımcı olabilir.'
          : 'Net tarih profiliniz sezon ve doluluk riskini daha öngörülebilir kılar.';
    bullets.push(
      dates
        ? `Seyahat dönemi: ${dates}${flex ? ` · Esneklik: ${flex}` : ''}. ${seasonNote}`
        : `${seasonNote} Yaklaşık dönem: ${state.date_period_note || 'belirtilmedi'}.`
    );
  }

  if (state.trip_nights) {
    bullets.push(`Planlanan süre yaklaşık ${state.trip_nights} gece olarak hesaplandı.`);
  }

  bullets.push(
    `${top?.title || 'Öne çıkan seçenek'} profilinizle uyumlu görünüyor; ${top?.why || 'maliyet ve konfor dengesi gözetildi'}.`
  );

  if (state.user_note) {
    bullets.push(
      `Özel beklentiniz: “${state.user_note.slice(0, 140)}${state.user_note.length > 140 ? '…' : ''}”`
    );
  }

  const summary =
    'Seçimlerinize göre dengeli bir tatil modeli genel olarak daha uygun görünüyor. ' +
    'Aşağıdaki değerlendirme bilgilendirme amaçlıdır; kesin otel, uçuş veya paket fiyatı taahhüdü içermez.';

  return {
    summary,
    bullets,
    caution:
      'Fiyatlar sezona, doluluğa ve partner tekliflerine göre değişebilir. Nihai plan için güncel teklif doğrulaması önerilir.'
  };
}

export function getProgressSummary(state) {
  const budgetVal = getBudgetDisplay(state) || null;
  let peopleVal = state.people_type ? labelForPeople(state.people_type, state.vacation_goal) : null;
  if (state.people_type === 'cocuklu-aile' && (state.children_count || state.children_ages)) {
    const parts = [];
    if (state.children_count) parts.push(`${state.children_count} çocuk`);
    if (state.children_ages) parts.push(`yaş: ${state.children_ages}`);
    peopleVal = `${peopleVal} (${parts.join(', ')})`;
  }

  let dateVal = getDateSummary(state);
  if (getFlexibilityLabel(state)) {
    dateVal = [dateVal, getFlexibilityLabel(state)].filter(Boolean).join(' · ');
  }

  return [
    { key: 'Amaç', value: state.vacation_goal ? labelForGoal(state.vacation_goal) : null },
    { key: 'Bütçe', value: budgetVal },
    {
      key: 'Seyahat grubu',
      value:
        [peopleVal, state.travelers_count ? `${state.travelers_count} kişi` : null]
          .filter(Boolean)
          .join(' · ') || null
    },
    { key: 'Deneyim', value: state.vacation_type ? labelForType(state.vacation_type) : null },
    { key: 'Tarih', value: dateVal || null },
    { key: 'Beklentiler', value: state.expectations?.length ? state.expectations.slice(0, 3).join(', ') : null },
    { key: 'Beklenti', value: state.user_note ? 'Eklendi' : null }
  ];
}

/** Sync derived fields on state before results */
export function syncDerivedState(state) {
  state.trip_nights = computeTripNights(state.date_start, state.date_end);
  if (state.date_start && state.date_end) {
    state.date_range = `${state.date_start} – ${state.date_end}`;
    state.duration = state.trip_nights ? `${state.trip_nights} gece` : '';
  } else if (state.date_period_note) {
    state.date_range = state.date_period_note;
    state.duration = state.duration || '';
  }
  if (state.budget_range === 'manuel' && state.budget_manual) {
    state.budget_label = formatTry(state.budget_manual);
  } else {
    const plan = BUDGET_PLANS.find((p) => p.value === state.budget_range);
    state.budget_label = plan ? `${plan.label} (${plan.range})` : state.budget_range;
  }
}
