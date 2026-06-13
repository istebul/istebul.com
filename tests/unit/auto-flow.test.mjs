import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAutoPartOptions,
  getAutoStepCopy,
  sanitizeWizardStateForUsage
} from '../../js/auto/auto-flow.js';

const bodyOptions = [
  { label: 'SUV', value: 'suv' },
  { label: 'Sedan', value: 'sedan' },
  { label: 'Hatchback', value: 'hatchback' }
];

const fuelOptions = [
  { label: 'Fark etmez', value: 'any' },
  { label: 'Hibrit', value: 'hybrid' },
  { label: 'Elektrikli', value: 'electric' },
  { label: 'Benzinli', value: 'gasoline' },
  { label: 'Dizel', value: 'diesel' }
];

const kmOptions = [
  { label: '10.000 km altı', value: '8000' },
  { label: '10.000 – 20.000 km', value: '15000' },
  { label: '20.000 – 35.000 km', value: '28000' },
  { label: '35.000 km+', value: '40000' },
  { label: 'Tam km gireceğim', value: 'custom' }
];

const cityRatioOptions = [
  { label: 'Ağırlıklı şehir içi', value: '0.85' },
  { label: 'Dengeli kullanım', value: '0.6' },
  { label: 'Ağırlıklı otoyol', value: '0.25' }
];

const optionPools = {
  body: bodyOptions,
  fuel: fuelOptions,
  km: kmOptions,
  city_ratio: cityRatioOptions
};

function valuesOf(options) {
  return options.map((option) => option.value);
}

test('getAutoPartOptions filters family usage body/fuel/km/city_ratio pools', () => {
  assert.deepEqual(valuesOf(getAutoPartOptions('body', 'family', bodyOptions)), ['suv', 'sedan']);
  assert.deepEqual(valuesOf(getAutoPartOptions('fuel', 'family', fuelOptions)), [
    'any',
    'hybrid',
    'gasoline'
  ]);
  assert.deepEqual(valuesOf(getAutoPartOptions('km', 'family', kmOptions)), [
    '8000',
    '15000',
    '28000',
    'custom'
  ]);
  assert.deepEqual(valuesOf(getAutoPartOptions('city_ratio', 'family', cityRatioOptions)), [
    '0.6',
    '0.85'
  ]);
});

test('getAutoPartOptions filters city usage body/fuel/km/city_ratio pools', () => {
  assert.deepEqual(valuesOf(getAutoPartOptions('body', 'city', bodyOptions)), ['hatchback', 'sedan']);
  assert.deepEqual(valuesOf(getAutoPartOptions('fuel', 'city', fuelOptions)), [
    'any',
    'hybrid',
    'electric',
    'gasoline'
  ]);
  assert.deepEqual(valuesOf(getAutoPartOptions('km', 'city', kmOptions)), ['8000', '15000', 'custom']);
  assert.deepEqual(valuesOf(getAutoPartOptions('city_ratio', 'city', cityRatioOptions)), [
    '0.85',
    '0.6'
  ]);
});

test('getAutoPartOptions filters long usage body/fuel/km/city_ratio pools', () => {
  assert.deepEqual(valuesOf(getAutoPartOptions('body', 'long', bodyOptions)), ['sedan', 'suv']);
  assert.deepEqual(valuesOf(getAutoPartOptions('fuel', 'long', fuelOptions)), [
    'diesel',
    'gasoline',
    'hybrid',
    'any'
  ]);
  assert.deepEqual(valuesOf(getAutoPartOptions('km', 'long', kmOptions)), [
    '15000',
    '28000',
    '40000',
    'custom'
  ]);
  assert.deepEqual(valuesOf(getAutoPartOptions('city_ratio', 'long', cityRatioOptions)), [
    '0.25',
    '0.6'
  ]);
});

test('getAutoPartOptions filters business usage body/fuel/km/city_ratio pools', () => {
  assert.deepEqual(valuesOf(getAutoPartOptions('body', 'business', bodyOptions)), ['sedan', 'suv']);
  assert.deepEqual(valuesOf(getAutoPartOptions('fuel', 'business', fuelOptions)), [
    'diesel',
    'gasoline',
    'hybrid'
  ]);
  assert.deepEqual(valuesOf(getAutoPartOptions('km', 'business', kmOptions)), [
    '28000',
    '40000',
    'custom'
  ]);
  assert.deepEqual(valuesOf(getAutoPartOptions('city_ratio', 'business', cityRatioOptions)), [
    '0.6',
    '0.25'
  ]);
});

test('getAutoPartOptions returns allOptions for unknown usage or empty pool', () => {
  assert.deepEqual(getAutoPartOptions('body', 'unknown', bodyOptions), bodyOptions);
  assert.deepEqual(getAutoPartOptions('body', 'family', []), []);
  assert.equal(getAutoPartOptions('body', 'family', null), null);
});

