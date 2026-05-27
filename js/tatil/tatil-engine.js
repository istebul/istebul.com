import { RESULT_BADGES, STEP_OPTIONS } from './tatil-config.js';

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

const BUDGET_COST = {
  '0-30K': '18.000 – 28.000 ₺',
  '30-60K': '32.000 – 55.000 ₺',
  '60-100K': '58.000 – 92.000 ₺',
  '100K+': '95.000 – 140.000 ₺'
};

function labelFor(stepId, value) {
  const opts = STEP_OPTIONS[stepId] || [];
  return opts.find((o) => o.value === value)?.label || value || 'Belirtilmedi';
}

function baseScore(state) {
  let score = 62;
  if (state.budget_range === '100K+') score += 12;
  else if (state.budget_range === '60-100K') score += 8;
  else if (state.budget_range === '30-60K') score += 4;
  if (state.vacation_goal === 'luks' || state.vacation_goal === 'balayi') score += 6;
  if (state.people_type === 'cocuklu-aile') score += 4;
  if (state.vacation_type === 'her-sey-dahil') score += 5;
  if (state.duration === '7-10' || state.duration === '10+') score += 3;
  return Math.min(score, 88);
}

function mapScenarioToResult(scenario, badgeKey, state, scoreOffset) {
  const badge = RESULT_BADGES[badgeKey] || RESULT_BADGES.logical;
  const cfg = scenario.config && typeof scenario.config === 'object' ? scenario.config : {};
  const score = Math.min(100, baseScore(state) + scoreOffset);

  const pros = [];
  const cautions = [];

  if (state.people_type === 'cocuklu-aile' || state.people_type === 'aile') {
    pros.push('Çocuk dostu konaklama profiline uygun görünüyor');
  }
  if (state.vacation_type === 'deniz' || state.vacation_type === 'her-sey-dahil') {
    pros.push('Deniz ve paket tatil beklentisiyle örtüşebilir');
  }
  if (badgeKey === 'economic') {
    pros.push('Bütçe aralığınızla uyumlu ekonomik profil');
    cautions.push('Sezon içi fiyat dalgalanması olabilir');
  }
  if (badgeKey === 'comfort') {
    pros.push('Konfor ve sakin tempo için uygun profil');
    cautions.push('Özel dönemlerde müsaitlik sınırlı olabilir');
  }
  if (badgeKey === 'logical') {
    pros.push('Profilinizle dengeli maliyet–konfor dengesi');
  }
  cautions.push('Kesin fiyat veya otel adı yerine tahmini aralık sunulur');

  const fitLabels = {
    tek: 'Yalnız gezginler',
    cift: 'Çiftler',
    aile: 'Aileler',
    'cocuklu-aile': 'Çocuklu aileler'
  };

  return {
    id: scenario.slug,
    title: scenario.title,
    description: scenario.description || '',
    image_url: scenario.image_url || '/assets/images/placeholder.svg',
    badge,
    score,
    estimatedCost: BUDGET_COST[state.budget_range] || 'Profilinize göre değişir',
    audience: fitLabels[state.people_type] || 'Genel profil',
    pros,
    cautions,
    region: cfg.region || ''
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

export function buildAiCommentary(state, results) {
  const goal = labelFor('goal', state.vacation_goal);
  const budget = labelFor('budget', state.budget_range);
  const people = labelFor('people', state.people_type);
  const vType = labelFor('type', state.vacation_type);
  const top = results[0];

  const bullets = [
    `${goal} profiliniz için ${top?.title || 'önerilen bölge'} genel olarak uyumlu görünüyor.`,
    `${people} ve ${vType} tercihleri, konaklama tipi seçiminde yol gösterici olabilir.`,
    `${budget} bütçe bandında tahmini maliyet aralığı sunuldu; kesin fiyat teklifi için partner onayı gerekir.`
  ];

  if (state.user_note) {
    bullets.push(`Notunuz dikkate alındı: “${state.user_note.slice(0, 120)}${state.user_note.length > 120 ? '…' : ''}”`);
  }

  return {
    summary:
      'Aşağıdaki öneriler, verdiğiniz yanıtlara göre oluşturulmuş tahmini karar özetidir. ' +
      'Kesin otel, uçuş veya paket fiyatı taahhüdü içermez.',
    bullets,
    caution:
      'Sezon, doluluk ve kampanya koşulları fiyatları değiştirebilir. Nihai teklif için partner doğrulaması önerilir.'
  };
}

export function getProgressSummary(state) {
  return [
    { key: 'Amaç', value: state.vacation_goal ? labelFor('goal', state.vacation_goal) : null },
    { key: 'Bütçe', value: state.budget_range ? labelFor('budget', state.budget_range) : null },
    { key: 'Kişi', value: state.people_type ? labelFor('people', state.people_type) : null },
    { key: 'Tip', value: state.vacation_type ? labelFor('type', state.vacation_type) : null },
    {
      key: 'Tarih',
      value: state.date_range || state.duration ? [state.date_range, state.duration && labelFor('duration', state.duration)].filter(Boolean).join(' · ') : null
    },
    { key: 'Not', value: state.user_note ? 'Eklendi' : null }
  ];
}
