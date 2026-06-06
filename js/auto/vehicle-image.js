/**
 * Central vehicle image resolution for Auto results.
 * Resolution chain: verified image_url → local catalog asset → default fallback.
 */

export const DEFAULT_VEHICLE_FALLBACK = '/assets/images/auto/vehicle-premium-placeholder.svg';
export const PREMIUM_VEHICLE_PLACEHOLDER = DEFAULT_VEHICLE_FALLBACK;

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

/** Local SVG assets keyed by vehicle name patterns (no external CDN, no debug JPG overlays). */
const LOCAL_VEHICLE_ASSET_RULES = [
  { pattern: /toyota.*corolla.*cross/i, path: '/assets/images/auto/toyota-corolla-cross-hybrid.svg' },
  { pattern: /toyota.*c[\s-]?hr/i, path: '/assets/images/auto/toyota-corolla-cross-hybrid.svg' },
  { pattern: /toyota.*corolla.*sedan/i, path: '/assets/images/auto/toyota-corolla-cross-hybrid.svg' },
  { pattern: /toyota.*corolla/i, path: '/assets/images/auto/toyota-corolla-cross-hybrid.svg' },
  { pattern: /volkswagen.*golf/i, path: '/assets/images/auto/volkswagen-golf-tsi.svg' },
  { pattern: /volkswagen.*t[\s-]?roc/i, path: '/assets/images/auto/volkswagen-golf-tsi.svg' },
  { pattern: /renault.*clio/i, path: '/assets/images/auto/renault-clio-icon.svg' },
  { pattern: /hyundai.*i20/i, path: '/assets/images/auto/hyundai-tucson-tgdi.svg' },
  { pattern: /hyundai.*tucson/i, path: '/assets/images/auto/hyundai-tucson-tgdi.svg' },
  { pattern: /mercedes.*c\s*200/i, path: '/assets/images/auto/mercedes-premium.svg' },
  { pattern: /bmw.*320/i, path: '/assets/images/auto/bmw-premium.svg' },
  { pattern: /opel.*corsa/i, path: '/assets/images/auto/renault-clio-icon.svg' },
  { pattern: /peugeot/i, path: '/assets/images/auto/peugeot-suv.svg' },
  { pattern: /citroen/i, path: '/assets/images/auto/peugeot-suv.svg' },
  { pattern: /seat.*leon/i, path: DEFAULT_VEHICLE_FALLBACK },
  { pattern: /tesla.*model/i, path: '/assets/images/auto/tesla-model.svg' },
  { pattern: /togg.*t10/i, path: '/assets/images/auto/togg-t10x.svg' },
  { pattern: /audi.*a3/i, path: '/assets/images/auto/skoda-family.svg' },
  { pattern: /volvo/i, path: DEFAULT_VEHICLE_FALLBACK },
  { pattern: /honda.*civic/i, path: '/assets/images/auto/honda-civic-eco.svg' },
  { pattern: /volkswagen|vw/i, path: '/assets/images/auto/volkswagen-golf-tsi.svg' },
  { pattern: /skoda/i, path: '/assets/images/auto/skoda-family.svg' },
  { pattern: /renault/i, path: '/assets/images/auto/renault-clio-icon.svg' },
  { pattern: /mercedes/i, path: '/assets/images/auto/mercedes-premium.svg' },
  { pattern: /bmw/i, path: '/assets/images/auto/bmw-premium.svg' },
  { pattern: /byd/i, path: '/assets/images/auto/byd-electric.svg' },
  { pattern: /togg/i, path: '/assets/images/auto/togg-t10x.svg' },
  { pattern: /tesla/i, path: '/assets/images/auto/tesla-model.svg' }
];

const BRAND_ALIASES = {
  volkswagen: ['volkswagen', 'vw'],
  'mercedes-benz': ['mercedes', 'benz'],
  mercedes: ['mercedes', 'benz'],
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

/**
 * Resolve bundled static asset for a vehicle name.
 * @param {string} name
 */
export function resolveLocalVehicleAsset(name) {
  const vehicleName = String(name || '').trim();
  if (!vehicleName) return null;

  for (const rule of LOCAL_VEHICLE_ASSET_RULES) {
    if (rule.pattern.test(vehicleName)) return rule.path;
  }
  return null;
}

/** @param {object|null|undefined} vehicle */
export function resolveVehicleImageUrl(vehicle) {
  const url = String(vehicle?.image_url || '').trim();
  if (url && vehicleImageMatchesName(vehicle?.name, url)) return url;

  const localAsset = resolveLocalVehicleAsset(vehicle?.name);
  if (localAsset) return localAsset;

  return DEFAULT_VEHICLE_FALLBACK;
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
  const vehicleName = String(vehicle?.name || '');
  return `<img src="${esc(url)}" alt="${esc(alt)}"${cls} data-vehicle-image="1" data-fallback-src="${esc(DEFAULT_VEHICLE_FALLBACK)}" data-vehicle-name="${esc(vehicleName)}" loading="${esc(loading)}" decoding="async" width="${width}" height="${height}">`;
}

/**
 * Attach runtime error fallback (CSP-safe — no inline onerror).
 * @param {ParentNode|null|undefined} root
 */
export function bindVehicleImageFallbacks(root) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll('img[data-vehicle-image]').forEach((img) => {
    if (img.dataset.fallbackBound === '1') return;
    img.dataset.fallbackBound = '1';

    img.addEventListener('error', () => {
      if (img.dataset.fallbackApplied === '1') return;
      const fallback = img.dataset.fallbackSrc || DEFAULT_VEHICLE_FALLBACK;
      if (!fallback || img.src.endsWith(fallback)) return;
      img.dataset.fallbackApplied = '1';
      img.src = fallback;
    });
  });
}

/**
 * Console report for vehicle image loading diagnostics.
 * @param {ParentNode|null|undefined} root
 */
export function reportVehicleImageLoading(root) {
  if (!root?.querySelectorAll) return [];

  const imgs = [...root.querySelectorAll('img[data-vehicle-image]')];
  const report = [];

  const record = (img) => {
    const entry = {
      vehicle: img.dataset.vehicleName || img.alt || 'unknown',
      src: img.currentSrc || img.src,
      resolved: img.dataset.fallbackApplied === '1' ? 'fallback' : 'primary',
      ok: img.complete && img.naturalWidth > 0
    };
    report.push(entry);
    if (!entry.ok) {
      console.warn('[Auto V2] vehicle image load failed:', entry);
    }
  };

  imgs.forEach((img) => {
    if (img.complete) record(img);
    else {
      img.addEventListener('load', () => record(img), { once: true });
      img.addEventListener('error', () => record(img), { once: true });
    }
  });

  if (report.length === imgs.length) {
    console.info('[Auto V2] vehicle image loading report:', report);
  } else {
    queueMicrotask(() => {
      if (report.length === imgs.length) {
        console.info('[Auto V2] vehicle image loading report:', report);
      }
    });
  }

  return report;
}

/**
 * Normalize vehicle reference for recommendation UI.
 * @param {object} vehicle
 */
export function toRecommendationVehicle(vehicle) {
  if (!vehicle || typeof vehicle !== 'object') {
    return { name: '', image_url: null, imageUrl: DEFAULT_VEHICLE_FALLBACK };
  }
  return {
    ...vehicle,
    imageUrl: resolveVehicleImageUrl(vehicle)
  };
}
