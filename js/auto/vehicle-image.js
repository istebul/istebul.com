/**
 * Central vehicle image resolution for Auto results.
 * Facade over vehicle-image-resolver.js (v3 pipeline).
 */
import {
  DEFAULT_VEHICLE_FALLBACK,
  PREMIUM_VEHICLE_PLACEHOLDER,
  IMAGE_CACHE_VERSION,
  appendImageCacheVersion,
  assertVehicleImageUrl,
  beginVehicleImageRenderBatch,
  buildVehicleImageFallbackChain,
  endVehicleImageRenderBatch,
  extractVehicleImageTokens,
  isGenericVehicleImage,
  isRejectedImageUrl,
  isWatermarkImageUrl,
  normalizeVehicleImageSlug,
  normalizeVehicleSlug,
  resolveLocalVehicleAsset,
  resolvePhotoVehicleAsset,
  resolveVehicleDisplayImage,
  resolveVehicleImageFallback,
  resolveVehicleImageTrust,
  normalizeVehicleImageIdentity,
  vehicleImageMatchesName,
  isApprovedCatalogImage
} from './vehicle-image-resolver.js';

export {
  DEFAULT_VEHICLE_FALLBACK,
  PREMIUM_VEHICLE_PLACEHOLDER,
  IMAGE_CACHE_VERSION,
  appendImageCacheVersion,
  assertVehicleImageUrl,
  extractVehicleImageTokens,
  isGenericVehicleImage,
  isRejectedImageUrl,
  isWatermarkImageUrl,
  normalizeVehicleImageSlug,
  normalizeVehicleSlug,
  resolveLocalVehicleAsset,
  resolvePhotoVehicleAsset,
  resolveVehicleImageFallback,
  vehicleImageMatchesName,
  resolveVehicleImageTrust,
  normalizeVehicleImageIdentity
};

export function resolveVehicleImage(vehicle, options) {
  return resolveVehicleDisplayImage(vehicle, options);
}

/** @deprecated alias — use resolveVehicleDisplayImage */
export function resolveVehicleImageUrl(vehicle, options) {
  return resolveVehicleDisplayImage(vehicle, options);
}

export { resolveVehicleDisplayImage, buildVehicleImageFallbackChain };

/** Deterministic trust copy when real vehicle photo cannot be shown. */
export const VEHICLE_IMAGE_UNVERIFIED_LABEL = 'Görsel doğrulanamadı';

function fallbackDataAttributes(chain) {
  const byLevel = Object.fromEntries(chain.map((entry) => [entry.level, entry.url]));
  return {
    exact: byLevel.exact || byLevel['verified-url'] || '',
    brand: byLevel.brand || byLevel['brand-model'] || '',
    segment: byLevel.segment || '',
    generic: byLevel.generic || '',
    final: byLevel.placeholder || DEFAULT_VEHICLE_FALLBACK
  };
}

function imageSlugFromUrl(url) {
  return String(url || '').split('?')[0].trim();
}

/**
 * True when URL points to illustrative Auto catalog SVG (not premium placeholder).
 * @param {string} url
 */
function isIllustrativeAutoCatalogImageUrl(url) {
  const slug = imageSlugFromUrl(url);
  if (!slug || slug === imageSlugFromUrl(PREMIUM_VEHICLE_PLACEHOLDER)) return false;
  return isApprovedCatalogImage(url) && slug.endsWith('.svg');
}

/**
 * UI-safe image payload for Auto surfaces (placeholder-first when trust is not exact).
 * @param {object|null|undefined} vehicle
 */
export function buildVehicleImageUiPayload(vehicle) {
  if (!vehicle || typeof vehicle !== 'object') {
    const placeholderUrl = assertVehicleImageUrl(DEFAULT_VEHICLE_FALLBACK);
    return {
      imageUrl: placeholderUrl,
      imageTrust: {
        matchLevel: 'no_match',
        sourceTrust: 'placeholder',
        showRealImage: false,
        reason: 'no_verified_image_source'
      }
    };
  }

  const trust = resolveVehicleImageTrust(vehicle);
  return {
    imageUrl: trust.showRealImage ? trust.url : assertVehicleImageUrl(DEFAULT_VEHICLE_FALLBACK),
    imageTrust: {
      matchLevel: trust.matchLevel,
      sourceTrust: trust.sourceTrust,
      showRealImage: trust.showRealImage,
      reason: trust.reason
    }
  };
}

/** UI-safe image URL — never returns catalog SVG for partial/no_match trust. */
export function resolveVehicleImageUrlForUi(vehicle) {
  return buildVehicleImageUiPayload(vehicle).imageUrl;
}

/**
 * Resolve compare-card image for Auto-sourced items (legacy catalog URLs sanitized).
 * @param {object} item
 * @returns {{ imageUrl: string, imageAlt: string }|null}
 */
