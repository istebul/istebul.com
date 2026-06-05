/**
 * Central vehicle image resolution for Auto results.
 * Single source: verified vehicle.image_url → premium placeholder.
 */

export const PREMIUM_VEHICLE_PLACEHOLDER = '/assets/images/auto/vehicle-premium-placeholder.svg';

const GENERIC_IMAGE_PATTERNS = [
  /auto-hero/i,
  /vehicle-premium-placeholder/i,
  /og-image/i,
  /placeholder/i,
  /generic/i,
  /stock[-_]?photo/i,
  /\/demo\//i,
  /unsplash/i,
  /pexels/i
];

const BRAND_ALIASES = {
  volkswagen: ['volkswagen', 'vw'],
  'mercedes-benz': ['mercedes', 'benz'],
  'mercedes': ['mercedes', 'benz'],
  skoda: ['skoda'],
  toyota: ['toyota'],
  honda: ['honda'],
  renault: ['renault'],
  hyundai: ['hyundai'],
  peugeot: ['peugeot'],
  citroen: ['citroen'],
  bmw: ['bmw'],
  audi: ['audi'],
  ford: ['ford'],
  kia: ['kia'],
  nissan: ['nissan'],
  opel: ['opel'],
  fiat: ['fiat'],
  dacia: ['dacia'],
  seat: ['seat'],
  volvo: ['volvo'],
  lexus: ['lexus'],
  mini: ['mini'],
  jeep: ['jeep'],
  mg: ['mg'],
  togg: ['togg'],
  tesla: ['tesla'],
  byd: ['byd']
};

const TRIM_STOPWORDS = new Set([
  'hybrid',
  'electric',
  'business',
  'premium',
  'elite',
  'style',
  'edition',
  'comfort',
  'life',
  'touch',
  'techno',
  'icon',
  'eco',
  'max',
  'easy',
  'journey',
  'prestige',
  'allure',
  'design',
  'luxury',
  'sport',
  'amg',
  'sedan',
  'suv',
  'cross',
  'hatchback',
  'long',
  'range',
  'awd',
  'rwd',
  'fwd',
  'turbo',
  'tsi',
  'tgi',
  'tdi',
  'gdi',
  'v2',
  'v1',
  'plus',
  'pro',
  'gt',
  'fr',
  'gs',
  'm',
  's',
  'x',
  'e',
  'i',
  'ev',
  'phev',
  'stepway',
  'journey'
]);

/**
 * @param {string} name
 */
export function extractVehicleImageTokens(name) {
  const parts = String(name || '')
    .toLowerCase()
    .replace(/^\d{4}\s+/, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1);

  const brand = parts[0] || '';
  const modelTokens = parts.slice(1).filter((token) => !TRIM_STOPWORDS.has(token) && !/^\d/.test(token));

  return { brand, modelTokens };
}

/**
 * @param {string} url
 */
export function isGenericVehicleImage(url) {
  const imageUrl = String(url || '').trim();
  if (!imageUrl) return true;
  return GENERIC_IMAGE_PATTERNS.some((pattern) => pattern.test(imageUrl));
}

/**
 * Verify image URL plausibly matches the vehicle name.
 * @param {string} name
 * @param {string} url
 */
export function vehicleImageMatchesName(name, url) {
  const imageUrl = String(url || '').trim();
  if (!imageUrl || isGenericVehicleImage(imageUrl)) return false;

  const { brand, modelTokens } = extractVehicleImageTokens(name);
  if (!brand) return false;

  const haystack = imageUrl.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const brandAliases = BRAND_ALIASES[brand] || [brand];
  const brandMatch = brandAliases.some((alias) => haystack.includes(alias));
  if (!brandMatch) return false;

  if (!modelTokens.length) return true;

  return modelTokens.some((token) => haystack.includes(token));
}

/** @param {object|null|undefined} vehicle */
export function resolveVehicleImageUrl(vehicle) {
  const url = String(vehicle?.image_url || '').trim();
  if (!url) return PREMIUM_VEHICLE_PLACEHOLDER;
  if (!vehicleImageMatchesName(vehicle?.name, url)) return PREMIUM_VEHICLE_PLACEHOLDER;
  return url;
}

/**
 * @param {object|null|undefined} vehicle
 * @param {(s: unknown) => string} esc
 * @param {{ className?: string, loading?: string, width?: number, height?: number }} [opts]
 */
export function renderVehicleImageHtml(vehicle, esc, opts = {}) {
  const {
    className = '',
    loading = 'lazy',
    width = 640,
    height = 360
  } = opts;
  const url = resolveVehicleImageUrl(vehicle);
  const alt = String(vehicle?.name || 'Araç görseli');
  const cls = className ? ` class="${esc(className)}"` : '';
  return `<img src="${esc(url)}" alt="${esc(alt)}"${cls} loading="${esc(loading)}" decoding="async" width="${width}" height="${height}">`;
}

/**
 * Normalize vehicle reference for recommendation UI.
 * @param {object} vehicle
 */
export function toRecommendationVehicle(vehicle) {
  if (!vehicle || typeof vehicle !== 'object') {
    return { name: '', image_url: null, imageUrl: PREMIUM_VEHICLE_PLACEHOLDER };
  }
  return {
    ...vehicle,
    imageUrl: resolveVehicleImageUrl(vehicle)
  };
}
