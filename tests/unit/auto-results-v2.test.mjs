import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_VEHICLE_FALLBACK,
  PREMIUM_VEHICLE_PLACEHOLDER,
  resolveLocalVehicleAsset,
  resolveVehicleImageUrl,
  toRecommendationVehicle,
  vehicleImageMatchesName
} from '../../js/auto/vehicle-image.js';
import {
  buildRankingCommentary,
  buildRecommendationPayload,
  buildVehicleAlternatives,
  buildWhyRecommendedCards
} from '../../js/auto/auto-results-model.js';

function stripVersion(url) {
  return String(url || '').split('?')[0];
}

test('resolveVehicleImageUrl prefers verified image_url over placeholder', () => {
  const url = resolveVehicleImageUrl({
    name: '2024 Citroen C4 Max',
    image_url: 'https://cdn.example/citroen-c4-max.jpg'
  });
  assert.match(url, /^https:\/\/cdn\.example\/citroen-c4-max\.jpg\?v=image-v4$/);
});

test('resolveVehicleImageUrl rejects unverified image_url and uses local asset', () => {
  assert.match(
    stripVersion(resolveVehicleImageUrl({
      name: '2023 Toyota Corolla Cross Hybrid',
      image_url: 'https://cdn.example/volkswagen-passat.jpg'
    })),
    /toyota-corolla-cross-hybrid\.svg$/
  );
  assert.equal(
    vehicleImageMatchesName(
      '2023 Toyota Corolla Cross Hybrid',
      'https://cdn.example/volkswagen-passat.jpg'
    ),
    false
  );
});

test('resolveLocalVehicleAsset maps catalog names to bundled SVG assets', () => {
  assert.match(
    stripVersion(resolveLocalVehicleAsset('2024 Citroen C4 Max') || ''),
    /renault-clio-icon\.svg$/
  );
  assert.match(stripVersion(resolveLocalVehicleAsset('2024 Volvo EX30') || ''), /peugeot-suv\.svg$/);
});

test('resolveVehicleImageUrl uses local asset before default fallback', () => {
  assert.equal(
    stripVersion(resolveVehicleImageUrl({ name: '2023 Toyota Corolla Cross Hybrid' })),
    '/assets/images/auto/toyota-corolla-cross-hybrid.svg'
  );
  assert.match(
    stripVersion(resolveVehicleImageUrl({ name: '2024 Citroen C4 Max' })),
    /renault-clio-icon\.svg$/
  );
  assert.equal(stripVersion(resolveVehicleImageUrl(null)), stripVersion(DEFAULT_VEHICLE_FALLBACK));
  assert.equal(PREMIUM_VEHICLE_PLACEHOLDER, DEFAULT_VEHICLE_FALLBACK);
});

test('toRecommendationVehicle keeps vehicle name and sets placeholder imageUrl for catalog SVG', () => {
  const rec = toRecommendationVehicle({ name: '2023 Toyota Corolla Cross Hybrid', price: 1_650_000 });
  assert.equal(rec.name, '2023 Toyota Corolla Cross Hybrid');
  assert.match(stripVersion(rec.imageUrl), /vehicle-premium-placeholder\.svg$/);
  assert.equal(rec.imageTrust.showRealImage, false);
  assert.equal(rec.imageTrust.sourceTrust, 'catalog_svg');
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
  assert.match(stripVersion(payload.vehicle.imageUrl), /vehicle-premium-placeholder\.svg$/);
  assert.equal(payload.vehicle.imageTrust.showRealImage, false);
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

test('buildRankingCommentary produces first/second/third rank explanations', () => {
  const leader = {
    name: '2023 Toyota Corolla Cross Hybrid',
    score: 94,
    scoreBreakdown: [{ label: 'Bütçe', positive: true, delta: 12, status: 'uyumlu' }],
    reasons: ['Hibrit verim']
  };
  const second = {
    name: '2024 Citroen C4 Max',
    score: 84,
    scoreBreakdown: [{ label: 'Bütçe', positive: true, delta: 4, status: 'sınırda' }],
    reasons: ['Bütçe uyumu']
  };
  const third = {
    name: '2024 Renault Clio Icon',
    score: 78,
    scoreBreakdown: [],
    reasons: ['Şehir içi']
  };

  const sections = buildRankingCommentary([leader, second, third], { usage: 'city' });
  assert.equal(sections.length, 3);
  assert.match(sections[0].title, /birinci sırada/i);
  assert.match(sections[1].title, /ikinci sıradaki/i);
  assert.match(sections[2].title, /üçüncü sıradaki/i);
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
