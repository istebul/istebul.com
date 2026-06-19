/**
 * Deterministic published vehicle listings for /secenekler E2E + unit reuse.
 * Raw ai_listings row shape — compatible with mapPublishedListing / normalizeAiListingToOption.
 */

export const FIXTURE_IDS = Object.freeze({
  verifiedExternal: 'e2e00001-0001-4001-8001-000000000001',
  catalogSvg: 'e2e00002-0002-4002-8002-000000000002',
  noImage: 'e2e00003-0003-4003-8003-000000000003'
});

export const IMAGE_BADGE_LABELS = Object.freeze({
  verifiedExternal: 'Kaynak görseli',
  catalogSvg: 'Görsel doğrulanamadı',
  noImage: 'Görsel temsili'
});

const BASE_ROW = {
  status: 'published',
  category: 'vehicle',
  source_type: 'manual_seed',
  source_url: null,
  currency: 'TRY',
  location: 'İstanbul, Kadıköy',
  created_at: '2026-06-10T10:00:00.000Z',
  updated_at: '2026-06-10T10:00:00.000Z'
};

/** @type {Record<string, AiListingsRow>} */
export const SECENEKLER_VEHICLE_LISTING_FIXTURES = Object.freeze({
  verifiedExternal: {
    ...BASE_ROW,
    id: FIXTURE_IDS.verifiedExternal,
    title: '2024 Citroen C4 Max',
    description: 'E2E fixture — verified external vehicle image.',
    price: 1_250_000,
    images: ['https://cdn.example/citroen-c4-max.jpg'],
    attributes: {
      brand: 'Citroen',
      model: 'C4',
      year: 2024,
      trim: 'Max',
      province: 'İstanbul',
      district: 'Kadıköy'
    }
  },
  catalogSvg: {
    ...BASE_ROW,
    id: FIXTURE_IDS.catalogSvg,
    title: '2024 Citroen C4 Max',
    description: 'E2E fixture — catalog SVG in images[] must not render as real photo.',
    price: 1_180_000,
    images: ['/assets/images/auto/peugeot-suv.svg'],
    attributes: {
      brand: 'Citroen',
      model: 'C4',
      year: 2024,
      trim: 'Max',
      province: 'Ankara',
      district: 'Çankaya'
    }
  },
  noImage: {
    ...BASE_ROW,
    id: FIXTURE_IDS.noImage,
    title: '2024 Peugeot 308 Allure',
    description: 'E2E fixture — no listing images; placeholder + Görsel temsili badge.',
    price: 980_000,
    images: [],
    attributes: {
      brand: 'Peugeot',
      model: '308',
      year: 2024,
      trim: 'Allure',
      province: 'İzmir',
      district: 'Bornova'
    }
  }
});

/** Published vehicle rows returned by mocked ai_listings public REST queries. */
export const PUBLISHED_VEHICLE_LISTING_ROWS = Object.freeze([
  SECENEKLER_VEHICLE_LISTING_FIXTURES.verifiedExternal,
  SECENEKLER_VEHICLE_LISTING_FIXTURES.catalogSvg,
  SECENEKLER_VEHICLE_LISTING_FIXTURES.noImage
]);

export const CATALOG_SVG_FRAGMENT = 'peugeot-suv.svg';
