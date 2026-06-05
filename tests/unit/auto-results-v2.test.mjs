import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PREMIUM_VEHICLE_PLACEHOLDER,
  resolveVehicleImageUrl,
  toRecommendationVehicle,
  vehicleImageMatchesName
} from '../../js/auto/vehicle-image.js';
import {
  buildRecommendationPayload,
  buildVehicleAlternatives,
  buildWhyRecommendedCards
} from '../../js/auto/auto-results-model.js';

test('resolveVehicleImageUrl prefers verified image_url over placeholder', () => {
  assert.equal(
    resolveVehicleImageUrl({
      name: '2024 Citroen C4 Max',
      image_url: 'https://cdn.example/citroen-c4-max.jpg'
    }),
    'https://cdn.example/citroen-c4-max.jpg'
  );
});

test('resolveVehicleImageUrl rejects unverified image_url for vehicle name', () => {
  assert.equal(
    resolveVehicleImageUrl({
      name: '2023 Toyota Corolla Cross Hybrid',
      image_url: 'https://cdn.example/volkswagen-passat.jpg'
    }),
    PREMIUM_VEHICLE_PLACEHOLDER
  );
  assert.equal(
    vehicleImageMatchesName(
      '2023 Toyota Corolla Cross Hybrid',
      'https://cdn.example/volkswagen-passat.jpg'
    ),
    false
  );
});

test('resolveVehicleImageUrl uses premium placeholder when no image_url', () => {
  assert.equal(
    resolveVehicleImageUrl({ name: '2024 Citroen C4 Max' }),
    PREMIUM_VEHICLE_PLACEHOLDER
  );
  assert.equal(resolveVehicleImageUrl(null), PREMIUM_VEHICLE_PLACEHOLDER);
});

test('toRecommendationVehicle keeps vehicle name and sets imageUrl', () => {
  const rec = toRecommendationVehicle({ name: '2023 Toyota Corolla Cross Hybrid', price: 1_650_000 });
  assert.equal(rec.name, '2023 Toyota Corolla Cross Hybrid');
  assert.equal(rec.imageUrl, PREMIUM_VEHICLE_PLACEHOLDER);
});

test('buildRecommendationPayload uses same vehicle for title and image', () => {
  const top = {
    name: '2024 Citroen C4 Max',
    price: 1_420_000,
    fuel: 'gasoline',
    costs: {
      fuel: 48000,
      ownership: {
        annual: { fuel: 52000 },
        purchaseCost: 1_420_000,
        financing: { annual: 120000 }
      }
    },
    confidenceMeta: { label: 'Yüksek', score: 82 }
  };
  const intel = {
    decisionScore: 78,
    confidenceScore: 82,
    executiveSummary: 'Citroen C4 Max profilinize uygun.',
    recommendationLabel: 'En Uygun'
  };
  const payload = buildRecommendationPayload(top, { usage: 'city' }, [top], intel);
  assert.equal(payload.vehicle.name, '2024 Citroen C4 Max');
  assert.equal(payload.vehicle.imageUrl, PREMIUM_VEHICLE_PLACEHOLDER);
  assert.match(payload.aiSummary, /Citroen C4 Max/);
});

test('buildVehicleAlternatives returns real ranked vehicles not generic advice', () => {
  const leader = { name: '2023 Toyota Corolla Cross Hybrid', score: 91, reasons: ['Hibrit verim'] };
  const alt = {
    name: '2024 Citroen C4 Max',
    score: 84,
    reasons: ['Bütçe uyumu'],
    costs: { total: 900000 }
  };
  const alts = buildVehicleAlternatives([leader, alt], leader, { usage: 'city' });
  assert.equal(alts.length, 1);
  assert.equal(alts[0].vehicle.name, '2024 Citroen C4 Max');
  assert.ok(alts[0].score > 0);
  assert.ok(alts[0].whySecond);
});

test('buildWhyRecommendedCards returns five recommendation cards', () => {
  const recommendation = {
    vehicle: { name: 'Test', fuel: 'hybrid', city: 8, maintenance: 7, resale: 8 },
    intelligence: {
      operatingCostScore: 80,
      budgetFitScore: 75,
      resaleScore: 82,
      reliabilityScore: 78
    }
  };
  const cards = buildWhyRecommendedCards(recommendation, { usage: 'city' });
  assert.equal(cards.length, 5);
  assert.equal(cards[0].title, 'Yakıt ekonomisi');
  assert.equal(cards[4].title, 'Güvenlik avantajı');
});
