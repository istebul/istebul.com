import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IMAGE_CACHE_VERSION,
  DEFAULT_VEHICLE_FALLBACK,
  PREMIUM_VEHICLE_PLACEHOLDER,
  appendImageCacheVersion,
  assertVehicleImageUrl,
  buildVehicleImageFallbackChain,
  imageSlugFromUrl,
  isApprovedCatalogImage,
  isRejectedImageUrl,
  isWatermarkImageUrl,
  normalizeVehicleSlug,
  resolveVehicleDisplayImage,
  resolveVehicleImageFallback,
  vehicleImageMatchesName
} from '../../js/auto/vehicle-image-resolver.js';

function stripVersion(url) {
  return String(url || '').split('?')[0];
}

test('exact match — Peugeot 308 Allure resolves to peugeot catalog asset', () => {
  const url = resolveVehicleDisplayImage({ name: '2024 Peugeot 308 Allure' });
  assert.match(stripVersion(url), /peugeot-suv\.svg$/);
});

test('exact match — Citroen C4 Max resolves to citroen catalog asset', () => {
  const url = resolveVehicleDisplayImage({ name: '2024 Citroen C4 Max' });
  assert.match(stripVersion(url), /renault-clio-icon\.svg$/);
});

test('exact match — Seat Leon FR resolves to seat catalog asset', () => {
  const url = resolveVehicleDisplayImage({ name: '2024 Seat Leon FR' });
  assert.match(stripVersion(url), /volkswagen-golf-tsi\.svg$/);
});

test('exact match — Skoda Kamiq Elite resolves to skoda catalog asset', () => {
  const url = resolveVehicleDisplayImage({ name: '2023 Skoda Kamiq Elite' });
  assert.match(stripVersion(url), /skoda-family\.svg$/);
});

test('turkish normalize — Citroën C4 Max slug', () => {
  assert.equal(normalizeVehicleSlug('Citroën C4 Max'), 'citroen-c4-max');
});

test('turkish normalize — Şkoda and İ characters', () => {
  assert.equal(normalizeVehicleSlug('Şkoda Kamiq'), 'skoda-kamiq');
  assert.equal(normalizeVehicleSlug('İstanbul'), 'istanbul');
});

test('turkish normalize — spaces and underscores', () => {
  assert.equal(normalizeVehicleSlug('Peugeot  308'), 'peugeot-308');
  assert.equal(normalizeVehicleSlug('seat_leon_fr'), 'seat-leon-fr');
});

test('duplicate prevention — same render batch assigns unique slugs', () => {
  const registry = new Set();
  const first = resolveVehicleDisplayImage({ name: '2024 Peugeot 308 Allure' }, { registry });
  const second = resolveVehicleDisplayImage({ name: '2024 Peugeot 308 Allure' }, { registry });
  assert.notEqual(imageSlugFromUrl(first), imageSlugFromUrl(second));
});

test('duplicate prevention — different vehicles keep distinct brand assets', () => {
  const registry = new Set();
  const citroen = resolveVehicleDisplayImage({ name: '2024 Citroen C4 Max' }, { registry });
  const peugeot = resolveVehicleDisplayImage({ name: '2024 Peugeot 308 Allure' }, { registry });
  const seat = resolveVehicleDisplayImage({ name: '2024 Seat Leon FR' }, { registry });
  const skoda = resolveVehicleDisplayImage({ name: '2023 Skoda Kamiq Style' }, { registry });

  const slugs = new Set([citroen, peugeot, seat, skoda].map(imageSlugFromUrl));
  assert.equal(slugs.size, 4);
});

test('watermark reject — mobile01 in URL is rejected', () => {
  assert.equal(isWatermarkImageUrl('/assets/images/vehicles/peugeot-308-mobile01.jpg'), true);
  assert.equal(isRejectedImageUrl('/assets/images/vehicles/peugeot-308-mobile01.jpg'), true);
});

test('watermark reject — preview and thumb patterns', () => {
  assert.equal(isWatermarkImageUrl('/cdn/preview/peugeot.jpg'), true);
  assert.equal(isWatermarkImageUrl('/cdn/thumb/seat.jpg'), true);
  assert.equal(isWatermarkImageUrl('/cdn/watermark-logo.jpg'), true);
});

test('placeholder fallback — null vehicle resolves to premium placeholder', () => {
  const url = resolveVehicleDisplayImage(null);
  assert.equal(stripVersion(url), stripVersion(PREMIUM_VEHICLE_PLACEHOLDER));
});

