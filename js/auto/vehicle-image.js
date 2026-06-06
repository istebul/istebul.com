/**
 * Central vehicle image resolution for Auto results.
 * Resolution chain: verified image_url → photo catalog → local SVG → segment fallback → premium placeholder.
 */

export const DEFAULT_VEHICLE_FALLBACK = '/assets/images/auto/vehicle-premium-placeholder.svg';
export const PREMIUM_VEHICLE_PLACEHOLDER = DEFAULT_VEHICLE_FALLBACK;

const VEHICLE_PHOTOS_BASE = '/assets/images/vehicles';

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

/** Bundled JPG/WebP photo catalog (production-copied via assets/). */
const VEHICLE_PHOTO_RULES = [
  { pattern: /toyota.*corolla.*cross/i, path: `${VEHICLE_PHOTOS_BASE}/toyota-corolla-cross-hybrid.jpg` },
  { pattern: /toyota.*corolla.*sedan/i, path: `${VEHICLE_PHOTOS_BASE}/toyota-corolla-sedan-hybrid.jpg` },
  { pattern: /toyota.*c[\s-]?hr/i, path: `${VEHICLE_PHOTOS_BASE}/toyota-chr-hybrid.jpg` },
  { pattern: /toyota.*corolla/i, path: `${VEHICLE_PHOTOS_BASE}/toyota-corolla-cross-hybrid.jpg` },
  { pattern: /volkswagen.*golf/i, path: `${VEHICLE_PHOTOS_BASE}/volkswagen-golf.jpg` },
  { pattern: /volkswagen.*t[\s-]?roc/i, path: `${VEHICLE_PHOTOS_BASE}/volkswagen-troc.jpg` },
  { pattern: /renault.*clio/i, path: `${VEHICLE_PHOTOS_BASE}/renault-clio.jpg` },
  { pattern: /hyundai.*i20/i, path: `${VEHICLE_PHOTOS_BASE}/hyundai-i20.jpg` },
  { pattern: /mercedes.*c\s*200/i, path: `${VEHICLE_PHOTOS_BASE}/mercedes-c200.jpg` },
  { pattern: /bmw.*320/i, path: `${VEHICLE_PHOTOS_BASE}/bmw-320i.jpg` },
  { pattern: /opel.*corsa/i, path: `${VEHICLE_PHOTOS_BASE}/opel-corsa.jpg` },
  { pattern: /peugeot.*308|peugeot.*208|peugeot.*2008|peugeot.*3008/i, path: `${VEHICLE_PHOTOS_BASE}/peugeot-208.jpg` },
  { pattern: /peugeot/i, path: `${VEHICLE_PHOTOS_BASE}/peugeot-208.jpg` },
  { pattern: /citroen.*c4|citroen.*c3|citroen.*c5/i, path: `${VEHICLE_PHOTOS_BASE}/peugeot-208.jpg` },
  { pattern: /citroen/i, path: `${VEHICLE_PHOTOS_BASE}/peugeot-208.jpg` },
  { pattern: /skoda.*kamiq|skoda.*karoq|skoda.*octavia|skoda.*fabia|skoda.*scala/i, path: `${VEHICLE_PHOTOS_BASE}/audi-a3.jpg` },
  { pattern: /skoda/i, path: `${VEHICLE_PHOTOS_BASE}/audi-a3.jpg` },
  { pattern: /seat.*leon|seat.*ibiza|seat.*arona/i, path: `${VEHICLE_PHOTOS_BASE}/volkswagen-golf.jpg` },
  { pattern: /seat/i, path: `${VEHICLE_PHOTOS_BASE}/volkswagen-golf.jpg` },
  { pattern: /tesla.*model/i, path: `${VEHICLE_PHOTOS_BASE}/tesla-model-3.jpg` },
  { pattern: /togg.*t10/i, path: `${VEHICLE_PHOTOS_BASE}/togg-t10x.jpg` },
  { pattern: /audi.*a3/i, path: `${VEHICLE_PHOTOS_BASE}/audi-a3.jpg` },
  { pattern: /volvo/i, path: `${VEHICLE_PHOTOS_BASE}/volvo-xc60.jpg` },
  { pattern: /range.*rover/i, path: `${VEHICLE_PHOTOS_BASE}/range-rover-evoque.jpg` }
];

