/**
 * Bridge legacy user listings flow to AI listings engine intake.
 */

import { runAiListingBuilder } from '../ai-listings-builder/index.js';
import { mapUserListingRowToListing } from '../../src/ai-listings/repository/adapters/user-listings-repository.js';

/**
 * @param {Record<string, unknown>} listingData
 * @returns {Promise<{ ok: true, canonical: Record<string, unknown>, previewHtml: string } | { ok: false, message: string }>}
 */
export async function buildAiListingFromUserInput(listingData) {
  const textParts = [
    listingData.title,
    listingData.description,
    listingData.location,
    listingData.price ? `Fiyat: ${listingData.price} ${listingData.currency ?? 'TRY'}` : '',
    listingData.category ? `Kategori: ${listingData.category}` : ''
  ].filter(Boolean);

  const input = textParts.join('\n');
  if (!input.trim()) {
    return { ok: false, message: 'İlan metni boş olamaz.' };
  }

  try {
    const result = await runAiListingBuilder({ input, inputType: 'text' });
    if (!result?.canonical) {
      return { ok: false, message: 'AI ilan oluşturucu sonuç üretemedi.' };
    }
    return {
      ok: true,
      canonical: result.canonical,
      previewHtml: result.previewHtml ?? ''
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'AI ilan oluşturucu hatası'
    };
  }
}

/**
 * @param {Record<string, unknown>} legacyRow
 * @returns {Record<string, unknown>}
 */
export function mapLegacyListingToAiPayload(legacyRow) {
  const listing = mapUserListingRowToListing(legacyRow);
  return {
    category: listing.category,
    title: listing.title,
    description: listing.description,
    location: listing.location,
    price: listing.price,
    currency: listing.currency,
    images: listing.images,
    attributes: listing.attributes,
    source_type: 'user_listing',
    owner_user_id: legacyRow.user_id ?? null,
    source_url: legacyRow.external_url ?? null,
    status: 'draft'
  };
}

/**
 * Submit user listing to AI listings edge API.
 * @param {Record<string, unknown>} listingData
 * @param {{ baseUrl: string, secret: string, anonKey: string }} config
 */
export async function submitUserListingToAiEngine(listingData, config) {
  const payload = mapLegacyListingToAiPayload(listingData);
  const response = await fetch(`${config.baseUrl}/listings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'x-ai-listings-secret': config.secret
    },
    body: JSON.stringify(payload)
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: json?.message ?? json?.error?.message ?? 'AI ilan kaydı başarısız'
    };
  }

  return { ok: true, data: json?.data ?? json };
}