test('placeholder fallback — unknown brand eventually reaches safe fallback in chain', () => {
  const chain = buildVehicleImageFallbackChain({ name: '2099 Unknown Brand X999' });
  const last = chain[chain.length - 1];
  assert.ok(['segment', 'generic', 'placeholder'].includes(last.level));
  assert.match(stripVersion(last.url), /\/assets\/images\//);
});

test('segment fallback — SUV segment uses segment catalog asset', () => {
  const url = resolveVehicleImageFallback({ name: 'Random SUV Model', segment: 'suv' });
  assert.match(stripVersion(url), /\/assets\/images\//);
  assert.notEqual(stripVersion(url), stripVersion(PREMIUM_VEHICLE_PLACEHOLDER));
});

test('cache version — resolver appends image-v4 query param', () => {
  const url = resolveVehicleDisplayImage({ name: '2024 Peugeot 308 Allure' });
  assert.match(url, /\?v=image-v4$/);
  assert.equal(IMAGE_CACHE_VERSION, 'image-v4');
});

test('cache version — appendImageCacheVersion is idempotent', () => {
  const once = appendImageCacheVersion('/assets/images/vehicles/peugeot/308-allure.jpg');
  const twice = appendImageCacheVersion(once);
  assert.equal(once, twice);
});

test('seat — Seat Ibiza uses seat brand catalog', () => {
  const url = resolveVehicleDisplayImage({ name: '2022 Seat Ibiza Style' });
  assert.match(stripVersion(url), /volkswagen-golf-tsi\.svg$/);
});

test('citroen — Citroen C3 maps to citroen brand asset', () => {
  const url = resolveVehicleDisplayImage({ name: '2023 Citroen C3 Feel' });
  assert.match(stripVersion(url), /renault-clio-icon\.svg$/);
});

test('peugeot — Peugeot 208 resolves via exact catalog', () => {
  const url = resolveVehicleDisplayImage({ name: '2024 Peugeot 208 Active' });
  assert.match(stripVersion(url), /peugeot-suv\.svg$/);
});

test('skoda — Skoda Octavia resolves to skoda catalog asset', () => {
  const url = resolveVehicleDisplayImage({ name: '2023 Skoda Octavia Premium' });
  assert.match(stripVersion(url), /skoda-family\.svg$/);
});

test('invalid image — unverified remote URL is ignored', () => {
  const url = resolveVehicleDisplayImage({
    name: '2023 Toyota Corolla Cross Hybrid',
    image_url: 'https://cdn.example/volkswagen-passat.jpg'
  });
  assert.match(stripVersion(url), /toyota-corolla-cross-hybrid\.svg$/);
});

test('invalid image — generic hero image_url is rejected', () => {
  const url = resolveVehicleDisplayImage({
    name: '2023 Toyota Corolla Sedan Hybrid',
    image_url: '/assets/images/auto-hero.jpg'
  });
  assert.match(stripVersion(url), /toyota-corolla-cross-hybrid\.svg$/);
});

test('invalid image — catalog-outside local path is rejected', () => {
  assert.equal(isApprovedCatalogImage('/assets/images/vehicles/peugeot-308-mobile01.jpg'), false);
  assert.equal(
    vehicleImageMatchesName('2024 Peugeot 308', '/assets/images/vehicles/peugeot-308-mobile01.jpg'),
    false
  );
});

test('fallback chain — includes stepped levels ending at resolved asset', () => {
  const chain = buildVehicleImageFallbackChain({ name: '2024 Peugeot 308 Allure' });
  const levels = chain.map((entry) => entry.level);
  assert.ok(levels.includes('exact') || levels.includes('brand'));
  assert.ok(['exact', 'brand', 'segment', 'generic', 'placeholder'].includes(levels[levels.length - 1]));
});

test('assertVehicleImageUrl — never returns empty values', () => {
  assert.equal(stripVersion(assertVehicleImageUrl('')), stripVersion(DEFAULT_VEHICLE_FALLBACK));
  assert.match(assertVehicleImageUrl('/assets/images/auto/peugeot-suv.svg'), /\?v=image-v4$/);
});

test('verified image_url — accepted when name matches and no watermark', () => {
  const url = resolveVehicleDisplayImage({
    name: '2024 Citroen C4 Max',
    image_url: 'https://cdn.example/citroen-c4-max.jpg'
  });
  assert.equal(url, appendImageCacheVersion('https://cdn.example/citroen-c4-max.jpg'));
});

test('Toyota Corolla Cross resolves to toyota exact catalog', () => {
  const url = resolveVehicleDisplayImage({ name: '2023 Toyota Corolla Cross Hybrid' });
  assert.match(stripVersion(url), /toyota-corolla-cross-hybrid\.svg$/);
});

test('buildVehicleImageFallbackChain — deduplicates identical URLs', () => {
  const chain = buildVehicleImageFallbackChain({ name: '2024 Peugeot 308 Allure' });
  const slugs = chain.map((entry) => imageSlugFromUrl(entry.url));
  assert.equal(new Set(slugs).size, slugs.length);
});
