import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRankScoreSpread, recommendVehicles } from '../../js/auto/auto-ai.js';
import {
  PREMIUM_VEHICLE_PLACEHOLDER,
  resolveVehicleImageUrl,
  vehicleImageMatchesName
} from '../../js/auto/vehicle-image.js';
import {
  formatVehicleFuelDisplay,
  formatVehicleResaleDisplay
} from '../../js/auto/auto-results-model.js';
import { vehicles } from '../../js/auto/auto-data.js';

test('applyRankScoreSpread separates tied top-3 scores', () => {
  const top = [
    { name: 'A', score: 94, scoreRaw: 120 },
    { name: 'B', score: 94, scoreRaw: 118 },
    { name: 'C', score: 94, scoreRaw: 115 }
  ];

  applyRankScoreSpread(top);

  assert.equal(top[0].score, 94);
  assert.equal(top[1].score, 91);
  assert.equal(top[2].score, 88);
  assert.notEqual(top[0].score, top[1].score);
  assert.notEqual(top[1].score, top[2].score);
});

test('applyRankScoreSpread preserves genuine score gaps', () => {
  const top = [
    { name: 'A', score: 94 },
    { name: 'B', score: 72 },
    { name: 'C', score: 58 }
  ];

  applyRankScoreSpread(top);

  assert.equal(top[0].score, 94);
  assert.equal(top[1].score, 72);
  assert.equal(top[2].score, 58);
});

test('recommendVehicles top 3 do not share identical scores for typical form', () => {
  const form = {
    budget: 1_600_000,
    body: 'sedan',
    fuel: 'gasoline',
    usage: 'family',
    km: 15_000,
    city_ratio: 0.6,
    ownership_months: 36,
    loan: 'yes'
  };

  const results = recommendVehicles(form, vehicles);
  assert.ok(results.length >= 3);

  const scores = results.slice(0, 3).map((vehicle) => vehicle.score);
  assert.equal(scores[0], 94);
  assert.equal(scores[1], 91);
  assert.equal(scores[2], 88);
  assert.equal(new Set(scores).size, 3);
});

test('vehicleImageMatchesName accepts matching brand and model in URL', () => {
  assert.equal(
    vehicleImageMatchesName(
      '2023 Toyota Corolla Cross Hybrid',
      'https://cdn.example.com/toyota-corolla-cross-2023.jpg'
    ),
    true
  );
  assert.equal(
    vehicleImageMatchesName(
      '2021 Volkswagen Passat Business',
      'https://cdn.example.com/vw-passat-business.jpg'
    ),
    true
  );
  assert.equal(
    vehicleImageMatchesName(
      '2023 Skoda Octavia Premium',
      'https://cdn.example.com/skoda-octavia-premium.png'
    ),
    true
  );
});

test('vehicleImageMatchesName rejects cross-model image reuse', () => {
  const sharedImage = 'https://cdn.example.com/toyota-corolla-sedan.jpg';

  assert.equal(
    vehicleImageMatchesName('2021 Volkswagen Passat Business', sharedImage),
    false
  );
  assert.equal(
    vehicleImageMatchesName('2023 Skoda Octavia Premium', sharedImage),
    false
  );
});

test('resolveVehicleImageUrl falls back to catalog asset for mismatched image_url', () => {
  const mismatch = {
    name: '2023 Skoda Octavia Premium',
    image_url: 'https://cdn.example.com/toyota-corolla.jpg'
  };

  assert.match(stripVersion(resolveVehicleImageUrl(mismatch)), /\/skoda\/kamiq-elite\.svg$/);
});

function stripVersion(url) {
  return String(url || '').split('?')[0];
}

test('resolveVehicleImageUrl ignores generic hero image_url and uses local asset', () => {
  assert.match(
    stripVersion(resolveVehicleImageUrl({
      name: '2023 Toyota Corolla Sedan Hybrid',
      image_url: '/assets/images/auto-hero.jpg'
    })),
    /toyota-corolla-sedan-hybrid\.jpg$/
  );
});

test('resolveVehicleImageUrl uses local asset when image_url is missing', () => {
  assert.match(
    stripVersion(resolveVehicleImageUrl({ name: '2023 Toyota Corolla Cross Hybrid' })),
    /toyota-corolla-cross-hybrid\.jpg$/
  );
});

test('resolveVehicleImageUrl uses brand catalog for Citroen and Seat', () => {
  assert.match(
    stripVersion(resolveVehicleImageUrl({ name: '2024 Citroen C4 Max' })),
    /\/citroen\/c4-max\.svg$/
  );
  assert.match(
    stripVersion(resolveVehicleImageUrl({ name: '2024 Seat Leon FR' })),
    /\/seat\/leon-fr\.svg$/
  );
});

test('formatVehicleFuelDisplay returns annual fuel amount instead of label text', () => {
  const value = formatVehicleFuelDisplay({
    fuel: 'diesel',
    costs: {
      fuel: 78_000,
      ownership: { annual: { fuel: 78_000 } }
    }
  });

  assert.match(value, /78\.000/);
  assert.match(value, /yıl/);
  assert.doesNotMatch(value, /tahmini/i);
});

test('formatVehicleFuelDisplay never returns empty string for computed costs', () => {
  const value = formatVehicleFuelDisplay({
    fuel: 'gasoline',
    costs: { fuel: 52_000 }
  });

  assert.ok(value.trim().length > 0);
  assert.notEqual(value, 'Yıllık yakıt tahmini');
});

test('formatVehicleResaleDisplay returns normalized strength label', () => {
  const high = formatVehicleResaleDisplay({ resale: 9 });
  const mid = formatVehicleResaleDisplay({ resale: 7.2 });

  assert.match(high, /Yüksek/);
  assert.match(high, /9\.0\/10/);
  assert.match(mid, /(Orta|Güçlü talep)/);
  assert.doesNotMatch(mid, /Segment tahmini/i);
});
