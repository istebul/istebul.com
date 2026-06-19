import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeVehicleImageIdentity,
  resolveVehicleImageTrust
} from '../../js/auto/vehicle-image-resolver.js';

test('normalizeVehicleImageIdentity — explicit structured fields', () => {
  const identity = normalizeVehicleImageIdentity({
    brand: 'Peugeot',
    model: '308',
    model_year: 2024,
    trim: 'Allure',
    packageName: 'Comfort Pack',
    name: '2024 Peugeot 308 Allure'
  });

  assert.equal(identity.brand, 'Peugeot');
  assert.equal(identity.model, '308');
  assert.equal(identity.year, 2024);
  assert.equal(identity.trim, 'Allure');
  assert.equal(identity.packageName, 'Comfort Pack');
  assert.equal(identity.hasBrand, true);
  assert.equal(identity.hasModel, true);
  assert.equal(identity.hasYear, true);
  assert.equal(identity.hasTrim, true);
  assert.equal(identity.hasPackage, true);
});

test('normalizeVehicleImageIdentity — parses year and trim from display name', () => {
  const identity = normalizeVehicleImageIdentity({
    name: '2023 Peugeot 308 Allure'
  });

  assert.equal(identity.year, 2023);
  assert.equal(identity.brand, 'peugeot');
  assert.equal(identity.model, '308');
  assert.equal(identity.trim, 'Allure');
  assert.equal(identity.hasYear, true);
  assert.equal(identity.hasTrim, true);
  assert.equal(identity.hasPackage, false);
});

test('normalizeVehicleImageIdentity — does not treat hybrid as trim', () => {
  const identity = normalizeVehicleImageIdentity({
    name: '2023 Toyota Corolla Cross Hybrid'
  });

  assert.equal(identity.trim, null);
  assert.equal(identity.hasTrim, false);
  assert.equal(identity.year, 2023);
});

test('normalizeVehicleImageIdentity — ambiguous trailing sport token stays null trim', () => {
  const identity = normalizeVehicleImageIdentity({
    name: '2023 BMW 320i M Sport'
  });

  assert.equal(identity.trim, null);
  assert.equal(identity.hasTrim, false);
});

test('resolveVehicleImageTrust — catalog SVG includes identity checks and stays partial_match', () => {
  const trust = resolveVehicleImageTrust({
    name: '2023 Skoda Octavia Premium'
  });

  assert.equal(trust.matchLevel, 'partial_match');
  assert.equal(trust.sourceTrust, 'catalog_svg');
  assert.equal(trust.showRealImage, false);
  assert.equal(trust.checks.hasBrand, true);
  assert.equal(trust.checks.hasModel, true);
  assert.equal(trust.checks.hasYear, true);
  assert.equal(trust.checks.hasTrim, true);
  assert.equal(trust.checks.strictExactMatchReady, false);
  assert.equal(trust.identity.trim, 'Premium');
});

test('resolveVehicleImageTrust — verified external keeps showRealImage true with checks metadata', () => {
  const trust = resolveVehicleImageTrust({
    name: '2024 Citroen C4 Max',
    image_url: 'https://cdn.example/citroen-c4-max.jpg'
  });

  assert.equal(trust.showRealImage, true);
  assert.equal(trust.sourceTrust, 'verified_external');
  assert.equal(trust.checks.showRealImage, true);
  assert.equal(trust.checks.hasYear, true);
  assert.equal(trust.checks.hasTrim, true);
  assert.equal(trust.checks.strictExactMatchReady, true);
});

test('resolveVehicleImageTrust — null vehicle identity is empty', () => {
  const trust = resolveVehicleImageTrust(null);

  assert.equal(trust.matchLevel, 'no_match');
  assert.equal(trust.identity.hasBrand, false);
  assert.equal(trust.checks.strictExactMatchReady, false);
});
