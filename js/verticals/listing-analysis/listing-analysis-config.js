/**
 * AI İlan Analizi V1 — yapılandırma (izole modül).
 */

export const LISTING_ANALYSIS_TYPES = {
  vehicle: 'vehicle',
  housing: 'housing'
};

export const VEHICLE_FUEL_OPTIONS = [
  { value: 'benzin', label: 'Benzin' },
  { value: 'dizel', label: 'Dizel' },
  { value: 'lpg', label: 'LPG' },
  { value: 'hibrit', label: 'Hibrit' },
  { value: 'elektrik', label: 'Elektrik' }
];

export const HOUSING_USAGE_OPTIONS = [
  { value: 'oturum', label: 'Oturum' },
  { value: 'yatirim', label: 'Yatırım' },
  { value: 'belirsiz', label: 'Belirsiz' }
];

export const LISTING_ANALYSIS_DISCLAIMER =
  'Bilgilendirme amaçlıdır · bağlayıcı değerlendirme veya finansal tavsiye değildir.';

export const LISTING_ANALYSIS_DOM_IDS = {
  form: 'listing-analysis-form',
  results: 'listing-analysis-results',
  flow: 'listing-analysis-flow',
  tabVehicle: 'listing-tab-vehicle',
  tabHousing: 'listing-tab-housing',
  panelVehicle: 'listing-panel-vehicle',
  panelHousing: 'listing-panel-housing',
  submit: 'listing-analysis-submit',
  heroCta: 'listing-analysis-hero-cta'
};

export function createEmptyVehicleInput() {
  return {
    marka: '',
    model: '',
    yil: '',
    km: '',
    yakit_turu: 'benzin',
    fiyat: '',
    il: ''
  };
}

export function createEmptyHousingInput() {
  return {
    il: '',
    ilce: '',
    metrekare: '',
    oda_sayisi: '',
    bina_yasi: '',
    fiyat: '',
    kullanim_amaci: 'oturum'
  };
}