export function resolveAutoComparisonImageItem(item = {}) {
  const title = String(item.title || 'Seçenek');
  const label = VEHICLE_IMAGE_UNVERIFIED_LABEL;
  const placeholderUrl = assertVehicleImageUrl(DEFAULT_VEHICLE_FALLBACK);
  const rawImage = String(item.image || '');

  if (item.imageTrust?.showRealImage === true && rawImage) {
    return { imageUrl: rawImage, imageAlt: title };
  }

  if (item.imageTrust && item.imageTrust.showRealImage === false) {
    return {
      imageUrl: rawImage || placeholderUrl,
      imageAlt: label
    };
  }

  if (rawImage && isIllustrativeAutoCatalogImageUrl(rawImage)) {
    return { imageUrl: placeholderUrl, imageAlt: label };
  }

  if (!rawImage) return null;

  return { imageUrl: rawImage, imageAlt: title };
}

/**
 * Apply placeholder-only state after verified external image load failure.
 * @param {HTMLImageElement|object} img
 */
function applyVerifiedImageLoadErrorFallback(img) {
  const placeholderUrl = assertVehicleImageUrl(DEFAULT_VEHICLE_FALLBACK);
  const label = VEHICLE_IMAGE_UNVERIFIED_LABEL;

  img.src = placeholderUrl;
  img.alt = label;
  if ('title' in img) img.title = label;
  img.dataset.fallbackApplied = 'verified-error-placeholder';
  img.dataset.showRealImage = '0';
  img.dataset.imageTrust = 'placeholder';
  img.dataset.imageMatch = 'no_match';
  img.dataset.imageErrorFallback = '1';
  img.dataset.fallbackExact = '';
  img.dataset.fallbackBrand = '';
  img.dataset.fallbackSegment = '';
  img.dataset.fallbackGeneric = '';
  img.dataset.fallbackSrc = placeholderUrl;
  img.dataset.finalFallbackSrc = placeholderUrl;

  const parent = img.parentElement;
  if (parent && typeof parent.classList?.add === 'function') {
    parent.classList.add('auto-vehicle-image', 'auto-vehicle-image--unverified');
    if (!parent.querySelector?.('.auto-vehicle-image__trust-copy')) {
      const span = typeof document !== 'undefined' ? document.createElement('span') : null;
      if (span) {
        span.className = 'auto-vehicle-image__trust-copy';
        span.textContent = label;
        parent.appendChild(span);
      }
    }
  }
}

/**
 * Bind error handler for verified external images — placeholder only, no catalog chain.
 * @param {HTMLImageElement|object} img
 */
function attachVerifiedExternalImageErrorFallback(img) {
  const finalFallback = assertVehicleImageUrl(DEFAULT_VEHICLE_FALLBACK);

  img.dataset.fallbackExact = '';
  img.dataset.fallbackBrand = '';
  img.dataset.fallbackSegment = '';
  img.dataset.fallbackGeneric = '';
  img.dataset.fallbackSrc = finalFallback;
  img.dataset.finalFallbackSrc = finalFallback;

  if (img.dataset.fallbackBound === '1') return;
  img.dataset.fallbackBound = '1';

  img.addEventListener('error', () => {
    if (img.dataset.fallbackApplied === 'verified-error-placeholder') return;
    applyVerifiedImageLoadErrorFallback(img);
  });
}

/**
 * CSP-safe per-image fallback chain: exact → brand → segment → generic → placeholder.
 * @param {HTMLImageElement|null|undefined} img
 * @param {object|null|undefined} vehicle
 */
