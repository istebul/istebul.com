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
  renderVehicleImageHtml
} from '../../js/auto/vehicle-image.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

test('Peugeot 308 returns valid image or fallback', () => {
  const url = resolveVehicleImage({ name: '2024 Peugeot 308 Allure' });
  assert.ok(url);
  assert.notEqual(url, '');
  assert.notEqual(url, 'undefined');
  assert.match(url, /peugeot-208\.jpg|peugeot-suv\.svg|vehicle-premium-placeholder/);
});

test('Citroen C4 returns valid image or fallback', () => {
  const url = resolveVehicleImage({ name: '2024 Citroen C4 Max' });
  assert.ok(url);
  assert.match(url, /peugeot-208\.jpg|peugeot-suv\.svg|vehicle-premium-placeholder/);
});

test('Skoda Kamiq returns valid image or fallback', () => {
  const url = resolveVehicleImage({ name: '2023 Skoda Kamiq Style' });
  assert.ok(url);
  assert.match(url, /audi-a3\.jpg|skoda-family\.svg|vehicle-premium-placeholder/);
});

test('Seat Leon returns valid image or fallback', () => {
  const url = resolveVehicleImage({ name: '2024 Seat Leon FR' });
  assert.ok(url);
  assert.match(url, /volkswagen-golf\.jpg|volkswagen-golf-tsi\.svg|vehicle-premium-placeholder/);
});

test('unknown model returns segment or premium fallback', () => {
  const url = resolveVehicleImage({ name: '2099 Unknown Brand X999' });
  assert.ok(url);
  assert.equal(assertVehicleImageUrl(url), url);
  assert.match(url, /^\/assets\/images\//);
});

test('normalizeVehicleImageSlug handles Turkish characters and spaces', () => {
  assert.equal(normalizeVehicleImageSlug('Citroën C4'), 'citroen-c4');
  assert.equal(normalizeVehicleImageSlug('Şkoda Kamiq'), 'skoda-kamiq');
  assert.equal(normalizeVehicleImageSlug('  Peugeot  308 '), 'peugeot-308');
});

test('null and undefined input does not throw', () => {
  assert.doesNotThrow(() => resolveVehicleImage(null));
  assert.doesNotThrow(() => resolveVehicleImage(undefined));
  assert.equal(resolveVehicleImage(null), DEFAULT_VEHICLE_FALLBACK);
  assert.equal(resolveVehicleImage(undefined), DEFAULT_VEHICLE_FALLBACK);
});

test('assertVehicleImageUrl never returns empty or undefined', () => {
  assert.equal(assertVehicleImageUrl(''), DEFAULT_VEHICLE_FALLBACK);
  assert.equal(assertVehicleImageUrl(null), DEFAULT_VEHICLE_FALLBACK);
  assert.equal(assertVehicleImageUrl(undefined), DEFAULT_VEHICLE_FALLBACK);
  assert.equal(assertVehicleImageUrl('undefined'), DEFAULT_VEHICLE_FALLBACK);
  assert.equal(
    assertVehicleImageUrl('/assets/images/vehicles/peugeot-208.jpg'),
    '/assets/images/vehicles/peugeot-208.jpg'
  );
});

test('resolveVehicleImageUrl is backward-compatible alias', () => {
  assert.equal(
    resolveVehicleImageUrl({ name: '2023 Toyota Corolla Cross Hybrid' }),
    resolveVehicleImage({ name: '2023 Toyota Corolla Cross Hybrid' })
  );
});

test('resolveVehicleImageFallback returns segment-based asset', () => {
  const url = resolveVehicleImageFallback({ name: 'Random SUV Model', segment: 'suv' });
  assert.ok(url.startsWith('/assets/images/'));
});

test('renderVehicleImageHtml produces safe non-empty src', () => {
  const html = renderVehicleImageHtml({ name: '2024 Peugeot 308' }, escapeHtml);
  assert.match(html, /src="[^"]+"/);
  assert.doesNotMatch(html, /src=""/);
  assert.doesNotMatch(html, /src="undefined"/);
  assert.match(html, /data-vehicle-image="1"/);
  assert.match(html, /width="/);
  assert.match(html, /height="/);
  assert.match(html, /aspect-ratio:/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /decoding="async"/);
});

test('attachVehicleImageFallback sets src without throwing', () => {
  const img = {
    src: '',
    alt: '',
    dataset: {},
    addEventListener() {}
  };
  attachVehicleImageFallback(img, { name: '2024 Citroen C4 Max' });
  assert.ok(img.src);
  assert.equal(img.dataset.fallbackBound, '1');
});
