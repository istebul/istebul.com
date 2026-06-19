import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_VEHICLE_FALLBACK,
  assertVehicleImageUrl,
  normalizeVehicleImageSlug,
  resolveVehicleImage,
  resolveVehicleImageUrl,
  resolveVehicleImageFallback,
  attachVehicleImageFallback,
  buildVehicleImageUiPayload,
  renderVehicleImageHtml,
  resolveAutoComparisonImageItem,
  resolveVehicleImageUrlForUi,
  VEHICLE_IMAGE_UNVERIFIED_LABEL
} from '../../js/auto/vehicle-image.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripVersion(url) {
  return String(url || '').split('?')[0];
}

test('Peugeot 308 returns brand-specific catalog image', () => {
  const url = resolveVehicleImage({ name: '2024 Peugeot 308 Allure' });
  assert.ok(url);
  assert.match(stripVersion(url), /peugeot-suv\.svg$/);
  assert.match(url, /\?v=image-v4$/);
});

test('Citroen C4 returns citroen catalog image', () => {
  const url = resolveVehicleImage({ name: '2024 Citroen C4 Max' });
  assert.ok(url);
  assert.match(stripVersion(url), /renault-clio-icon\.svg$/);
});

test('Skoda Kamiq returns skoda catalog image', () => {
  const url = resolveVehicleImage({ name: '2023 Skoda Kamiq Style' });
  assert.ok(url);
  assert.match(stripVersion(url), /skoda-family\.svg$/);
});

test('Seat Leon returns seat catalog image', () => {
  const url = resolveVehicleImage({ name: '2024 Seat Leon FR' });
  assert.ok(url);
  assert.match(stripVersion(url), /volkswagen-golf-tsi\.svg$/);
});