test('getAutoStepCopy returns usage-specific copy for step 1', () => {
  assert.deepEqual(getAutoStepCopy(1, 'family'), {
    title: 'Aile kullanımına uygun araç tipi ve yakıt',
    description: 'Geniş hacim ve güvenlik önceliğinize göre kasa ve yakıt önerilir.'
  });
  assert.deepEqual(getAutoStepCopy(1, 'city'), {
    title: 'Şehir içi kullanım için kasa ve yakıt',
    description: 'Park, manevra ve düşük tüketim odaklı seçenekler öne çıkar.'
  });
  assert.deepEqual(getAutoStepCopy(1, 'long'), {
    title: 'Uzun yol için konfor ve yakıt',
    description: 'Sürüş stabilitesi ve yakıt verimliliği önceliklendirilir.'
  });
  assert.deepEqual(getAutoStepCopy(1, 'business'), {
    title: 'İş kullanımı için araç profili',
    description: 'Prestij, verim ve yoğun km profiline uygun seçenekler.'
  });
});

test('getAutoStepCopy returns long-distance copy for step 2 and null fallback otherwise', () => {
  assert.deepEqual(getAutoStepCopy(2, 'long'), {
    title: 'Uzun yol kilometre ve bölge',
    description: 'Yüksek yıllık km ve otoyol ağırlığı maliyet tahminini belirler.'
  });
  assert.equal(getAutoStepCopy(2, 'family'), null);
  assert.equal(getAutoStepCopy(0, 'family'), null);
  assert.equal(getAutoStepCopy(1, 'unknown'), null);
});

test('sanitizeWizardStateForUsage clears invalid body after usage change', () => {
  const wizardState = { usage: 'family', body: 'hatchback', fuel: 'hybrid', km: '15000' };
  sanitizeWizardStateForUsage(wizardState, optionPools);
  assert.equal(wizardState.body, '');
  assert.equal(wizardState.fuel, 'hybrid');
});

test('sanitizeWizardStateForUsage clears invalid fuel after usage change', () => {
  const wizardState = { usage: 'long', body: 'sedan', fuel: 'electric', km: '15000' };
  sanitizeWizardStateForUsage(wizardState, optionPools);
  assert.equal(wizardState.fuel, '');
  assert.equal(wizardState.body, 'sedan');
});

test('sanitizeWizardStateForUsage clears invalid km after usage change', () => {
  const wizardState = { usage: 'business', body: 'sedan', fuel: 'diesel', km: '8000' };
  sanitizeWizardStateForUsage(wizardState, optionPools);
  assert.equal(wizardState.km, '');
  assert.equal(wizardState.fuel, 'diesel');
});

test('sanitizeWizardStateForUsage preserves valid selections for target usage', () => {
  const wizardState = {
    usage: 'long',
    body: 'sedan',
    fuel: 'diesel',
    km: '28000',
    city_ratio: '0.25'
  };
  sanitizeWizardStateForUsage(wizardState, optionPools);
  assert.equal(wizardState.body, 'sedan');
  assert.equal(wizardState.fuel, 'diesel');
  assert.equal(wizardState.km, '28000');
  assert.equal('city_ratio' in wizardState, false);
});

test('sanitizeWizardStateForUsage removes city_ratio for long and business usage', () => {
  const longState = { usage: 'long', body: 'sedan', city_ratio: '0.85' };
  sanitizeWizardStateForUsage(longState, optionPools);
  assert.equal('city_ratio' in longState, false);

  const businessState = { usage: 'business', body: 'suv', city_ratio: '0.6' };
  sanitizeWizardStateForUsage(businessState, optionPools);
  assert.equal('city_ratio' in businessState, false);
});

test('sanitizeWizardStateForUsage clears invalid city_ratio but keeps valid ratio for family', () => {
  const wizardState = {
    usage: 'family',
    body: 'suv',
    fuel: 'hybrid',
    km: '15000',
    city_ratio: '0.25'
  };
  sanitizeWizardStateForUsage(wizardState, optionPools);
  assert.equal(wizardState.city_ratio, '');
  assert.equal(wizardState.body, 'suv');

  const validState = {
    usage: 'family',
    body: 'suv',
    city_ratio: '0.85'
  };
  sanitizeWizardStateForUsage(validState, optionPools);
  assert.equal(validState.city_ratio, '0.85');
});

test('sanitizeWizardStateForUsage no-ops without usage', () => {
  const wizardState = { body: 'hatchback', fuel: 'electric' };
  sanitizeWizardStateForUsage(wizardState, optionPools);
  assert.equal(wizardState.body, 'hatchback');
  assert.equal(wizardState.fuel, 'electric');
});
