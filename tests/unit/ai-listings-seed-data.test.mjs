import test from 'node:test';
import assert from 'node:assert/strict';

const {
  VEHICLE_SEED_LISTINGS,
  HOUSING_SEED_LISTINGS,
  getAllSeedListings,
  validateSeedListingShape,
  SEED_SOURCE_TYPE
} = await import('../../src/ai-listings/seed/seed-data.js');

test('seed data contains 5 vehicle and 5 housing listings', () => {
  assert.equal(VEHICLE_SEED_LISTINGS.length, 5);
  assert.equal(HOUSING_SEED_LISTINGS.length, 5);
  assert.equal(getAllSeedListings().length, 10);
});

test('each seed listing has required realistic fields', () => {
  for (const record of getAllSeedListings()) {
    const validation = validateSeedListingShape(record);
    assert.equal(validation.valid, true, validation.errors.join(', '));
    assert.ok(record.title.length > 5);
    assert.ok(record.description.length > 20);
    assert.ok(record.price > 0);
    assert.ok(record.location.length > 3);
    assert.equal(record.currency, 'TRY');
  }
});

test('vehicle seed attributes include year mileage fuel', () => {
  for (const record of VEHICLE_SEED_LISTINGS) {
    assert.equal(record.category, 'vehicle');
    assert.ok(record.attributes.year > 1990);
    assert.ok(record.attributes.mileage >= 0);
    assert.ok(String(record.attributes.fuel_type).length > 0);
  }
});

test('housing seed attributes include sqm rooms building_age', () => {
  for (const record of HOUSING_SEED_LISTINGS) {
    assert.equal(record.category, 'housing');
    assert.ok(record.attributes.sqm > 0);
    assert.ok(record.attributes.rooms > 0);
    assert.ok(record.attributes.building_age >= 0);
  }
});

test('seed source type constant is manual_seed', () => {
  assert.equal(SEED_SOURCE_TYPE, 'manual_seed');
});
