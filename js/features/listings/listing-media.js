/**
 * Gallery + video helpers for marketplace listings.
 */

const YOUTUBE_RE =
  /(?:youtube\.com\/(?:watch\?v=|embed\|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/i;

/**
 * @param {string} value
 */
export function extractYouTubeId(value = '') {
  const match = String(value).match(YOUTUBE_RE);
  return match ? match[1] : null;
}

/**
 * @param {object} listing
 */
export function resolveListingVideo(listing = {}) {
  const direct =
    listing.video_url ||
    listing.videoUrl ||
    listing.metadata?.video_url ||
    listing.metadata?.videoUrl ||
    '';
  const fromDirect = extractYouTubeId(direct);
  if (fromDirect) {
    return { type: 'youtube', id: fromDirect, embedUrl: `https://www.youtube-nocookie.com/embed/${fromDirect}` };
  }
  const fromExternal = extractYouTubeId(listing.external_url || '');
  if (fromExternal) {
    return { type: 'youtube', id: fromExternal, embedUrl: `https://www.youtube-nocookie.com/embed/${fromExternal}` };
  }
  const fromDesc = extractYouTubeId(listing.description || '');
  if (fromDesc) {
    return { type: 'youtube', id: fromDesc, embedUrl: `https://www.youtube-nocookie.com/embed/${fromDesc}` };
  }
  return null;
}

/**
 * @param {object} listing
 * @param {string} fallback
 */
export function resolveListingImages(listing = {}, fallback = '/assets/images/placeholder.svg') {
  const raw = listing.images || listing.image_urls || [];
  const list = (Array.isArray(raw) ? raw : [raw])
    .map((item) => (typeof item === 'string' ? item : item?.url))
    .filter(Boolean);
  if (!list.length && listing.image) list.push(listing.image);
  if (!list.length) list.push(fallback);
  return [...new Set(list)];
}