/** Local SVG assets keyed by vehicle name patterns. */
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
  { pattern: /peugeot.*308|peugeot.*208|peugeot.*2008|peugeot.*3008/i, path: '/assets/images/auto/peugeot-suv.svg' },
  { pattern: /peugeot/i, path: '/assets/images/auto/peugeot-suv.svg' },
  { pattern: /citroen.*c4|citroen.*c3/i, path: '/assets/images/auto/peugeot-suv.svg' },
  { pattern: /citroen/i, path: '/assets/images/auto/peugeot-suv.svg' },
  { pattern: /skoda.*kamiq|skoda.*karoq/i, path: '/assets/images/auto/skoda-family.svg' },
  { pattern: /seat.*leon/i, path: '/assets/images/auto/volkswagen-golf-tsi.svg' },
  { pattern: /seat/i, path: '/assets/images/auto/volkswagen-golf-tsi.svg' },
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

const SEGMENT_FALLBACKS = Object.freeze({
  suv: '/assets/images/auto/peugeot-suv.svg',
  crossover: '/assets/images/auto/peugeot-suv.svg',
  hatchback: '/assets/images/auto/renault-clio-icon.svg',
  sedan: '/assets/images/auto/toyota-corolla-cross-hybrid.svg',
  electric: '/assets/images/auto/tesla-model.svg',
  hybrid: '/assets/images/auto/toyota-corolla-cross-hybrid.svg',
  premium: '/assets/images/auto/mercedes-premium.svg',
  family: '/assets/images/auto/skoda-family.svg',
  default: `${VEHICLE_PHOTOS_BASE}/default-vehicle.webp`
});

