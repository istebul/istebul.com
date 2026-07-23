/**
 * Vehicle image resolver v3 — deterministic catalog-based resolution.
 * Pipeline: exact → brand+model → brand → segment → generic → premium placeholder.
 */
import vehicleImageMap from '../../data/vehicle-image-map.json' with { type: 'json' };

export const IMAGE_CACHE_VERSION = vehicleImageMap.version || 'image-v3';
export const VEHICLE_PHOTOS_BASE = vehicleImageMap.basePath || '/assets/images/vehicles';
export const PREMIUM_VEHICLE_PLACEHOLDER = vehicleImageMap.placeholder || '/assets/images/auto/vehicle-premium-placeholder.svg';
export const DEFAULT_VEHICLE_FALLBACK = PREMIUM_VEHICLE_PLACEHOLDER;

const WATERMARK_PATTERNS = [
  /mobile0?1/i,
  /mobile0?2/i,
  /watermark/i,
  /\blogo\b/i,
  /preview/i,
  /\bthumb\b/i,
  /sample/i
];

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

const TRIM_STOPWORDS = new Set([
  'hybrid', 'electric', 'business', 'premium', 'elite', 'style', 'edition',
  'comfort', 'life', 'touch', 'techno', 'icon', 'eco', 'max', 'easy', 'journey',
  'prestige', 'allure', 'design', 'luxury', 'sport', 'amg', 'sedan', 'suv',
  'cross', 'hatchback', 'long', 'range', 'awd', 'rwd', 'fwd', 'turbo', 'tsi',
  'tgi', 'tdi', 'gdi', 'v2', 'v1', 'plus', 'pro', 'gt', 'fr', 'gs', 'm', 's',
  'x', 'e', 'i', 'ev', 'phev', 'stepway', 'journey'
]);

/** Trim tokens safe to infer from trailing name token (conservative; no fuel/body/engine). */
const TRIM_IDENTITY_ALLOWLIST = new Set([
  'allure', 'elite', 'premium', 'style', 'icon', 'touch', 'techno', 'eco', 'max',
  'easy', 'journey', 'prestige', 'design', 'comfort', 'life', 'business', 'elegance',
  'edition', 'fr', 'gt', 'gs', 'stepway', 'active', 'feel'
]);

const BRAND_ALIASES = {
  volkswagen: ['volkswagen', 'vw'],
  'mercedes-benz': ['mercedes', 'benz', 'mercedes-benz'],
  mercedes: ['mercedes', 'benz', 'mercedes-benz'],
  skoda: ['skoda', 'škoda'],
  citroen: ['citroen', 'citroën'],
  seat: ['seat'],
  peugeot: ['peugeot'],
  toyota: ['toyota'],
  renault: ['renault'],
  hyundai: ['hyundai'],
  bmw: ['bmw'],
  audi: ['audi'],
  ford: ['ford'],
  kia: ['kia'],
  nissan: ['nissan'],
  opel: ['opel'],
  fiat: ['fiat'],
  dacia: ['dacia'],
  volvo: ['volvo'],
  lexus: ['lexus'],
  mini: ['mini'],
  jeep: ['jeep'],
  mg: ['mg'],
  togg: ['togg'],
  tesla: ['tesla'],
  byd: ['byd'],
  'range-rover': ['range', 'rover', 'range-rover'],
  honda: ['honda']
};

/** @type {Set<string>|null} */
let renderSlugRegistry = null;

/**
 * Normalize vehicle slug (Turkish chars, spaces, underscores).
 * @param {unknown} value
 */
