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
    term: '60',
    capacity: '25k',
    rateSensitivity: 'orta'
  });

  assert.match(href, /term=60/);
  assert.match(href, /capacity=25k/);
  assert.match(href, /rate_sensitivity=orta/);
});

test('buildVerticalContinueHref omits invalid finans konut capacity 15k', () => {
  const href = buildVerticalContinueHref('finansman', {
    purpose: 'konut',
    capacity: '15k',
    rateSensitivity: 'orta'
  });

  assert.doesNotMatch(href, /capacity=/);
  assert.match(href, /rate_sensitivity=orta/);
});

test('buildVerticalContinueHref omits invalid finans tatil rate_sensitivity dusuk', () => {
  const href = buildVerticalContinueHref('finansman', {
    purpose: 'tatil',
    capacity: '25k',
    rateSensitivity: 'dusuk'
  });

  assert.match(href, /capacity=25k/);
  assert.doesNotMatch(href, /rate_sensitivity=/);
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

test('bootstrapFinansFromAssistantQuery maps capacity param to capacity_range', () => {
  const state = {
    purpose: '',
    term_months: '',
    amount_range: '',
    amount_manual: null,
    capacity_range: '',
    rate_sensitivity: ''
  };
  bootstrapFinansFromAssistantQuery(
    state,
    new URLSearchParams('purpose=konut&term=60&capacity=25k&rate_sensitivity=yuksek')
  );
  assert.equal(state.purpose, 'konut');
  assert.equal(state.term_months, '60');
  assert.equal(state.capacity_range, '25k');
  assert.equal(state.rate_sensitivity, 'yuksek');
});

test('bootstrapFinansFromAssistantQuery accepts capacity_range and rateSensitivity camelCase alias', () => {
  const state = {
    purpose: '',
    term_months: '',
    amount_range: '',
    amount_manual: null,
    capacity_range: '',
    rate_sensitivity: ''
  };
  bootstrapFinansFromAssistantQuery(
    state,
    new URLSearchParams('purpose=arac&capacity_range=40k&rateSensitivity=yuksek')
  );
  assert.equal(state.capacity_range, '40k');
  assert.equal(state.rate_sensitivity, 'yuksek');
});

test('bootstrapFinansFromAssistantQuery rejects invalid capacity and rate_sensitivity', () => {
  const state = {
    purpose: 'konut',
    term_months: '48',
    amount_range: '',
    amount_manual: null,
    capacity_range: '40k',
    rate_sensitivity: 'orta'
  };
  bootstrapFinansFromAssistantQuery(
    state,
    new URLSearchParams('purpose=konut&capacity=15k&rate_sensitivity=invalid')
  );
  assert.equal(state.capacity_range, '40k');
  assert.equal(state.rate_sensitivity, 'orta');
});

test('bootstrapFinansFromAssistantQuery rejects tatil rate_sensitivity dusuk for purpose', () => {
  const state = {
    purpose: '',
    term_months: '',
    amount_range: '',
    amount_manual: null,
    capacity_range: '',
    rate_sensitivity: ''
  };
  bootstrapFinansFromAssistantQuery(
    state,
    new URLSearchParams('purpose=tatil&rate_sensitivity=dusuk&capacity=25k')
  );
  assert.equal(state.purpose, 'tatil');
  assert.equal(state.capacity_range, '25k');
  assert.equal(state.rate_sensitivity, '');
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

test('bootstrapKaskoFromAssistantQuery round-trips usage_type risk and budget_level', () => {
  const state = {
    vehicle_category: '',
    vehicle_year_band: '',
    usage_type: '',
    coverage_level: '',
    risk_perception: '',
    budget_level: ''
  };
  bootstrapKaskoFromAssistantQuery(
    state,
    new URLSearchParams(
      'vehicle=otomobil&usage_type=ozel&coverage=standard&risk=orta&budget_level=orta&year=0-3'
    )
  );
  assert.equal(state.vehicle_category, 'otomobil');
  assert.equal(state.vehicle_year_band, '0-3');
  assert.equal(state.usage_type, 'ozel');
  assert.equal(state.coverage_level, 'standard');
  assert.equal(state.risk_perception, 'orta');
  assert.equal(state.budget_level, 'orta');
});

test('bootstrapKaskoFromAssistantQuery maps risk param to risk_perception state', () => {
  const state = {
    vehicle_category: 'otomobil',
    vehicle_year_band: '',
    usage_type: 'ozel',
    coverage_level: '',
    risk_perception: '',
    budget_level: ''
  };
  bootstrapKaskoFromAssistantQuery(state, new URLSearchParams('risk=yuksek'));
  assert.equal(state.risk_perception, 'yuksek');
});

test('bootstrapKaskoFromAssistantQuery accepts risk_perception alias', () => {
  const state = {
    vehicle_category: 'suv',
    vehicle_year_band: '',
    usage_type: 'ozel',
    coverage_level: '',
    risk_perception: '',
    budget_level: ''
  };
  bootstrapKaskoFromAssistantQuery(state, new URLSearchParams('risk_perception=yuksek'));
  assert.equal(state.risk_perception, 'yuksek');
});

test('bootstrapKaskoFromAssistantQuery rejects invalid usage_type risk and budget_level', () => {
  const state = {
    vehicle_category: 'otomobil',
    vehicle_year_band: '0-3',
    usage_type: 'ozel',
    coverage_level: 'standard',
    risk_perception: 'orta',
    budget_level: 'orta'
  };
  bootstrapKaskoFromAssistantQuery(
    state,
    new URLSearchParams('usage_type=invalid&risk=invalid&budget_level=invalid')
  );
  assert.equal(state.usage_type, 'ozel');
  assert.equal(state.risk_perception, 'orta');
  assert.equal(state.budget_level, 'orta');
});

test('bootstrapKaskoFromAssistantQuery rejects suv coverage mini without setting coverage', () => {
  const state = {
    vehicle_category: '',
    vehicle_year_band: '',
    usage_type: '',
    coverage_level: '',
    risk_perception: '',
    budget_level: ''
  };
  bootstrapKaskoFromAssistantQuery(
    state,
    new URLSearchParams('vehicle=suv&usage_type=ozel&coverage=mini')
  );
  assert.equal(state.vehicle_category, 'suv');
  assert.equal(state.usage_type, 'ozel');
  assert.equal(state.coverage_level, '');
});

test('bootstrapKaskoFromAssistantQuery rejects ticari_arac usage ozel', () => {
  const state = {
    vehicle_category: '',
    vehicle_year_band: '',
    usage_type: '',
    coverage_level: '',
    risk_perception: '',
    budget_level: ''
  };
  bootstrapKaskoFromAssistantQuery(
    state,
    new URLSearchParams('vehicle=ticari_arac&usage_type=ozel')
  );
  assert.equal(state.vehicle_category, 'ticari_arac');
  assert.equal(state.usage_type, '');
});

test('bootstrapKaskoFromAssistantQuery rejects motosiklet coverage full', () => {
  const state = {
    vehicle_category: '',
    vehicle_year_band: '',
    usage_type: '',
    coverage_level: '',
    risk_perception: '',
    budget_level: ''
  };
  bootstrapKaskoFromAssistantQuery(
    state,
    new URLSearchParams('vehicle=motosiklet&usage_type=ozel&coverage=full')
  );
  assert.equal(state.vehicle_category, 'motosiklet');
  assert.equal(state.usage_type, 'ozel');
  assert.equal(state.coverage_level, '');
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
