/** @typedef {{ id: string, label: string, title: string, subtitle: string }} SigortaStep */

export const SIGORTA_STEP_DEFS = Object.freeze({
  type: {
    id: 'type',
    label: 'Tür',
    title: 'Hangi sigorta korumasına ihtiyaç duyuyorsunuz?',
    subtitle: 'Analiz, seçtiğiniz ürün ailesine göre özelleştirilir.'
  },
  driver: {
    id: 'driver',
    label: 'Sürücü',
    title: 'Sürücü ve kullanım bilgileri',
    subtitle: 'Trafik ve kasko prim bandı için temel girdiler.'
  },
  vehicle: {
    id: 'vehicle',
    label: 'Araç',
    title: 'Araç profili',
    subtitle: 'Araç tipi ve yaşı teminat seçeneklerini etkiler.'
  },
  property: {
    id: 'property',
    label: 'Konut',
    title: 'Konut bilgileri',
    subtitle: 'DASK, yangın ve eşya teminatı için.'
  },
  profile: {
    id: 'profile',
    label: 'Profil',
    title: 'Yaş bilgisi',
    subtitle: 'Sağlık prim bandı ve yaş grubu teminatı için.'
  },
  dependents: {
    id: 'dependents',
    label: 'Bağımlılar',
    title: 'Bakmakla yükümlü olduğunuz kişiler',
    subtitle: 'Aile paketi ve çocuk teminatı için (yoksa “Çocuk yok” seçin).'
  },
  occupancy: {
    id: 'occupancy',
    label: 'Konut hane',
    title: 'Konutta yaşayanlar',
    subtitle: 'Kişi sayısı DASK ve eşya teminat limitini etkiler.'
  },
  trip: {
    id: 'trip',
    label: 'Seyahat',
    title: 'Seyahat detayları',
    subtitle: 'Yolcu sayısı ve süre prim bandını belirler.'
  },
  risk: {
    id: 'risk',
    label: 'Risk',
    title: 'Risk algınız',
    subtitle: 'Koruma seviyesi ve teminat derinliği bu tercihe göre ayarlanır.'
  },
  budget: {
    id: 'budget',
    label: 'Bütçe',
    title: 'Bütçe seviyesi',
    subtitle: 'Prim–teminat dengesi ve maliyet verimliliği hesaplanır.'
  }
});

const FLOW_BY_TYPE = Object.freeze({
  arac: ['type', 'driver', 'vehicle', 'risk', 'budget'],
  konut: ['type', 'property', 'occupancy', 'risk', 'budget'],
  saglik: ['type', 'profile', 'dependents', 'risk', 'budget'],
  seyahat: ['type', 'trip', 'risk', 'budget']
});

/**
 * @param {string} [insuranceType]
 * @returns {SigortaStep[]}
 */
export function getSigortaSteps(insuranceType) {
  const ids = insuranceType ? FLOW_BY_TYPE[insuranceType] || ['type'] : ['type'];
  return ids.map((id) => SIGORTA_STEP_DEFS[id]).filter(Boolean);
}

/** @deprecated — use getSigortaSteps(type); kept for tests/imports */
export const SIGORTA_STEPS = getSigortaSteps('saglik');

export const SIGORTA_OPTIONS = {
  insurance_type: [
    { value: 'arac', label: 'Araç', description: 'Trafik, kasko ve sorumluluk' },
    { value: 'konut', label: 'Konut', description: 'DASK, yangın ve eşya' },
    { value: 'saglik', label: 'Sağlık', description: 'Tamamlayıcı / özel sağlık' },
    { value: 'seyahat', label: 'Seyahat', description: 'Yurt içi / yurt dışı seyahat' }
  ],
  marital_status: [
    { value: 'bekar', label: 'Bekâr' },
    { value: 'evli', label: 'Evli' },
    { value: 'bosanmis', label: 'Boşanmış' },
    { value: 'diger', label: 'Diğer' }
  ],
  children_count: [
    { value: '0', label: 'Çocuk yok' },
    { value: '1', label: '1 çocuk' },
    { value: '2', label: '2 çocuk' },
    { value: '3plus', label: '3 ve üzeri' }
  ],
  license_years: [
    { value: '0-2', label: '0–2 yıl', description: 'Yeni ehliyet' },
    { value: '3-10', label: '3–10 yıl', description: 'Deneyimli' },
    { value: '11plus', label: '11+ yıl', description: 'Uzun süreli' }
  ],
  usage_type: [
    { value: 'ozel', label: 'Özel kullanım', description: 'Günlük / bireysel' },
    { value: 'ticari', label: 'Ticari kullanım', description: 'İş / filo' }
  ],
  vehicle_category: [
    { value: 'otomobil', label: 'Otomobil' },
    { value: 'motosiklet', label: 'Motosiklet' },
    { value: 'ticari_arac', label: 'Ticari araç' }
  ],
  vehicle_year_band: [
    { value: '0-3', label: '0–3 yaş', description: 'Sıfır / yeni' },
    { value: '4-10', label: '4–10 yaş', description: 'Orta yaş' },
    { value: '11plus', label: '11+ yaş', description: 'Eski model' }
  ],
  property_role: [
    { value: 'malik', label: 'Malik', description: 'Mülk sahibiyim' },
    { value: 'kiraci', label: 'Kiracı', description: 'Kiracıyım' }
  ],
  property_type: [
    { value: 'daire', label: 'Daire' },
    { value: 'mustakil', label: 'Müstakil' }
  ],
  destination_type: [
    { value: 'yurtici', label: 'Yurt içi' },
    { value: 'yurtdisi', label: 'Yurt dışı' },
    { value: 'schengen', label: 'Schengen / AB' }
  ],
  trip_duration: [
    { value: '1-7', label: '1–7 gün' },
    { value: '8-15', label: '8–15 gün' },
    { value: '16plus', label: '16+ gün' }
  ],
  traveler_count: [
    { value: '1', label: '1 kişi' },
    { value: '2', label: '2 kişi' },
    { value: '3', label: '3 kişi' },
    { value: '4plus', label: '4 ve üzeri' }
  ],
  residents_count: [
    { value: '1', label: '1 kişi' },
    { value: '2', label: '2 kişi' },
    { value: '3', label: '3 kişi' },
    { value: '4plus', label: '4 ve üzeri' }
  ],
  risk_perception: [
    { value: 'dusuk', label: 'Düşük', description: 'Temel koruma yeterli' },
    { value: 'orta', label: 'Orta', description: 'Dengeli teminat' },
    { value: 'yuksek', label: 'Yüksek', description: 'Geniş kapsam tercih ederim' }
  ],
  budget_level: [
    { value: 'dusuk', label: 'Ekonomik', description: 'Zorunlu / temel paket' },
    { value: 'orta', label: 'Dengeli', description: 'Standart teminat' },
    { value: 'yuksek', label: 'Geniş', description: 'Üst segment koruma' }
  ]
};

