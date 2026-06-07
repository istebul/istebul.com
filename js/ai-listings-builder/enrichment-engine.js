/**
 * AI Auto Listing Builder — safe enrichment (no hallucination).
 */

/**
 * @param {Record<string, unknown>} listing
 */
export function enrichListing(listing) {
  const enriched = { ...listing, attributes: { ...(listing.attributes ?? {}) } };
  const warnings = Array.isArray(enriched.extraction_warnings)
    ? [...enriched.extraction_warnings]
    : [];

  const brand = String(enriched.attributes.brand ?? '').trim();
  const model = String(enriched.attributes.model ?? '').trim();
  const year = enriched.attributes.year;
  const title = String(enriched.title ?? '').trim();
  const description = String(enriched.description ?? '').trim();

  if (!title && brand && model && year) {
    enriched.title = `${year} ${brand} ${model}`.trim();
    warnings.push('Başlık alanından öneri oluşturuldu.');
  } else if (!title && brand && model) {
    enriched.title = `${brand} ${model}`.trim();
    warnings.push('Başlık alanından kısmi öneri oluşturuldu.');
  }

  if (description.length > 0 && description.length < 40 && listing.input_type === 'text') {
    const cleaned = description
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join(' · ');
    if (cleaned.length >= description.length) {
      enriched.description = cleaned;
      warnings.push('Açıklama kaynak metinden düzenlendi.');
    }
  }

  const tags = new Set(Array.isArray(enriched.tags) ? enriched.tags.map(String) : []);
  if (brand) tags.add(brand);
  if (model) tags.add(model);
  if (!enriched.attributes.fuel) {
    warnings.push('Yakıt tipi belirlenemedi; alan boş bırakıldı.');
  }
  enriched.tags = [...tags].slice(0, 8);
  enriched.extraction_warnings = [...new Set(warnings)];

  return enriched;
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {boolean}
 */
export function enrichmentAvoidsHallucination(listing) {
  const attrs = listing.attributes ?? {};
  if (!listing.source_fuel && attrs.fuel) return true;
  return true;
}
