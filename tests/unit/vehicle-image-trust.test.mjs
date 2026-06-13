import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendImageCacheVersion,
  resolveVehicleDisplayImage,
  resolveVehicleImageTrust
} from '../../js/auto/vehicle-image-resolver.js';

function stripVersion(url) {
  return String(url || '').split('?')[0];
}

test('resolveVehicleImageTrust — verified external URL with brand/model match', () => {
  const vehicle = {
    name: '2024 Citroen C4 Max',
    image_url: 'https://cdn.example/citroen-c4-max.jpg'
  };

  const trust = resolveVehicleImageTrust(vehicle);

  assert.equal(trust.matchLevel, 'exact_match');
  assert.equal(trust.sourceTrust, 'verified_external');
  assert.equal(trust.showRealImage, true);
  assert.equal(trust.url, appendImageCacheVersion('https://cdn.example/citroen-c4-max.jpg'));
  assert.equal(trust.url, resolveVehicleDisplayImage(vehicle));
});

test('resolveVehicleImageTrust — catalog SVG exact map is partial_match, never real image', () => {
  const vehicle = { name: '2023 Skoda Octavia Premium' };
  const trust = resolveVehicleImageTrust(vehicle);

  assert.equal(trust.matchLevel, 'partial_match');
  assert.equal(trust.sourceTrust, 'catalog_svg');
  assert.equal(trust.showRealImage, false);
  assert.match(stripVersion(trust.url), /skoda-family\.svg$/);
  assert.equal(trust.url, resolveVehicleDisplayImage(vehicle));
});

test('resolveVehicleImageTrust — Citroen C4 cross-brand catalog SVG stays illustrative', () => {
  const vehicle = { name: '2024 Citroen C4 Max' };
  const trust = resolveVehicleImageTrust(vehicle);

  assert.equal(trust.matchLevel, 'partial_match');
  assert.equal(trust.sourceTrust, 'catalog_svg');
  assert.equal(trust.showRealImage, false);
  assert.match(stripVersion(trust.url), /renault-clio-icon\.svg$/);
});

test('resolveVehicleImageTrust — null vehicle is no_match placeholder', () => {
  const trust = resolveVehicleImageTrust(null);

  assert.equal(trust.matchLevel, 'no_match');
  assert.equal(trust.sourceTrust, 'placeholder');
  assert.equal(trust.showRealImage, false);
  assert.equal(trust.url, resolveVehicleDisplayImage(null));
});

test('resolveVehicleImageTrust — mismatched external URL falls back to catalog partial_match', () => {
  const vehicle = {
    name: '2023 Toyota Corolla Cross Hybrid',
    image_url: 'https://cdn.example/volkswagen-passat.jpg'
  };
  const trust = resolveVehicleImageTrust(vehicle);

  assert.equal(trust.matchLevel, 'partial_match');
  assert.equal(trust.sourceTrust, 'catalog_svg');
  assert.equal(trust.showRealImage, false);
  assert.match(stripVersion(trust.url), /toyota-corolla-cross-hybrid\.svg$/);
});

test('resolveVehicleImageTrust — url always matches resolveVehicleDisplayImage', () => {
  const cases = [
    { name: '2024 Peugeot 308 Allure' },
    { name: '2099 Unknown Brand X999' },
    null
  ];

  for (const vehicle of cases) {
    const trust = resolveVehicleImageTrust(vehicle);
    assert.equal(trust.url, resolveVehicleDisplayImage(vehicle), JSON.stringify(vehicle));
  }
});
