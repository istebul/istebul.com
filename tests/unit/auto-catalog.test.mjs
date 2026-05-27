import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVehicleCatalogUrl,
  buildVehicleCostProfilesUrl
} from '../../js/auto/auto-catalog.js';

test('vehicle_catalog URL avoids cache-bust query params that break PostgREST', () => {
  const url = buildVehicleCatalogUrl('https://example.supabase.co');
  assert.equal(
    url,
    'https://example.supabase.co/rest/v1/vehicle_catalog?select=*&is_active=eq.true&limit=500'
  );
  assert.doesNotMatch(url, /_ts=/);
});

test('vehicle_cost_profiles URL is valid REST shape', () => {
  const url = buildVehicleCostProfilesUrl('https://example.supabase.co/');
  assert.equal(url, 'https://example.supabase.co/rest/v1/vehicle_cost_profiles?select=*');
});