const BRAND_ALIASES = {
  volkswagen: ['volkswagen', 'vw'],
  'mercedes-benz': ['mercedes', 'benz'],
  mercedes: ['mercedes', 'benz'],
  skoda: ['skoda', 'škoda'],
  toyota: ['toyota'],
  honda: ['honda'],
  renault: ['renault'],
  hyundai: ['hyundai'],
  peugeot: ['peugeot'],
  citroen: ['citroen', 'citroën'],
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
 * Normalize slug for image matching (Turkish chars, spaces, accents).
 * @param {unknown} value
 */
export function normalizeVehicleImageSlug(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Ensure a safe, non-empty image URL.
 * @param {unknown} url
 */
export function assertVehicleImageUrl(url) {
  const imageUrl = String(url ?? '').trim();
  if (!imageUrl || imageUrl === 'undefined' || imageUrl === 'null') {
    return DEFAULT_VEHICLE_FALLBACK;
  }
  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith('/')) {
    return imageUrl;
  }
  return DEFAULT_VEHICLE_FALLBACK;
}

function normalizeVehicleName(name) {
  return normalizeVehicleImageSlug(name).replace(/-/g, ' ');
}

/**
 * @param {string} name
 */
export function extractVehicleImageTokens(name) {
  const normalized = normalizeVehicleName(name);
  const parts = normalized
    .replace(/^\d{4}\s+/, '')
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

  const haystack = normalizeVehicleImageSlug(imageUrl).replace(/-/g, ' ');
  const brandAliases = BRAND_ALIASES[brand] || [brand];
  const brandMatch = brandAliases.some((alias) => haystack.includes(normalizeVehicleImageSlug(alias)));
  if (!brandMatch) return false;

  if (!modelTokens.length) return true;

  return modelTokens.some((token) => haystack.includes(token));
}

function matchRuleList(name, rules) {
  const vehicleName = normalizeVehicleName(name);
  if (!vehicleName) return null;

  const rawName = String(name || '').trim();
  for (const rule of rules) {
    if (rule.pattern.test(rawName) || rule.pattern.test(vehicleName)) {
      return rule.path;
    }
  }
  return null;
}

/**
 * Resolve bundled photo asset for a vehicle name.
 * @param {string} name
 */
export function resolvePhotoVehicleAsset(name) {
  return matchRuleList(name, VEHICLE_PHOTO_RULES);
}

/**
 * Resolve bundled static SVG asset for a vehicle name.
 * @param {string} name
 */
export function resolveLocalVehicleAsset(name) {
  return matchRuleList(name, LOCAL_VEHICLE_ASSET_RULES);
}

function detectSegment(vehicle = {}) {
  const hints = [
    vehicle?.segment,
    vehicle?.bodyType,
    vehicle?.body_type,
    vehicle?.category,
    vehicle?.type,
    vehicle?.name,
    vehicle?.fuel
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/suv|crossover|tucson|t-roc|kamiq|karoq|kodiaq|xc\d/i.test(hints)) return 'suv';
  if (/hatch|clio|corsa|fabia|i20|208|polo/i.test(hints)) return 'hatchback';
  if (/sedan|corolla|octavia|passat|leon|320|c200/i.test(hints)) return 'sedan';
  if (/electric|ev|tesla|byd|togg/i.test(hints)) return 'electric';
  if (/hybrid|hibrit/i.test(hints)) return 'hybrid';
  if (/mercedes|bmw|audi|premium|luxury/i.test(hints)) return 'premium';
  if (/family|aile|kamiq|karoq/i.test(hints)) return 'family';
  return 'default';
}

/**
 * Segment/bodyType fallback when brand-specific asset is unavailable.
 * @param {object|null|undefined} vehicle
 */
export function resolveVehicleImageFallback(vehicle) {
  const segment = detectSegment(vehicle);
  const segmentUrl = SEGMENT_FALLBACKS[segment] || SEGMENT_FALLBACKS.default;
  return assertVehicleImageUrl(segmentUrl);
}

/**
 * Full resolution chain for a vehicle reference.
 * @param {object|null|undefined} vehicle
 */
export function resolveVehicleImage(vehicle) {
  if (!vehicle || typeof vehicle !== 'object') {
    return assertVehicleImageUrl(DEFAULT_VEHICLE_FALLBACK);
  }

  const url = String(vehicle.image_url || vehicle.imageUrl || '').trim();
  if (url && vehicleImageMatchesName(vehicle.name, url)) {
    return assertVehicleImageUrl(url);
  }

  const photoAsset = resolvePhotoVehicleAsset(vehicle.name);
  if (photoAsset) return assertVehicleImageUrl(photoAsset);

  const localAsset = resolveLocalVehicleAsset(vehicle.name);
  if (localAsset) return assertVehicleImageUrl(localAsset);

  return resolveVehicleImageFallback(vehicle);
}

/** @deprecated alias — use resolveVehicleImage */
export function resolveVehicleImageUrl(vehicle) {
  return resolveVehicleImage(vehicle);
}

/**
 * CSP-safe per-image fallback chain: primary → segment → placeholder.
 * @param {HTMLImageElement|null|undefined} img
 * @param {object|null|undefined} vehicle
 */
export function attachVehicleImageFallback(img, vehicle) {
  if (!img || typeof img.addEventListener !== 'function') return;

  const primary = resolveVehicleImage(vehicle);
  const segmentFallback = resolveVehicleImageFallback(vehicle);
  const finalFallback = assertVehicleImageUrl(DEFAULT_VEHICLE_FALLBACK);

  img.src = primary;
  img.dataset.fallbackSrc = segmentFallback !== primary ? segmentFallback : finalFallback;
  img.dataset.finalFallbackSrc = finalFallback;
  img.dataset.vehicleImage = '1';
  img.dataset.vehicleName = String(vehicle?.name || img.alt || '');

  if (img.dataset.fallbackBound === '1') return;
  img.dataset.fallbackBound = '1';

  img.addEventListener('error', () => {
    const current = img.src || '';
    const segment = img.dataset.fallbackSrc || finalFallback;
    const final = img.dataset.finalFallbackSrc || finalFallback;

    if (!img.dataset.fallbackApplied && segment && !current.includes(segment)) {
      img.dataset.fallbackApplied = 'segment';
      img.src = segment;
      return;
    }

    if (img.dataset.fallbackApplied !== 'final' && final && !current.includes(final)) {
      img.dataset.fallbackApplied = 'final';
      img.src = final;
    }
  });
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
  const url = resolveVehicleImage(vehicle);
  const segmentFallback = resolveVehicleImageFallback(vehicle);
  const alt = String(vehicle?.name || 'Araç görseli');
  const cls = className ? ` class="${esc(className)}"` : '';
  const vehicleName = String(vehicle?.name || '');
  const style = ` style="aspect-ratio:${width}/${height}"`;

  return `<img src="${esc(url)}" alt="${esc(alt)}"${cls}${style} data-vehicle-image="1" data-fallback-src="${esc(segmentFallback)}" data-final-fallback-src="${esc(DEFAULT_VEHICLE_FALLBACK)}" data-vehicle-name="${esc(vehicleName)}" loading="${esc(loading)}" decoding="async" width="${width}" height="${height}">`;
}

/**
 * Attach runtime error fallback (CSP-safe — no inline onerror).
 * @param {ParentNode|null|undefined} root
 */
export function bindVehicleImageFallbacks(root) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll('img[data-vehicle-image]').forEach((img) => {
    const vehicleName = img.dataset.vehicleName || img.alt || '';
    attachVehicleImageFallback(img, { name: vehicleName });
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
      resolved: img.dataset.fallbackApplied || 'primary',
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
    imageUrl: resolveVehicleImage(vehicle)
  };
}
