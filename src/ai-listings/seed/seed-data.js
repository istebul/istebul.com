/**
 * isteBul AI Listings Engine — manual seed listings (Sprint-6).
 * Used by scripts/seed-ai-listings.cjs and unit tests.
 */

export const SEED_SOURCE_TYPE = 'manual_seed';

/** @typedef {import('../models/listing.js').ListingInput} ListingInput */

/** @type {ListingInput[]} */
export const VEHICLE_SEED_LISTINGS = [
  {
    category: 'vehicle',
    title: '2022 Toyota Corolla 1.6 Dream',
    description:
      'Tek elden, yetkili servis bakımlı. Şehir içi ekonomik kullanım. LPG dönüşümü yok, orijinal boyası.',
    price: 1_050_000,
    location: 'İstanbul, Kadıköy',
    currency: 'TRY',
    attributes: {
      brand: 'Toyota',
      model: 'Corolla',
      year: 2022,
      mileage: 42_000,
      fuel_type: 'benzin',
      transmission: 'otomatik'
    }
  },
  {
    category: 'vehicle',
    title: '2020 Volkswagen Passat 1.6 TDI',
    description: 'Uzun yol için ideal, düzenli bakım kayıtlı. İkinci el ekspertiz raporu mevcut.',
    price: 1_280_000,
    location: 'Ankara, Çankaya',
    currency: 'TRY',
    attributes: {
      brand: 'Volkswagen',
      model: 'Passat',
      year: 2020,
      mileage: 98_000,
      fuel_type: 'dizel',
      transmission: 'otomatik'
    }
  },
  {
    category: 'vehicle',
    title: '2018 Renault Clio 1.0 TCe Touch',
    description: 'Düşük yakıt tüketimi, şehir içi pratik hatchback. Değişensiz kaporta.',
    price: 620_000,
    location: 'İzmir, Bornova',
    currency: 'TRY',
    attributes: {
      brand: 'Renault',
      model: 'Clio',
      year: 2018,
      mileage: 118_000,
      fuel_type: 'benzin',
      transmission: 'manuel'
    }
  },
  {
    category: 'vehicle',
    title: '2023 Hyundai Tucson 1.6 T-GDI Elite',
    description: 'Sıfır ayarında SUV, hibrit batarya garantisi devam ediyor. Panoramik cam tavan.',
    price: 1_890_000,
    location: 'Antalya, Muratpaşa',
    currency: 'TRY',
    attributes: {
      brand: 'Hyundai',
      model: 'Tucson',
      year: 2023,
      mileage: 18_500,
      fuel_type: 'hibrit',
      transmission: 'otomatik'
    }
  },
  {
    category: 'vehicle',
    title: '2015 Ford Focus 1.6 TDCi Trend X',
    description: 'Yüksek kilometreli ama motor revizyonu yapılmış. Uygun fiyat segmenti.',
    price: 480_000,
    location: 'Bursa, Nilüfer',
    currency: 'TRY',
    attributes: {
      brand: 'Ford',
      model: 'Focus',
      year: 2015,
      mileage: 245_000,
      fuel_type: 'dizel',
      transmission: 'manuel'
    }
  }
];

/** @type {ListingInput[]} */
export const HOUSING_SEED_LISTINGS = [
  {
    category: 'housing',
    title: 'Kadıköy Moda 3+1 Satılık Daire',
    description: 'Deniz manzaralı, asansörlü binada, doğalgaz kombi. Metro ve vapur yürüme mesafesinde.',
    price: 6_800_000,
    location: 'İstanbul, Kadıköy',
    currency: 'TRY',
    attributes: {
      sqm: 125,
      rooms: 3,
      building_age: 12,
      usage_purpose: 'oturum',
      floor: 5
    }
  },
  {
    category: 'housing',
    title: 'Çankaya Oran 2+1 Yatırım Dairesi',
    description: 'Kiralık getirisi yüksek bölgede, site içi otopark ve güvenlik.',
    price: 3_450_000,
    location: 'Ankara, Çankaya',
    currency: 'TRY',
    attributes: {
      sqm: 95,
      rooms: 2,
      building_age: 6,
      usage_purpose: 'yatirim',
      floor: 8
    }
  },
  {
    category: 'housing',
    title: 'Bornova Evka-3 4+1 Geniş Aile Dairesi',
    description: 'Geniş salon, balkonlu, okul ve hastane yakını. Aidat düşük.',
    price: 4_200_000,
    location: 'İzmir, Bornova',
    currency: 'TRY',
    attributes: {
      sqm: 165,
      rooms: 4,
      building_age: 18,
      usage_purpose: 'oturum',
      floor: 3
    }
  },
  {
    category: 'housing',
    title: 'Muratpaşa Lara 1+1 Tatil & Kiralık',
    description: 'Yaz sezonu kısa dönem kiralama potansiyeli yüksek, eşyalı teslim.',
    price: 2_850_000,
    location: 'Antalya, Muratpaşa',
    currency: 'TRY',
    attributes: {
      sqm: 58,
      rooms: 1,
      building_age: 4,
      usage_purpose: 'yatirim',
      floor: 2
    }
  },
  {
    category: 'housing',
    title: 'Nilüfer Görükle 3+1 Sıfır Bina Daire',
    description: 'Üniversite bölgesinde, yeni yapı, enerji sınıfı A. Otopark dahil.',
    price: 3_950_000,
    location: 'Bursa, Nilüfer',
    currency: 'TRY',
    attributes: {
      sqm: 110,
      rooms: 3,
      building_age: 1,
      usage_purpose: 'oturum',
      floor: 6
    }
  }
];

/**
 * @returns {ListingInput[]}
 */
export function getAllSeedListings() {
  return [...VEHICLE_SEED_LISTINGS, ...HOUSING_SEED_LISTINGS];
}

/**
 * Validate seed record shape for tests.
 * @param {unknown} record
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSeedListingShape(record) {
  const errors = [];
  if (!record || typeof record !== 'object') {
    return { valid: false, errors: ['seed record must be an object'] };
  }

  const item = /** @type {Record<string, unknown>} */ (record);
  const required = ['category', 'title', 'description', 'price', 'location', 'attributes'];

  for (const field of required) {
    if (item[field] === undefined || item[field] === null || item[field] === '') {
      errors.push(`${field} is required`);
    }
  }

  if (!Number.isFinite(Number(item.price)) || Number(item.price) <= 0) {
    errors.push('price must be a positive number');
  }

  if (!item.attributes || typeof item.attributes !== 'object' || Array.isArray(item.attributes)) {
    errors.push('attributes must be an object');
  }

  return { valid: errors.length === 0, errors };
}