export function attachVehicleImageFallback(img, vehicle) {
  if (!img || typeof img.addEventListener !== 'function') return;

  if (img.dataset.imageTrust === 'verified_external' && img.dataset.showRealImage === '1') {
    attachVerifiedExternalImageErrorFallback(img);
    return;
  }

  const trust = resolveVehicleImageTrust(vehicle);
  if (!trust.showRealImage) {
    const placeholderUrl = assertVehicleImageUrl(DEFAULT_VEHICLE_FALLBACK);
    img.src = placeholderUrl;
    img.dataset.vehicleImage = '1';
    img.dataset.showRealImage = '0';
    img.dataset.imageTrust = trust.sourceTrust;
    img.dataset.imageMatch = trust.matchLevel;
    img.dataset.vehicleName = String(vehicle?.name || img.alt || '');
    return;
  }

  if (trust.sourceTrust === 'verified_external') {
    const primary = trust.url;
    const finalFallback = assertVehicleImageUrl(DEFAULT_VEHICLE_FALLBACK);

    img.src = primary;
    img.dataset.vehicleImage = '1';
    img.dataset.showRealImage = '1';
    img.dataset.imageTrust = trust.sourceTrust;
    img.dataset.imageMatch = trust.matchLevel;
    img.dataset.vehicleName = String(vehicle?.name || img.alt || '');
    attachVerifiedExternalImageErrorFallback(img);
    img.dataset.finalFallbackSrc = finalFallback;
    return;
  }

  const chain = buildVehicleImageFallbackChain(vehicle);
  const primary = chain[0]?.url || assertVehicleImageUrl(DEFAULT_VEHICLE_FALLBACK);
  const fallbacks = fallbackDataAttributes(chain);
  const finalFallback = assertVehicleImageUrl(DEFAULT_VEHICLE_FALLBACK);

  img.src = primary;
  img.dataset.fallbackExact = fallbacks.exact !== primary ? fallbacks.exact : '';
  img.dataset.fallbackBrand = fallbacks.brand && fallbacks.brand !== primary ? fallbacks.brand : '';
  img.dataset.fallbackSegment = fallbacks.segment && fallbacks.segment !== primary ? fallbacks.segment : '';
  img.dataset.fallbackGeneric = fallbacks.generic && fallbacks.generic !== primary ? fallbacks.generic : '';
  img.dataset.fallbackSrc = fallbacks.segment || fallbacks.brand || finalFallback;
  img.dataset.finalFallbackSrc = finalFallback;
  img.dataset.vehicleImage = '1';
  img.dataset.showRealImage = '1';
  img.dataset.imageTrust = trust.sourceTrust;
  img.dataset.imageMatch = trust.matchLevel;
  img.dataset.vehicleName = String(vehicle?.name || img.alt || '');

  if (img.dataset.fallbackBound === '1') return;
  img.dataset.fallbackBound = '1';

  img.addEventListener('error', () => {
    const current = img.src || '';
    const steps = [
      { key: 'exact', attr: 'fallbackExact' },
      { key: 'brand', attr: 'fallbackBrand' },
      { key: 'segment', attr: 'fallbackSegment' },
      { key: 'generic', attr: 'fallbackGeneric' },
      { key: 'final', attr: 'finalFallbackSrc' }
    ];

    for (const step of steps) {
      if (img.dataset.fallbackApplied === step.key) continue;
      const next = img.dataset[step.attr] || (step.key === 'final' ? finalFallback : '');
      if (!next || current.includes(imageSlugFromUrl(next))) continue;
      img.dataset.fallbackApplied = step.key;
      img.src = next;
      return;
    }
  });
}

/**
 * @param {object|null|undefined} vehicle
 * @param {(s: unknown) => string} esc
 * @param {{ className?: string, loading?: string, fetchPriority?: string, width?: number, height?: number, isFirst?: boolean }} [opts]
 */
export function renderVehicleImageHtml(vehicle, esc, opts = {}) {
  const {
    className = '',
    loading = 'lazy',
    fetchPriority,
    width = 640,
    height = 360,
    isFirst = false
  } = opts;

  const trust = resolveVehicleImageTrust(vehicle);
  const cls = className ? ` class="${esc(className)}"` : '';
  const vehicleName = String(vehicle?.name || '');
  const priority = fetchPriority || (isFirst || loading === 'eager' ? 'high' : 'auto');
  const imgAttrs = ` data-vehicle-image="1" data-image-trust="${esc(trust.sourceTrust)}" data-image-match="${esc(trust.matchLevel)}" data-show-real-image="${trust.showRealImage ? '1' : '0'}" data-vehicle-name="${esc(vehicleName)}" loading="${esc(loading)}" decoding="async" fetchpriority="${esc(priority)}" width="${width}" height="${height}"`;

  if (!trust.showRealImage) {
    const placeholderUrl = assertVehicleImageUrl(DEFAULT_VEHICLE_FALLBACK);
    const label = VEHICLE_IMAGE_UNVERIFIED_LABEL;
    return `<div class="auto-vehicle-image auto-vehicle-image--unverified">` +
      `<img src="${esc(placeholderUrl)}" alt="${esc(label)}" title="${esc(label)}"${cls}${imgAttrs}>` +
      `<span class="auto-vehicle-image__trust-copy">${esc(label)}</span>` +
      `</div>`;
  }

  const url = trust.url;
  const finalFallback = assertVehicleImageUrl(DEFAULT_VEHICLE_FALLBACK);
  const alt = String(vehicle?.name || 'Araç görseli');

  return `<img src="${esc(url)}" alt="${esc(alt)}"${cls}${imgAttrs} data-fallback-exact="" data-fallback-brand="" data-fallback-segment="" data-fallback-generic="" data-fallback-src="${esc(finalFallback)}" data-final-fallback-src="${esc(finalFallback)}">`;
}

/**
 * Attach runtime error fallback (CSP-safe — no inline onerror).
 * @param {ParentNode|null|undefined} root
 */
export function bindVehicleImageFallbacks(root) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll('img[data-vehicle-image]').forEach((img) => {
    if (img.dataset.showRealImage === '0') return;
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
    const payload = buildVehicleImageUiPayload(null);
    return { name: '', image_url: null, ...payload };
  }

  return {
    ...vehicle,
    ...buildVehicleImageUiPayload(vehicle)
  };
}

export {
  beginVehicleImageRenderBatch,
  endVehicleImageRenderBatch
};