export const SIGORTA_DISCLAIMER =
  'Sigorta analizi bilgilendirme amaçlıdır; bağlayıcı poliçe koşulları sigorta şirketine aittir. Finansal tavsiye değildir.';

export const SIGORTA_INTEREST_CTAS = [
  {
    id: 'quote',
    interestType: 'insurance_quote',
    label: 'Teklif al',
    description: 'Profilinize uygun prim bandı için bilgilendirme'
  },
  {
    id: 'review',
    interestType: 'insurance_review',
    label: 'Poliçe incelemesi',
    description: 'Mevcut poliçenizin teminat analizi'
  },
  {
    id: 'consultation',
    interestType: 'insurance_consultation',
    label: 'Danışman görüşmesi',
    description: 'Sigorta uzmanı ile kısa görüşme talebi'
  }
];

const TYPE_ONLY_FIELDS = [
  'license_years',
  'usage_type',
  'vehicle_category',
  'vehicle_year_band',
  'property_role',
  'property_type',
  'destination_type',
  'trip_duration',
  'traveler_count',
  'residents_count'
];

/**
 * Tür değişince diğer dallara ait alanları temizler.
 * @param {Record<string, unknown>} state
 * @param {string} [prevType]
 */
export function resetSigortaFieldsForTypeChange(state, prevType) {
  if (!state || state.insurance_type === prevType) return;
  TYPE_ONLY_FIELDS.forEach((key) => {
    state[key] = '';
  });
  const type = state.insurance_type;
  state.marital_status = '';
  state.children_count = '';
  state.residents_count = '';

  if (type === 'arac') {
    state.property_role = '';
    state.property_type = '';
    state.destination_type = '';
    state.trip_duration = '';
    state.traveler_count = '';
  } else if (type === 'konut') {
    state.license_years = '';
    state.usage_type = '';
    state.vehicle_category = '';
    state.vehicle_year_band = '';
    state.destination_type = '';
    state.trip_duration = '';
    state.traveler_count = '';
  } else if (type === 'saglik') {
    state.license_years = '';
    state.usage_type = '';
    state.vehicle_category = '';
    state.vehicle_year_band = '';
    state.property_role = '';
    state.property_type = '';
    state.destination_type = '';
    state.trip_duration = '';
    state.traveler_count = '';
    state.residents_count = '';
  } else if (type === 'seyahat') {
    state.license_years = '';
    state.usage_type = '';
    state.vehicle_category = '';
    state.vehicle_year_band = '';
    state.property_role = '';
    state.property_type = '';
  }
}

/**
 * Tür değişince adım indeksini yeni akışa hizalar (eski adım kimliğinde takılmayı önler).
 * @param {Record<string, unknown>} state
 * @param {string} [prevType]
 */
export function syncSigortaStepIndexAfterTypeChange(state, prevType) {
  const steps = getSigortaSteps(state.insurance_type);
  if (!steps.length) {
    state.stepIndex = 0;
    return;
  }
  if (prevType && prevType !== state.insurance_type) {
    state.stepIndex = Math.min(1, steps.length - 1);
    return;
  }
  const current = steps[state.stepIndex];
  const allowed = new Set(steps.map((s) => s.id));
  if (!current || current.id === 'type') {
    if (state.stepIndex > 0) state.stepIndex = Math.min(1, steps.length - 1);
    return;
  }
  if (!allowed.has(current.id)) {
    state.stepIndex = Math.min(1, steps.length - 1);
  }
  if (state.stepIndex >= steps.length) {
    state.stepIndex = steps.length - 1;
  }
}
