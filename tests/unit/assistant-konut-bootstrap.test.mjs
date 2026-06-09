import test from 'node:test';
import assert from 'node:assert/strict';

const {
  buildVerticalContinueHref,
  isValidKonutAssistantProvinceQuery,
  appendKonutAssistantQueryParams
} = await import('../../js/features/assistant/assistant-category-bridge.js');

const {
  bootstrapKonutFromAssistantQuery,
  mapAssistantKonutPurpose,
  mapAssistantKonutPropertyType
} = await import('../../js/real-estate/konut-assistant-bootstrap.js');

test('buildVerticalContinueHref emits validated konut query params', () => {
  const href = buildVerticalContinueHref('ev', {
    province: 'İstanbul',
    district: 'Kadıköy',
    propertyType: 'daire',
    purpose: 'live',
    budget: '7250000',
    location: 'central',
    priority: 'lowMonthly'
  });

  assert.match(href, /^\/konut\/\?/);
  assert.match(href, /budget=7250000/);
  assert.match(href, /province=%C4%B0stanbul|province=İstanbul/);
  assert.match(href, /district=Kad%C4%B1k%C3%B6y|district=Kadıköy/);
  assert.match(href, /purpose=live/);
  assert.match(href, /propertyType=daire/);
  assert.doesNotMatch(href, /location=/);
  assert.doesNotMatch(href, /priority=/);
});

test('buildVerticalContinueHref omits yazlik propertyType', () => {
  const href = buildVerticalContinueHref('ev', {
    province: 'İzmir',
    propertyType: 'yazlik',
    purpose: 'seasonal',
    budget: '5800000'
  });

  assert.doesNotMatch(href, /propertyType=/);
  assert.match(href, /purpose=seasonal/);
});

test('buildVerticalContinueHref rejects invalid province format', () => {
  const hrefDigits = buildVerticalContinueHref('ev', {
    province: 'İstanbul34',
    district: 'Merkez',
    purpose: 'live',
    budget: '1000000'
  });
  assert.doesNotMatch(hrefDigits, /province=/);

  const hrefTooShort = buildVerticalContinueHref('ev', {
    province: 'A',
    purpose: 'live',
    budget: '1000000'
  });
  assert.doesNotMatch(hrefTooShort, /province=/);
});

test('bootstrapKonutFromAssistantQuery maps assistant fields to konut state', () => {
  const state = {
    totalBudget: '',
    city: '',
    district: '',
    purchasePurpose: '',
    homeType: '',
    assistantPrefillHint: false
  };

  bootstrapKonutFromAssistantQuery(
    state,
    new URLSearchParams(
      'budget=7250000&province=İstanbul&district=Kadıköy&purpose=investment&propertyType=villa'
    )
  );

  assert.equal(state.totalBudget, '7250000');
  assert.equal(state.city, 'İstanbul');
  assert.equal(state.district, 'Kadıköy');
  assert.equal(state.purchasePurpose, 'Yatırım amaçlı düşünüyorum');
  assert.equal(state.homeType, 'Villa');
  assert.equal(state.assistantPrefillHint, true);
});

test('bootstrapKonutFromAssistantQuery ignores invalid values', () => {
  const state = {
    totalBudget: '4500000',
    city: 'Ankara',
    district: 'Çankaya',
    purchasePurpose: 'Kiralamak istiyorum',
    homeType: 'Daire',
    assistantPrefillHint: false
  };

  bootstrapKonutFromAssistantQuery(
    state,
    new URLSearchParams(
      'budget=-1&province=Atlantis&district=&purpose=unknown&propertyType=yazlik'
    )
  );

  assert.equal(state.totalBudget, '4500000');
  assert.equal(state.city, 'Ankara');
  assert.equal(state.district, 'Çankaya');
  assert.equal(state.purchasePurpose, 'Kiralamak istiyorum');
  assert.equal(state.homeType, 'Daire');
  assert.equal(state.assistantPrefillHint, false);
});

test('mapAssistantKonutPurpose and propertyType mappings', () => {
  assert.equal(mapAssistantKonutPurpose('live'), 'Satın almak istiyorum');
  assert.equal(mapAssistantKonutPurpose('investment'), 'Yatırım amaçlı düşünüyorum');
  assert.equal(mapAssistantKonutPurpose('seasonal'), 'Satın almak istiyorum');
  assert.equal(mapAssistantKonutPurpose('premium'), 'Satın almak istiyorum');
  assert.equal(mapAssistantKonutPurpose('rent'), null);

  assert.equal(mapAssistantKonutPropertyType('daire'), 'Daire');
  assert.equal(mapAssistantKonutPropertyType('mustakil'), 'Müstakil');
  assert.equal(mapAssistantKonutPropertyType('villa'), 'Villa');
  assert.equal(mapAssistantKonutPropertyType('yazlik'), null);
});

test('isValidKonutAssistantProvinceQuery enforces lightweight format rules', () => {
  assert.equal(isValidKonutAssistantProvinceQuery('İstanbul'), true);
  assert.equal(isValidKonutAssistantProvinceQuery('Şanlıurfa'), true);
  assert.equal(isValidKonutAssistantProvinceQuery("Mar'aş"), true);
  assert.equal(isValidKonutAssistantProvinceQuery('Atlantis'), true);
  assert.equal(isValidKonutAssistantProvinceQuery('A'), false);
  assert.equal(isValidKonutAssistantProvinceQuery('İstanbul34'), false);
  assert.equal(isValidKonutAssistantProvinceQuery(''), false);
});

test('appendKonutAssistantQueryParams never emits yazlik', () => {
  const params = new URLSearchParams();
  appendKonutAssistantQueryParams(params, {
    propertyType: 'yazlik',
    purpose: 'live',
    province: 'Antalya'
  });

  assert.equal(params.get('propertyType'), null);
  assert.equal(params.get('purpose'), 'live');
  assert.equal(params.get('province'), 'Antalya');
});
