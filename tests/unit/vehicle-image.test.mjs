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
  assert.match(html, /data-fallback-brand="/);
  assert.match(html, /data-fallback-segment="/);
  assert.match(html, /width="/);
  assert.match(html, /height="/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /decoding="async"/);
  assert.match(html, /fetchpriority="/);
  assert.match(html, /\?v=image-v4/);
});

test('renderVehicleImageHtml sets high fetch priority for first vehicle', () => {
  const html = renderVehicleImageHtml({ name: '2024 Peugeot 308' }, escapeHtml, { isFirst: true });
  assert.match(html, /fetchpriority="high"/);
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