test('unknown model returns segment or premium fallback', () => {
  const url = resolveVehicleImage({ name: '2099 Unknown Brand X999' });
  assert.ok(url);
  assert.equal(assertVehicleImageUrl(url), url);
  assert.match(stripVersion(url), /^\/assets\/images\//);
});

test('normalizeVehicleImageSlug handles Turkish characters and spaces', () => {
  assert.equal(normalizeVehicleImageSlug('Citroën C4'), 'citroen-c4');
  assert.equal(normalizeVehicleImageSlug('Şkoda Kamiq'), 'skoda-kamiq');
  assert.equal(normalizeVehicleImageSlug('  Peugeot  308 '), 'peugeot-308');
});

test('null and undefined input does not throw', () => {
  assert.doesNotThrow(() => resolveVehicleImage(null));
  assert.doesNotThrow(() => resolveVehicleImage(undefined));
  assert.equal(stripVersion(resolveVehicleImage(null)), stripVersion(DEFAULT_VEHICLE_FALLBACK));
  assert.equal(stripVersion(resolveVehicleImage(undefined)), stripVersion(DEFAULT_VEHICLE_FALLBACK));
});

test('assertVehicleImageUrl never returns empty or undefined', () => {
  assert.equal(stripVersion(assertVehicleImageUrl('')), stripVersion(DEFAULT_VEHICLE_FALLBACK));
  assert.equal(stripVersion(assertVehicleImageUrl(null)), stripVersion(DEFAULT_VEHICLE_FALLBACK));
  assert.equal(stripVersion(assertVehicleImageUrl(undefined)), stripVersion(DEFAULT_VEHICLE_FALLBACK));
  assert.equal(stripVersion(assertVehicleImageUrl('undefined')), stripVersion(DEFAULT_VEHICLE_FALLBACK));
  assert.match(assertVehicleImageUrl('/assets/images/auto/peugeot-suv.svg'), /peugeot-suv\.svg\?v=image-v4$/);
});

test('resolveVehicleImageUrl is backward-compatible alias', () => {
  assert.equal(
    resolveVehicleImageUrl({ name: '2023 Toyota Corolla Cross Hybrid' }),
    resolveVehicleImage({ name: '2023 Toyota Corolla Cross Hybrid' })
  );
});

test('resolveVehicleImageFallback returns segment-based asset', () => {
  const url = resolveVehicleImageFallback({ name: 'Random SUV Model', segment: 'suv' });
  assert.ok(stripVersion(url).startsWith('/assets/images/'));
});

test('renderVehicleImageHtml produces safe non-empty src with lazy loading', () => {
  const html = renderVehicleImageHtml({ name: '2024 Peugeot 308' }, escapeHtml);
  assert.match(html, /src="[^"]+"/);
  assert.doesNotMatch(html, /src=""/);
  assert.doesNotMatch(html, /src="undefined"/);
  assert.match(html, /data-vehicle-image="1"/);
  assert.match(html, /data-image-trust="catalog_svg"/);
  assert.match(html, /data-image-match="partial_match"/);
  assert.match(html, /data-show-real-image="0"/);
  assert.match(html, /Görsel doğrulanamadı/);
  assert.match(html, /vehicle-premium-placeholder\.svg/);
  assert.doesNotMatch(html, /peugeot-suv\.svg/);
  assert.match(html, /width="/);
  assert.match(html, /height="/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /decoding="async"/);
  assert.match(html, /fetchpriority="/);
  assert.match(html, /\?v=image-v4/);
});

test('renderVehicleImageHtml catalog_svg trust renders placeholder not catalog SVG', () => {
  const html = renderVehicleImageHtml({ name: '2024 Citroen C4 Max' }, escapeHtml);
  assert.match(html, /vehicle-premium-placeholder\.svg/);
  assert.doesNotMatch(html, /renault-clio-icon\.svg/);
  assert.match(html, /data-image-trust="catalog_svg"/);
  assert.match(html, /Görsel doğrulanamadı/);
});

test('renderVehicleImageHtml placeholder/no_match renders unverified placeholder', () => {
  const html = renderVehicleImageHtml(null, escapeHtml);
  assert.match(html, /vehicle-premium-placeholder\.svg/);
  assert.match(html, /data-image-trust="placeholder"/);
  assert.match(html, /data-image-match="no_match"/);
  assert.match(html, /Görsel doğrulanamadı/);
});

test('renderVehicleImageHtml verified external keeps real image render', () => {
  const html = renderVehicleImageHtml({
    name: '2023 Toyota Corolla Cross Hybrid',
    image_url: 'https://cdn.example/toyota-corolla-cross-2023.jpg'
  }, escapeHtml);
  assert.match(html, /https:\/\/cdn\.example\/toyota-corolla-cross-2023\.jpg\?v=image-v4/);
  assert.match(html, /data-image-trust="verified_external"/);
  assert.match(html, /data-image-match="exact_match"/);
  assert.match(html, /data-show-real-image="1"/);
  assert.match(html, /data-fallback-brand=""/);
  assert.match(html, /data-final-fallback-src="[^"]*vehicle-premium-placeholder\.svg/);
  assert.doesNotMatch(html, /peugeot-suv\.svg/);
  assert.doesNotMatch(html, /Görsel doğrulanamadı/);
});

function createMockVehicleImage(initial = {}) {
  const listeners = {};
  return {
    src: initial.src || '',
    alt: initial.alt || '',
    title: initial.title || '',
    dataset: { ...(initial.dataset || {}) },
    parentElement: initial.parentElement || null,
    addEventListener(type, fn) {
      listeners[type] = fn;
    },
    dispatchError() {
      listeners.error?.();
    }
  };
}

test('attachVehicleImageFallback verified external error uses placeholder not catalog SVG', () => {
  const img = createMockVehicleImage();
  attachVehicleImageFallback(img, {
    name: '2023 Toyota Corolla Cross Hybrid',
    image_url: 'https://cdn.example/toyota-corolla-cross-2023.jpg'
  });

  assert.match(img.src, /toyota-corolla-cross-2023\.jpg/);
  assert.equal(img.dataset.imageTrust, 'verified_external');
  assert.equal(img.dataset.fallbackBrand, '');

  img.dispatchError();

  assert.match(stripVersion(img.src), /vehicle-premium-placeholder\.svg$/);
  assert.equal(img.dataset.showRealImage, '0');
  assert.equal(img.dataset.imageTrust, 'placeholder');
  assert.equal(img.dataset.imageMatch, 'no_match');
  assert.equal(img.alt, 'Görsel doğrulanamadı');
  assert.doesNotMatch(img.src, /toyota-corolla-cross-hybrid\.svg/);
});

test('attachVehicleImageFallback preserves verified DOM img then errors to placeholder', () => {
  const img = createMockVehicleImage({
    src: 'https://cdn.example/toyota.jpg?v=image-v4',
    dataset: {
      vehicleImage: '1',
      imageTrust: 'verified_external',
      showRealImage: '1',
      vehicleName: '2023 Toyota Corolla Cross Hybrid'
    }
  });

  attachVehicleImageFallback(img, { name: '2023 Toyota Corolla Cross Hybrid' });

  assert.match(img.src, /toyota\.jpg/);
  assert.equal(img.dataset.fallbackBound, '1');

  img.dispatchError();

  assert.match(stripVersion(img.src), /vehicle-premium-placeholder\.svg$/);
  assert.equal(img.alt, 'Görsel doğrulanamadı');
});

test('renderVehicleImageHtml sets high fetch priority for first vehicle', () => {
  const html = renderVehicleImageHtml({ name: '2024 Peugeot 308' }, escapeHtml, { isFirst: true });
  assert.match(html, /fetchpriority="high"/);
});

test('attachVehicleImageFallback sets placeholder for unverified catalog vehicles', () => {
  const img = {
    src: '',
    alt: '',
    dataset: {},
    addEventListener() {}
  };
  attachVehicleImageFallback(img, { name: '2024 Citroen C4 Max' });
  assert.ok(img.src);
  assert.match(stripVersion(img.src), /vehicle-premium-placeholder\.svg$/);
  assert.equal(img.dataset.showRealImage, '0');
  assert.equal(img.dataset.imageTrust, 'catalog_svg');
  assert.equal(img.dataset.fallbackBound, undefined);
});

test('resolveVehicleImageUrlForUi uses placeholder for catalog_svg trust', () => {
  const url = resolveVehicleImageUrlForUi({ name: '2024 Peugeot 308 Allure' });
  assert.match(stripVersion(url), /vehicle-premium-placeholder\.svg$/);
  assert.doesNotMatch(url, /peugeot-suv\.svg/);
});

test('resolveVehicleImageUrlForUi keeps verified external URL', () => {
  const url = resolveVehicleImageUrlForUi({
    name: '2023 Toyota Corolla Cross Hybrid',
    image_url: 'https://cdn.example/toyota-corolla-cross-2023.jpg'
  });
  assert.match(url, /toyota-corolla-cross-2023\.jpg/);
});

test('buildVehicleImageUiPayload includes imageTrust metadata', () => {
  const payload = buildVehicleImageUiPayload({ name: '2024 Citroen C4 Max' });
  assert.equal(payload.imageTrust.showRealImage, false);
  assert.equal(payload.imageTrust.sourceTrust, 'catalog_svg');
  assert.match(stripVersion(payload.imageUrl), /vehicle-premium-placeholder\.svg$/);
});

test('resolveAutoComparisonImageItem sanitizes legacy catalog SVG compare entries', () => {
  const resolved = resolveAutoComparisonImageItem({
    sourceType: 'isteBul Auto',
    title: '2024 Citroen C4 Max',
    image: '/assets/images/auto/renault-clio-icon.svg?v=image-v4'
  });
  assert.match(stripVersion(resolved.imageUrl), /vehicle-premium-placeholder\.svg$/);
  assert.equal(resolved.imageAlt, VEHICLE_IMAGE_UNVERIFIED_LABEL);
});

test('resolveAutoComparisonImageItem preserves verified external compare image', () => {
  const external = 'https://cdn.example/toyota-corolla-cross-2023.jpg?v=image-v4';
  const resolved = resolveAutoComparisonImageItem({
    sourceType: 'isteBul Auto',
    title: '2023 Toyota Corolla Cross Hybrid',
    image: external,
    imageTrust: {
      matchLevel: 'exact_match',
      sourceTrust: 'verified_external',
      showRealImage: true
    }
  });
  assert.equal(resolved.imageUrl, external);
  assert.equal(resolved.imageAlt, '2023 Toyota Corolla Cross Hybrid');
});