export function normalizeVehicleSlug(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** @deprecated alias */
export const normalizeVehicleImageSlug = normalizeVehicleSlug;

/**
 * @param {string} url
 */
export function isWatermarkImageUrl(url) {
  const imageUrl = String(url || '').trim();
  if (!imageUrl) return false;
  return WATERMARK_PATTERNS.some((pattern) => pattern.test(imageUrl));
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
 * Approved catalog paths (relative + absolute placeholder).
 * @type {Set<string>|null}
 */
let approvedCatalogPaths = null;

function buildApprovedCatalogPaths() {
  const paths = new Set();
  const addPath = (relativePath) => {
    if (!relativePath) return;
    if (relativePath.startsWith('/')) {
      paths.add(relativePath);
      return;
    }
    paths.add(`${VEHICLE_PHOTOS_BASE}/${relativePath.replace(/^\//, '')}`);
  };

  for (const brandMap of Object.values(vehicleImageMap.exact || {})) {
    for (const relativePath of Object.values(brandMap)) addPath(relativePath);
  }
  for (const relativePath of Object.values(vehicleImageMap.brand || {})) addPath(relativePath);
  for (const relativePath of Object.values(vehicleImageMap.segment || {})) addPath(relativePath);
  addPath(vehicleImageMap.generic);
  addPath(vehicleImageMap.placeholder);

  return paths;
}

/**
 * @param {string} url
 */
export function isApprovedCatalogImage(url) {
  const imageUrl = String(url || '').trim();
  if (!imageUrl) return false;
  if (!approvedCatalogPaths) approvedCatalogPaths = buildApprovedCatalogPaths();
  const normalized = imageUrl.split('?')[0];
  if (approvedCatalogPaths.has(normalized)) return true;
  if (normalized === PREMIUM_VEHICLE_PLACEHOLDER) return true;
  return false;
}

/**
 * Reject watermarked or non-catalog image URLs.
 * @param {string} url
 */
export function isRejectedImageUrl(url) {
  const imageUrl = String(url || '').trim();
  if (!imageUrl) return true;
  if (isWatermarkImageUrl(imageUrl)) return true;
  if (isGenericVehicleImage(imageUrl)) return true;
  if (/^https?:\/\//i.test(imageUrl)) {
    return isWatermarkImageUrl(imageUrl) || isGenericVehicleImage(imageUrl);
  }
  if (imageUrl.startsWith('/assets/') && !isApprovedCatalogImage(imageUrl)) return true;
  return false;
}

/**
 * @param {unknown} url
 */
export function appendImageCacheVersion(url) {
  const imageUrl = String(url ?? '').trim();
  if (!imageUrl) return imageUrl;
  if (imageUrl.includes('?v=')) return imageUrl;
  const separator = imageUrl.includes('?') ? '&' : '?';
  return `${imageUrl}${separator}v=${IMAGE_CACHE_VERSION}`;
}

/**
 * @param {unknown} url
 */
export function assertVehicleImageUrl(url) {
  const imageUrl = String(url ?? '').trim();
  if (!imageUrl || imageUrl === 'undefined' || imageUrl === 'null') {
    return appendImageCacheVersion(PREMIUM_VEHICLE_PLACEHOLDER);
  }
  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith('/')) {
    return appendImageCacheVersion(imageUrl);
  }
  return appendImageCacheVersion(PREMIUM_VEHICLE_PLACEHOLDER);
}

function normalizeVehicleName(name) {
  return normalizeVehicleSlug(name).replace(/-/g, ' ');
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
 * Parse model year from leading YYYY in display name.
 * @param {string} name
 * @returns {number|null}
 */
function parseYearFromDisplayName(name) {
  const match = String(name || '').trim().match(/^(\d{4})\b/);
  if (!match) return null;
  const year = Number(match[1]);
  if (!Number.isFinite(year) || year < 1990 || year > 2099) return null;
  return year;
}

/**
 * Parse trim from trailing name token when it matches conservative allowlist.
 * @param {string} name
 * @returns {string|null}
 */
function parseTrimTokenFromDisplayName(name) {
  const parts = String(name || '')
    .trim()
    .replace(/^\d{4}\s+/, '')
    .split(/\s+/)
    .filter((token) => token.length > 1);

  if (parts.length < 3) return null;

  const lastToken = normalizeVehicleSlug(parts[parts.length - 1]);
  if (!TRIM_IDENTITY_ALLOWLIST.has(lastToken)) return null;

  return parts[parts.length - 1];
}

/**
 * Parse model tokens from display name (includes numeric model codes like 308).
 * @param {string} name
 * @param {string|null} brand
 * @param {string|null} trim
 * @returns {string|null}
 */
function parseModelFromDisplayName(name, brand, trim) {
  const parts = String(name || '')
    .trim()
    .replace(/^\d{4}\s+/, '')
    .split(/\s+/)
    .filter((token) => token.length > 0);

  if (parts.length < 2) return null;

  const brandSlug = normalizeVehicleSlug(brand || parts[0]);
  let start = normalizeVehicleSlug(parts[0]) === brandSlug ? 1 : 0;
  let end = parts.length;

  if (trim && parts[end - 1] === trim) end -= 1;
  if (end <= start) return null;

  const modelParts = parts.slice(start, end).filter((token) => !TRIM_STOPWORDS.has(token.toLowerCase()));
  if (!modelParts.length) return null;

  return modelParts.join(' ');
}

/**
 * Structured vehicle identity for future strict exact_match checks (Faz 3F-1E).
 * Conservative: missing or ambiguous fields remain null — no guess-based upgrades.
 * @param {object|null|undefined} vehicle
 * @returns {{
 *   brand: string|null,
 *   model: string|null,
 *   year: number|null,
 *   trim: string|null,
 *   packageName: string|null,
 *   name: string,
 *   hasBrand: boolean,
 *   hasModel: boolean,
 *   hasYear: boolean,
 *   hasTrim: boolean,
 *   hasPackage: boolean
 * }}
 */
export function normalizeVehicleImageIdentity(vehicle) {
  const empty = {
    brand: null,
    model: null,
    year: null,
    trim: null,
    packageName: null,
    name: '',
    hasBrand: false,
    hasModel: false,
    hasYear: false,
    hasTrim: false,
    hasPackage: false
  };

  if (!vehicle || typeof vehicle !== 'object') return empty;

  const name = String(vehicle.name || vehicle.title || '').trim();
  const { brand: parsedBrand, modelTokens } = extractVehicleImageTokens(name);

  const brandValue = String(vehicle.brand || parsedBrand || '').trim();
  const brand = brandValue || null;

  let year = null;
  const yearField = vehicle.model_year ?? vehicle.year;
  if (yearField != null && Number.isFinite(Number(yearField))) {
    const parsed = Number(yearField);
    if (parsed >= 1990 && parsed <= 2099) year = parsed;
  }
  if (year == null) year = parseYearFromDisplayName(name);

  const explicitTrim = String(vehicle.trim || '').trim();
  const trim = explicitTrim || parseTrimTokenFromDisplayName(name) || null;

  const explicitModel = String(vehicle.model || '').trim();
  const model = explicitModel
    || parseModelFromDisplayName(name, brand, trim)
    || (modelTokens.length ? modelTokens.join(' ') : null);

  const explicitPackage = String(vehicle.package ?? vehicle.packageName ?? '').trim();
  const packageName = explicitPackage || null;

  return {
    brand,
    model,
    year,
    trim,
    packageName,
    name,
    hasBrand: Boolean(brand),
    hasModel: Boolean(model),
    hasYear: year != null,
    hasTrim: Boolean(trim),
    hasPackage: Boolean(packageName)
  };
}

/**
 * Additive trust checks metadata (does not alter matchLevel/showRealImage).
 * @param {ReturnType<typeof normalizeVehicleImageIdentity>} identity
 * @param {{ matchLevel?: VehicleImageMatchLevel, sourceTrust?: VehicleImageSourceTrust, showRealImage?: boolean }} classification
 */
function buildVehicleImageTrustChecks(identity, classification = {}) {
  return {
    hasBrand: identity.hasBrand,
    hasModel: identity.hasModel,
    hasYear: identity.hasYear,
    hasTrim: identity.hasTrim,
    hasPackage: identity.hasPackage,
    matchLevel: classification.matchLevel ?? 'no_match',
    sourceTrust: classification.sourceTrust ?? 'placeholder',
    showRealImage: classification.showRealImage ?? false,
    strictExactMatchReady:
      identity.hasBrand &&
      identity.hasModel &&
      identity.hasYear &&
      identity.hasTrim &&
      classification.sourceTrust === 'verified_external' &&
      classification.showRealImage === true
  };
}

/**
 * @param {string} brand
 */
function resolveBrandKey(brand) {
  const slug = normalizeVehicleSlug(brand);
  if (vehicleImageMap.exact?.[slug]) return slug;
  if (vehicleImageMap.brand?.[slug]) return slug;

  for (const [key, aliases] of Object.entries(BRAND_ALIASES)) {
    if (key === slug || aliases.some((alias) => normalizeVehicleSlug(alias) === slug)) {
      if (vehicleImageMap.exact?.[key] || vehicleImageMap.brand?.[key]) return key;
    }
  }

  return slug;
}

/**
 * @param {string} brandKey
 * @param {string[]} modelTokens
 * @param {string} [name]
 */
function buildModelSlug(brandKey, modelTokens, name = '') {
  const tokens = modelTokens.filter(Boolean);
  const exactMap = vehicleImageMap.exact?.[brandKey] || {};
  const candidates = [];

  const normalized = normalizeVehicleName(name);
  const rawParts = normalized
    .replace(/^\d{4}\s+/, '')
    .split(/\s+/)
    .slice(1)
    .filter((token) => token.length > 1);

  if (rawParts.length) {
    candidates.push(rawParts.join('-'));
  }

  if (tokens.length) {
    candidates.push(tokens.join('-'));
    for (let size = tokens.length; size >= 1; size -= 1) {
      candidates.push(tokens.slice(0, size).join('-'));
    }
    if (tokens.length >= 2) {
      candidates.push(`${tokens[0]}-${tokens[tokens.length - 1]}`);
    }
  }

  for (const candidate of candidates) {
    if (exactMap[candidate]) return candidate;
  }

  return tokens.join('-');
}

/**
 * @param {string} relativeOrAbsolute
 */
function toAbsoluteAssetPath(relativeOrAbsolute) {
  const value = String(relativeOrAbsolute || '').trim();
  if (!value) return '';
  if (value.startsWith('/')) return value;
  return `${VEHICLE_PHOTOS_BASE}/${value.replace(/^\//, '')}`;
}

/**
 * Image slug for duplicate detection (path without cache bust).
 * @param {string} url
 */
export function imageSlugFromUrl(url) {
  return String(url || '').split('?')[0].trim();
}

/**
 * @param {object|null|undefined} vehicle
 */
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
 * @param {object|null|undefined} vehicle
 * @param {{ usedSlugs?: Set<string>, skipLevels?: Set<string> }} [options]
 */
function resolveAtLevel(vehicle, level, options = {}) {
  const name = String(vehicle?.name || '');
  const { brand, modelTokens } = extractVehicleImageTokens(name);
  const brandKey = resolveBrandKey(brand);

  if (level === 'verified-url') {
    const url = String(vehicle?.image_url || vehicle?.imageUrl || '').trim();
    if (url && !isRejectedImageUrl(url) && vehicleImageMatchesName(name, url)) {
      return assertVehicleImageUrl(url);
    }
    return null;
  }

  if (level === 'exact') {
    const exactMap = vehicleImageMap.exact?.[brandKey];
    if (!exactMap) return null;
    const modelSlug = buildModelSlug(brandKey, modelTokens, name);
    const relativePath = exactMap[modelSlug];
    if (relativePath) return assertVehicleImageUrl(toAbsoluteAssetPath(relativePath));
    return null;
  }

  if (level === 'brand-model') {
    const exactMap = vehicleImageMap.exact?.[brandKey];
    if (!exactMap || !modelTokens.length) return null;
    const modelSlug = modelTokens.join('-');
    const relativePath = exactMap[modelSlug];
    if (relativePath) return assertVehicleImageUrl(toAbsoluteAssetPath(relativePath));
    return null;
  }

  if (level === 'brand') {
    const relativePath = vehicleImageMap.brand?.[brandKey];
    if (relativePath) return assertVehicleImageUrl(toAbsoluteAssetPath(relativePath));
    return null;
  }

  if (level === 'segment') {
    const segment = detectSegment(vehicle);
    const relativePath = vehicleImageMap.segment?.[segment] || vehicleImageMap.segment?.default;
    if (relativePath) return assertVehicleImageUrl(toAbsoluteAssetPath(relativePath));
    return null;
  }

  if (level === 'generic') {
    const relativePath = vehicleImageMap.generic;
    if (relativePath) return assertVehicleImageUrl(toAbsoluteAssetPath(relativePath));
    return null;
  }

  if (level === 'placeholder') {
    return assertVehicleImageUrl(PREMIUM_VEHICLE_PLACEHOLDER);
  }

  return null;
}

const RESOLUTION_LEVELS = ['verified-url', 'exact', 'brand-model', 'brand', 'segment', 'generic', 'placeholder'];

/** @typedef {'exact_match' | 'partial_match' | 'no_match'} VehicleImageMatchLevel */
/** @typedef {'verified_external' | 'catalog_svg' | 'placeholder'} VehicleImageSourceTrust */

/** @type {Set<string>} */
const ILLUSTRATIVE_CATALOG_LEVELS = new Set(['exact', 'brand-model', 'brand', 'segment', 'generic']);

/**
 * @param {string} url
 */
function isPremiumPlaceholderPath(url) {
  return imageSlugFromUrl(url) === imageSlugFromUrl(PREMIUM_VEHICLE_PLACEHOLDER);
}

/**
 * Classify trust metadata for a resolved image level + URL.
 * Catalog SVG assets are never treated as real vehicle photos.
 * @param {string} level
 * @param {string} url
 * @returns {{ matchLevel: VehicleImageMatchLevel, sourceTrust: VehicleImageSourceTrust, showRealImage: boolean, reason: string }}
 */
function classifyVehicleImageTrust(level, url) {
  if (level === 'verified-url') {
    return {
      matchLevel: 'exact_match',
      sourceTrust: 'verified_external',
      showRealImage: true,
      reason: 'verified_external_url_passes_name_guard'
    };
  }

  if (level === 'placeholder') {
    return {
      matchLevel: 'no_match',
      sourceTrust: 'placeholder',
      showRealImage: false,
      reason: 'no_verified_image_source'
    };
  }

  if (ILLUSTRATIVE_CATALOG_LEVELS.has(level)) {
    const sourceTrust = isPremiumPlaceholderPath(url) ? 'placeholder' : 'catalog_svg';
    return {
      matchLevel: 'partial_match',
      sourceTrust,
      showRealImage: false,
      reason: sourceTrust === 'placeholder'
        ? `illustrative_${level}_placeholder`
        : `illustrative_${level}_catalog_svg`
    };
  }

  return {
    matchLevel: 'no_match',
    sourceTrust: 'placeholder',
    showRealImage: false,
    reason: 'unclassified_fallback'
  };
}

/**
 * Select display URL + resolution level (shared selection logic with resolveVehicleDisplayImage).
 * @param {object} vehicle
 * @param {{ usedSlugs?: Set<string>, registry?: Set<string> }} [options]
 * @returns {{ level: string, url: string }}
 */
function selectVehicleDisplayImageEntry(vehicle, options = {}) {
  const usedSlugs = options.usedSlugs || options.registry || renderSlugRegistry || null;
  const chain = buildVehicleImageFallbackChain(vehicle, options);

  for (const entry of chain) {
    const slug = imageSlugFromUrl(entry.url);
    if (!usedSlugs || !usedSlugs.has(slug)) {
      if (usedSlugs) usedSlugs.add(slug);
      return entry;
    }
  }

  for (let index = 1; index < chain.length; index += 1) {
    const entry = chain[index];
    const slug = imageSlugFromUrl(entry.url);
    if (!usedSlugs || !usedSlugs.has(slug)) {
      if (usedSlugs) usedSlugs.add(slug);
      return entry;
    }
  }

  const url = assertVehicleImageUrl(PREMIUM_VEHICLE_PLACEHOLDER);
  if (usedSlugs) usedSlugs.add(imageSlugFromUrl(url));
  return { level: 'placeholder', url };
}

/**
 * @param {object|null|undefined} vehicle
 * @param {{ usedSlugs?: Set<string> }} [options]
 */
export function buildVehicleImageFallbackChain(vehicle, options = {}) {
  const chain = [];
  const seen = new Set();

  for (const level of RESOLUTION_LEVELS) {
    const url = resolveAtLevel(vehicle, level, options);
    if (!url) continue;
    const slug = imageSlugFromUrl(url);
    if (seen.has(slug)) continue;
    seen.add(slug);
    chain.push({ level, url });
  }

  if (!chain.length) {
    chain.push({ level: 'placeholder', url: assertVehicleImageUrl(PREMIUM_VEHICLE_PLACEHOLDER) });
  }

  return chain;
}

/**
 * Primary resolver API — deterministic catalog resolution with duplicate protection.
 * @param {object|null|undefined} vehicle
 * @param {{ usedSlugs?: Set<string>, registry?: Set<string> }} [options]
 */
export function resolveVehicleDisplayImage(vehicle, options = {}) {
  if (!vehicle || typeof vehicle !== 'object') {
    return assertVehicleImageUrl(PREMIUM_VEHICLE_PLACEHOLDER);
  }

  return selectVehicleDisplayImageEntry(vehicle, options).url;
}

/**
 * Resolve display URL with trust metadata for UI gating (Faz 3F foundation).
 * Does not alter resolveVehicleDisplayImage behavior; additive classification only.
 * @param {object|null|undefined} vehicle
 * @param {{ usedSlugs?: Set<string>, registry?: Set<string> }} [options]
 * @returns {{
 *   url: string,
 *   matchLevel: VehicleImageMatchLevel,
 *   sourceTrust: VehicleImageSourceTrust,
 *   showRealImage: boolean,
 *   reason: string,
 *   identity: ReturnType<typeof normalizeVehicleImageIdentity>,
 *   checks: ReturnType<typeof buildVehicleImageTrustChecks>
 * }}
 */
export function resolveVehicleImageTrust(vehicle, options = {}) {
  const identity = normalizeVehicleImageIdentity(vehicle);

  if (!vehicle || typeof vehicle !== 'object') {
    const url = assertVehicleImageUrl(PREMIUM_VEHICLE_PLACEHOLDER);
    const classification = classifyVehicleImageTrust('placeholder', url);
    return {
      url,
      ...classification,
      identity,
      checks: buildVehicleImageTrustChecks(identity, classification)
    };
  }

  const selected = selectVehicleDisplayImageEntry(vehicle, options);
  const classification = classifyVehicleImageTrust(selected.level, selected.url);
  return {
    url: selected.url,
    ...classification,
    identity,
    checks: buildVehicleImageTrustChecks(identity, classification)
  };
}

/** Reset module-level slug registry for a new results render. */
export function resetVehicleImageSlugRegistry() {
  renderSlugRegistry = new Set();
}

/** Begin tracking duplicate slugs within a render batch. */
export function beginVehicleImageRenderBatch() {
  renderSlugRegistry = new Set();
  return renderSlugRegistry;
}

/** @param {Set<string>} registry */
export function endVehicleImageRenderBatch(registry) {
  if (renderSlugRegistry === registry) renderSlugRegistry = null;
}

/**
 * Verify image URL plausibly matches the vehicle name.
 * @param {string} name
 * @param {string} url
 */
export function vehicleImageMatchesName(name, url) {
  const imageUrl = String(url || '').trim();
  if (!imageUrl || isRejectedImageUrl(imageUrl)) return false;

  const { brand, modelTokens } = extractVehicleImageTokens(name);
  if (!brand) return false;

  const haystack = normalizeVehicleSlug(imageUrl).replace(/-/g, ' ');
  const brandKey = resolveBrandKey(brand);
  const brandAliases = BRAND_ALIASES[brandKey] || BRAND_ALIASES[brand] || [brand];
  const brandMatch = brandAliases.some((alias) => haystack.includes(normalizeVehicleSlug(alias)));
  if (!brandMatch) return false;

  if (!modelTokens.length) return true;
  return modelTokens.some((token) => haystack.includes(token));
}

/** @deprecated use resolveVehicleDisplayImage */
export function resolveVehicleImage(vehicle, options) {
  return resolveVehicleDisplayImage(vehicle, options);
}

/** @deprecated alias */
export function resolveVehicleImageUrl(vehicle, options) {
  return resolveVehicleDisplayImage(vehicle, options);
}

/**
 * Segment/bodyType fallback when brand-specific asset is unavailable.
 * @param {object|null|undefined} vehicle
 */
export function resolveVehicleImageFallback(vehicle) {
  return resolveAtLevel(vehicle, 'segment') || assertVehicleImageUrl(PREMIUM_VEHICLE_PLACEHOLDER);
}

/**
 * Resolve bundled photo asset for a vehicle name.
 * @param {string} name
 */
export function resolvePhotoVehicleAsset(name) {
  return resolveAtLevel({ name }, 'exact');
}

/**
 * Resolve bundled static SVG asset for a vehicle name.
 * @param {string} name
 */
export function resolveLocalVehicleAsset(name) {
  const brandKey = resolveBrandKey(extractVehicleImageTokens(name).brand);
  const relativePath = vehicleImageMap.brand?.[brandKey];
  if (!relativePath) return null;
  const absolute = toAbsoluteAssetPath(relativePath);
  return absolute.endsWith('.svg') ? assertVehicleImageUrl(absolute) : null;
}
