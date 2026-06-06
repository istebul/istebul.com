/**
 * isteBul AI Listings — deterministic admin quality checklist (Sprint-7).
 */

/**
 * @param {Record<string, unknown>|null|undefined} listing
 * @param {Record<string, unknown>|null|undefined} latestAnalysis
 * @returns {Record<string, boolean>}
 */
export function buildQualityChecklist(listing, latestAnalysis = null) {
  const title = String(listing?.title ?? '').trim();
  const description = String(listing?.description ?? '').trim();
  const location = String(listing?.location ?? '').trim();
  const price = Number(listing?.price);
  const attributes = listing?.attributes;
  const images = listing?.images;

  const hasAttributes =
    attributes !== null &&
    attributes !== undefined &&
    typeof attributes === 'object' &&
    !Array.isArray(attributes) &&
    Object.keys(attributes).length > 0;

  const hasAnalysis =
    latestAnalysis !== null &&
    latestAnalysis !== undefined &&
    (latestAnalysis.id !== undefined ||
      latestAnalysis.ai_score !== undefined ||
      latestAnalysis.summary !== undefined);

  return {
    has_title: title.length > 0,
    has_price: Number.isFinite(price) && price > 0,
    has_location: location.length > 0,
    has_description: description.length > 0,
    has_attributes: hasAttributes,
    has_analysis: hasAnalysis,
    has_images: Array.isArray(images) && images.length > 0
  };
}

/**
 * @param {Record<string, boolean>} checklist
 * @returns {number}
 */
export function countChecklistPassed(checklist) {
  return Object.values(checklist).filter(Boolean).length;
}
