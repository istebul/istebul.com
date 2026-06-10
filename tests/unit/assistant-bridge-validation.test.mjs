import test from 'node:test';
import assert from 'node:assert/strict';

const { buildVerticalContinueHref, appendKonutAssistantQueryParams } = await import(
  '../../js/features/assistant/assistant-category-bridge.js'
);
const { applyAssistantQuestionFlow } = await import('../../js/features/assistant/assistant-flow.js');

const {
  bootstrapAutoFromAssistantQuery,
  bootstrapTatilFromAssistantQuery,
  bootstrapFinansFromAssistantQuery,
  bootstrapSigortaFromAssistantQuery,
  bootstrapKaskoFromAssistantQuery
} = await import('../../js/features/assistant/assistant-vertical-bootstrap.js');

test('buildVerticalContinueHref maps auto body mpv to suv', () => {
  const href = buildVerticalContinueHref('arac', {
    body: 'mpv',
    fuel: 'hybrid',
    usage: 'family',
    budget: '900000'
  });

  assert.match(href, /body=suv/);
  assert.match(href, /fuel=hybrid/);
  assert.match(href, /usage=family/);
});

test('bootstrapAutoFromAssistantQuery maps mpv body to suv', () => {
  const state = { body: '', fuel: '', usage: '', budget: '' };
  bootstrapAutoFromAssistantQuery(state, new URLSearchParams('body=mpv&fuel=diesel'));
  assert.equal(state.body, 'suv');
  assert.equal(state.fuel, 'diesel');
});

test('bootstrapAutoFromAssistantQuery preserves existing body when query body invalid', () => {
  const state = { body: 'suv', fuel: '', usage: '', budget: '' };
  bootstrapAutoFromAssistantQuery(state, new URLSearchParams('body=unknown&fuel=diesel'));
  assert.equal(state.body, 'suv');
  assert.equal(state.fuel, 'diesel');
});

test('buildVerticalContinueHref omits invalid finans konut term 120', () => {
  const href = buildVerticalContinueHref('finansman', {
    purpose: 'konut',
    budget: '1200000',
    term: '120'
  });

  assert.match(href, /purpose=konut/);
  assert.match(href, /amount=1200000/);
  assert.doesNotMatch(href, /term=/);
});

test('buildVerticalContinueHref keeps valid finans konut term 60', () => {
  const href = buildVerticalContinueHref('finansman', {
    purpose: 'konut',
    budget: '1200000',
    term: '60'
  });

  assert.match(href, /term=60/);
});

test('bootstrapFinansFromAssistantQuery rejects unsupported konut term without silent fallback', () => {
  const state = { purpose: 'konut', term_months: '48', amount_range: '', amount_manual: null };
  bootstrapFinansFromAssistantQuery(state, new URLSearchParams('purpose=konut&term=120'));
  assert.equal(state.purpose, 'konut');
  assert.equal(state.term_months, '48');
});

test('bootstrapFinansFromAssistantQuery applies purpose-aware valid term', () => {
  const state = { purpose: '', term_months: '', amount_range: '', amount_manual: null };
  bootstrapFinansFromAssistantQuery(state, new URLSearchParams('purpose=arac&term=48'));
  assert.equal(state.purpose, 'arac');
  assert.equal(state.term_months, '48');
});

test('buildVerticalContinueHref rejects invalid numeric budget for auto', () => {
  const href = buildVerticalContinueHref('arac', { budget: '-1', usage: 'city' });
  assert.doesNotMatch(href, /budget=/);
  assert.match(href, /usage=city/);
});

test('bootstrapSigortaFromAssistantQuery rejects unknown enum at read time', () => {
  const state = { insurance_type: '', risk_perception: '', budget_level: '' };
  bootstrapSigortaFromAssistantQuery(
    state,
    new URLSearchParams('type=unknown&risk=orta&budget_level=yuksek')
  );
  assert.equal(state.insurance_type, '');
  assert.equal(state.risk_perception, 'orta');
  assert.equal(state.budget_level, 'yuksek');
});

test('bootstrapSigortaFromAssistantQuery preserves valid state on invalid query', () => {
  const state = {
    insurance_type: 'saglik',
    risk_perception: 'orta',
    budget_level: 'dengeli'
  };
  bootstrapSigortaFromAssistantQuery(
    state,
    new URLSearchParams('type=unknown&risk=invalid&budget_level=invalid')
  );
  assert.equal(state.insurance_type, 'saglik');
  assert.equal(state.risk_perception, 'orta');
  assert.equal(state.budget_level, 'dengeli');
});

test('bootstrapTatilFromAssistantQuery ignores unknown vacation goal', () => {
  const state = { vacation_goal: 'deniz', budget_range: '', people_type: '', travelers_count: '' };
  bootstrapTatilFromAssistantQuery(state, new URLSearchParams('goal=unknown-destination'));
  assert.equal(state.vacation_goal, 'deniz');
});

test('bootstrapKaskoFromAssistantQuery rejects invalid coverage enum', () => {
  const state = { vehicle_category: 'suv', vehicle_year_band: '0-3', coverage_level: 'full' };
  bootstrapKaskoFromAssistantQuery(
    state,
    new URLSearchParams('vehicle=unknown&coverage=platinum&year=99')
  );
  assert.equal(state.vehicle_category, 'suv');
  assert.equal(state.vehicle_year_band, '0-3');
  assert.equal(state.coverage_level, 'full');
});

test('finansman konut fork limits term options to vertical wizard values', () => {
  const questions = [
    {
      id: 'term',
      options: [
        { value: '36', label: '36 ay' },
        { value: '48', label: '48 ay' },
        { value: '60', label: '60 ay' },
        { value: '120', label: '120 ay' }
      ]
    }
  ];
  const filtered = applyAssistantQuestionFlow('finansman', questions, { purpose: 'konut' });
  assert.deepEqual(
    filtered[0].options.map((option) => option.value),
    ['36', '48', '60']
  );
});

test('appendKonutAssistantQueryParams still rejects yazlik propertyType', () => {
  const params = new URLSearchParams();
  appendKonutAssistantQueryParams(params, {
    propertyType: 'yazlik',
    purpose: 'live',
    province: 'Antalya',
    budget: '5000000'
  });

  assert.equal(params.get('propertyType'), null);
  assert.equal(params.get('purpose'), 'live');
  assert.equal(params.get('province'), 'Antalya');
});
