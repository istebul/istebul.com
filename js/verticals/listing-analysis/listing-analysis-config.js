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

export const LISTING_ANALYSIS_LEGAL_NOTICE =
  'Bu analiz yalnızca bilgilendirme amaçlıdır; değerleme, ekspertiz, yatırım, finansal veya hukuki tavsiye değildir. İsteBul, üçüncü taraf ilan platformlarıyla bağlantılı değildir. İlan bağlantısı kullanıcı tarafından sağlanır; bu aşamada üçüncü taraf sitelerden otomatik veri çekilmez. Girilen bilgiler kullanıcının beyanına göre değerlendirilir.';

export const LISTING_ANALYSIS_KVKK_NOTE =
  'İlan bağlantısı ve form alanları analiz sonucunu üretmek, kaliteyi ölçmek ve hizmeti geliştirmek amacıyla işlenebilir. Satıcı adı, telefon, görsel veya özel nitelikli kişisel veri girilmemelidir.';

export const LISTING_URL_HELP_TEXT =
  'Bağlantı yalnızca analiz kaynağı olarak saklanır. Bu aşamada üçüncü taraf siteden otomatik veri çekilmez.';

export const LISTING_URL_PLACEHOLDER =
  'Sahibinden, Arabam, Emlakjet, Hepsiemlak veya başka bir ilan bağlantısı';

export const LISTING_SOURCE_NOTE =
  'Bu bağlantıdan otomatik veri çekilmemiştir; analiz kullanıcı tarafından girilen alanlara göre yapılmıştır.';

export const LISTING_ANALYSIS_DOM_IDS = {
  form: 'listing-analysis-form',
  results: 'listing-analysis-results',
  flow: 'listing-analysis-flow',
  tabVehicle: 'listing-tab-vehicle',
  tabHousing: 'listing-tab-housing',
  panelVehicle: 'listing-panel-vehicle',
  panelHousing: 'listing-panel-housing',
  submit: 'listing-analysis-submit',
  heroCta: 'listing-analysis-hero-cta',
  listingUrl: 'listing-url-input'
};

export function createEmptyVehicleInput() {
  return {
    listing_url: '',
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
    listing_url: '',
    il: '',
    ilce: '',
    metrekare: '',
    oda_sayisi: '',
    bina_yasi: '',
    fiyat: '',
    kullanim_amaci: 'oturum'
  };
}
