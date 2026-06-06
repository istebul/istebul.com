import test from 'node:test';
import assert from 'node:assert/strict';

const {
  createEmptyListing,
  computeScores,
  computeVehicleScores,
  computeVehicleMileageScore,
  computeVehicleAgeScore,
  computeHousingScores,
  computeHousingLocationScore,
  computeHousingPriceScore,
  runAnalysisPipeline,
  SCORING_ENGINE_VERSION
} = await import('../../src/ai-listings/index.js');

test('vehicle scoring returns category factor scores', () => {
  const listing = createEmptyListing({
    id: 'v-1',
    category: 'vehicle',
    title: 'Toyota Corolla',
    description: 'Low mileage, single owner.',
    price: 1_050_000,
    location: 'İstanbul',
    attributes: { year: 2022, mileage: 42000, fuel_type: 'benzin' }
  });

  const scores = computeVehicleScores(listing);
  assert.ok(scores.price_score >= 0 && scores.price_score <= 100);
  assert.ok(scores.mileage_score >= 0 && scores.mileage_score <= 100);
  assert.ok(scores.age_score >= 0 && scores.age_score <= 100);
  assert.ok(scores.fuel_score >= 0 && scores.fuel_score <= 100);
  assert.ok(scores.risk_score >= 0 && scores.risk_score <= 100);
  assert.equal(computeVehicleAgeScore(2023), 90);
  assert.equal(computeVehicleAgeScore(2022), 75);
  assert.equal(computeVehicleMileageScore(42000), 75);
});

test('housing scoring returns category factor scores', () => {
  const listing = createEmptyListing({
    id: 'h-1',
    category: 'housing',
    title: '3+1 Daire',
    description: 'Merkezi konumda satılık daire.',
    price: 6_800_000,
    location: 'İstanbul, Kadıköy',
    attributes: { sqm: 125, rooms: 3, building_age: 12, usage_purpose: 'oturum' }
  });

  const scores = computeHousingScores(listing);
  assert.ok(scores.price_score >= 0 && scores.price_score <= 100);
  assert.ok(scores.location_score >= 0 && scores.location_score <= 100);
  assert.ok(scores.size_score >= 0 && scores.size_score <= 100);
  assert.ok(scores.building_age_score >= 0 && scores.building_age_score <= 100);
  assert.ok(scores.risk_score >= 0 && scores.risk_score <= 100);
  assert.equal(computeHousingLocationScore('İstanbul'), 85);
  assert.ok(computeHousingPriceScore(6_800_000, 125, 'İstanbul') >= 35);
});

test('computeScores dispatches by category', () => {
  const vehicle = createEmptyListing({
    id: 'v-2',
    category: 'vehicle',
    title: 'VW Passat',
    price: 1_280_000,
    location: 'Ankara',
    attributes: { year: 2020, mileage: 98000, fuel_type: 'dizel' }
  });
  const housing = createEmptyListing({
    id: 'h-2',
    category: 'housing',
    title: '2+1',
    price: 3_450_000,
    location: 'Ankara',
    attributes: { sqm: 95, rooms: 2, building_age: 6 }
  });

  const vehicleScores = computeScores({ listing: vehicle });
  const housingScores = computeScores({ listing: housing });

  assert.ok(vehicleScores.factor_scores?.mileage_score !== undefined);
  assert.ok(housingScores.factor_scores?.location_score !== undefined);
  assert.equal(vehicleScores.scoring_version, SCORING_ENGINE_VERSION);
});

test('deterministic output for same listing input', async () => {
  const listing = createEmptyListing({
    id: 'det-1',
    category: 'vehicle',
    title: 'Hyundai Tucson',
    description: 'Hibrit SUV, düşük km.',
    price: 1_890_000,
    location: 'Antalya',
    attributes: { year: 2023, mileage: 18500, fuel_type: 'hibrit' }
  });

  const first = await runAnalysisPipeline({ listing });
  const second = await runAnalysisPipeline({ listing });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.deepEqual(first.analysis, second.analysis);
});

test('analysis output includes summary pros cons tags and scores', async () => {
  const listing = createEmptyListing({
    id: 'out-1',
    category: 'housing',
    title: 'Nilüfer Görükle 3+1',
    description: 'Yeni yapı, enerji sınıfı A.',
    price: 3_950_000,
    location: 'Bursa',
    attributes: { sqm: 110, rooms: 3, building_age: 1, usage_purpose: 'oturum' }
  });

  const result = await runAnalysisPipeline({ listing });
  assert.equal(result.ok, true);
  assert.ok(result.analysis.summary.includes('konut analizi'));
  assert.ok(result.analysis.pros.length > 0);
  assert.ok(result.analysis.cons.length > 0);
  assert.ok(result.analysis.tags.includes('housing'));
  assert.ok(result.analysis.tags.some((tag) => tag.startsWith('factor:')));
  assert.ok(Number.isFinite(result.analysis.ai_score));
  assert.ok(Number.isFinite(result.analysis.market_score));
  assert.ok(Number.isFinite(result.analysis.price_score));
  assert.ok(Number.isFinite(result.analysis.risk_score));
  assert.ok(result.analysis.confidence > 0 && result.analysis.confidence <= 1);
});
