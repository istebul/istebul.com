/** Kasko karar analizi — sihirbaz adımları ve seçenekler */

export const KASKO_STEP_DEFS = Object.freeze({
  vehicle: {
    id: 'vehicle',
    label: 'Araç',
    title: 'Araç profiliniz',
    subtitle: 'Araç tipi ve yaşı teminat ve prim bandını etkiler.'
  },
  driver: {
    id: 'driver',
    label: 'Sürücü',
    title: 'Sürücü ve kullanım',
    subtitle: 'Ehliyet süresi ve kullanım tipi risk modeline girer.'
  },
  coverage: {
    id: 'coverage',
    label: 'Teminat',
    title: 'Kasko kapsam seviyesi',
    subtitle: 'Mini, standart veya geniş teminat tercihiniz.'
  },
  risk: {
    id: 'risk',
    label: 'Risk',
    title: 'Risk algınız',
    subtitle: 'Muafiyet ve limit tercihleri için referans.'
  },
  budget: {
    id: 'budget',
    label: 'Bütçe',
    title: 'Prim bütçesi',
    subtitle: 'Yıllık prim bandı ve maliyet verimliliği hesaplanır.'
  }
});

export const KASKO_STEPS = [
  KASKO_STEP_DEFS.vehicle,
  KASKO_STEP_DEFS.driver,
  KASKO_STEP_DEFS.coverage,
  KASKO_STEP_DEFS.risk,
  KASKO_STEP_DEFS.budget
];

export const KASKO_OPTIONS = {
  vehicle_category: [
    { value: 'otomobil', label: 'Otomobil' },
    { value: 'suv', label: 'SUV / crossover' },
    { value: 'ticari', label: 'Ticari araç' }
  ],
  vehicle_year_band: [
    { value: '0-3', label: '0–3 yaş', description: 'Sıfır / yeni' },
    { value: '4-10', label: '4–10 yaş', description: 'Orta yaş' },
    { value: '11plus', label: '11+ yaş', description: 'Eski model' }
  ],
  license_years: [
    { value: '0-2', label: '0–2 yıl' },
    { value: '3-10', label: '3–10 yıl' },
    { value: '11plus', label: '11+ yıl' }
  ],
  usage_type: [
    { value: 'ozel', label: 'Özel kullanım' },
    { value: 'ticari', label: 'Ticari / iş' }
  ],
  coverage_level: [
    { value: 'mini', label: 'Mini kasko', description: 'Temel hasar koruması' },
    { value: 'standard', label: 'Standart kasko', description: 'Dengeli teminat' },
    { value: 'full', label: 'Geniş kasko', description: 'Üst limit ve ek teminatlar' }
  ],
  risk_perception: [
    { value: 'dusuk', label: 'Düşük' },
    { value: 'orta', label: 'Orta' },
    { value: 'yuksek', label: 'Yüksek' }
  ],
  budget_level: [
    { value: 'dusuk', label: 'Ekonomik' },
    { value: 'orta', label: 'Dengeli' },
    { value: 'yuksek', label: 'Üst segment' }
  ]
};

export const KASKO_DISCLAIMER =
  'Kasko skorları bilgilendirme amaçlıdır; bağlayıcı poliçe teklifi sigorta şirketine aittir.';

export function optionLabel(mapKey, value) {
  return KASKO_OPTIONS[mapKey]?.find((o) => o.value === value)?.label || value || '';
}
