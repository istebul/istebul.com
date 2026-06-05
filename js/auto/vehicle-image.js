/**
 * Central vehicle image resolution for Auto results.
 * Single source: vehicle.image_url → premium placeholder (no brand SVG fallbacks).
 */

export const PREMIUM_VEHICLE_PLACEHOLDER = '/assets/images/auto/vehicle-premium-placeholder.svg';

/** @param {object|null|undefined} vehicle */
export function resolveVehicleImageUrl(vehicle) {
  const url = String(vehicle?.image_url || '').trim();
  if (url) return url;
  return PREMIUM_VEHICLE_PLACEHOLDER;
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
