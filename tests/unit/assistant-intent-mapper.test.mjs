import test from 'node:test';
import assert from 'node:assert/strict';

const {
  mapIntentToAssistantAnswers,
  normalizeAssistantIntent,
  parseBudgetMax,
  deriveAssistantPriorityFromIntent
} = await import('../../js/features/assistant/intent-to-assistant-mapper.js');

const { buildVerticalContinueHref } = await import(
  '../../js/features/assistant/assistant-category-bridge.js'
);

test('maps SUV family intent to arac assistant answers', () => {
  const result = mapIntentToAssistantAnswers({
    categoryId: 'arac',
    budgetMax: 3000000,
    usagePurpose: 'family',
    body: 'suv',
    fuel: 'hybrid',
    priorities: ['az yaksın', 'bakım pahalı olmasın'],
    mustHaves: ['geniş iç hacim', 'düşük yakıt'],
    dealBreakers: ['yüksek bakım maliyeti'],
    missingQuestions: ['province', 'annual_km']
  });

  assert.ok(result);
  assert.equal(result.categoryId, 'arac');
  assert.equal(result.answers.budget, 3000000);
  assert.equal(result.answers.usage, 'family');
  assert.equal(result.answers.body, 'suv');
  assert.ok(['hybrid', 'any'].includes(result.answers.fuel));
  assert.equal(result.answers.priority, 'lowCost');
  assert.deepEqual(result.summary.mustHaves, ['geniş iç hacim', 'düşük yakıt']);
  assert.deepEqual(result.summary.dealBreakers, ['yüksek bakım maliyeti']);
  assert.deepEqual(result.summary.missingQuestions, ['province', 'annual_km']);
  assert.equal(result.answers.mustHaves, undefined);
  assert.equal(result.answers.dealBreakers, undefined);
});

test('omits invalid fuel body and usage from answers', () => {
  const result = mapIntentToAssistantAnswers({
    categoryId: 'arac',
    budgetMax: 1500000,
    usage: 'prestige-limo',
    fuel: 'nuclear',
    body: 'pickup',
    priority: 'lowCost'
  });

  assert.ok(result);
  assert.equal(result.answers.budget, 1500000);
  assert.equal(result.answers.usage, undefined);
  assert.equal(result.answers.fuel, undefined);
  assert.equal(result.answers.body, undefined);
  assert.equal(result.answers.priority, 'lowCost');
});

test('omits budget when budgetMax is negative or not parseable', () => {
  assert.equal(parseBudgetMax(-100), null);
  assert.equal(parseBudgetMax('not-a-budget'), null);

  const negative = mapIntentToAssistantAnswers({
    categoryId: 'arac',
    budgetMax: -500000,
    usage: 'city'
  });
  assert.ok(negative);
  assert.equal(negative.answers.budget, undefined);

  const stringBudget = mapIntentToAssistantAnswers({
    categoryId: 'arac',
    budgetMax: '3 milyon TL',
    usage: 'family',
    body: 'suv'
  });
  assert.ok(stringBudget);
  assert.equal(stringBudget.answers.budget, undefined);
});

test('parseBudgetMax accepts formatted TL amounts', () => {
  assert.equal(parseBudgetMax('3.000.000'), 3000000);
  assert.equal(parseBudgetMax('3.000.000 TL'), 3000000);
});

test('deriveAssistantPriorityFromIntent maps cost-related Turkish phrases to lowCost', () => {
  assert.equal(
    deriveAssistantPriorityFromIntent(['bakım pahalı olmasın', 'az yaksın'], null),
    'lowCost'
  );
  assert.equal(
    deriveAssistantPriorityFromIntent(['düşük maliyet', 'masraf'], null),
    'lowCost'
  );
});

test('returns null for unsupported categoryId', () => {
  assert.equal(mapIntentToAssistantAnswers({ categoryId: 'ev', budgetMax: 1000000 }), null);
  assert.equal(mapIntentToAssistantAnswers({ categoryId: 'tatil' }), null);
  assert.equal(normalizeAssistantIntent({ categoryId: 'konut' }), null);
});

test('defensive against malformed intent input', () => {
  assert.equal(mapIntentToAssistantAnswers(null), null);
  assert.equal(mapIntentToAssistantAnswers(undefined), null);
  assert.equal(mapIntentToAssistantAnswers('bad'), null);
});

test('mapped arac answers remain compatible with existing vertical handoff bridge', () => {
  const result = mapIntentToAssistantAnswers({
    categoryId: 'arac',
    budgetMax: 3000000,
    usage: 'family',
    body: 'suv',
    fuel: 'hybrid',
    priority: 'lowCost'
  });

  assert.ok(result);
  const href = buildVerticalContinueHref('arac', result.answers);
  assert.match(href, /^\/auto\/\?/);
  assert.match(href, /budget=3000000/);
  assert.match(href, /usage=family/);
  assert.match(href, /fuel=hybrid/);
  assert.match(href, /body=suv/);
});

test('maps city and household size into assistant answers', () => {
  const result = mapIntentToAssistantAnswers({
    categoryId: 'arac',
    budgetMax: 3000000,
    usagePurpose: 'family',
    body: 'suv',
    fuel: 'hybrid',
    city: 'Konya',
    householdSize: '3-4'
  });

  assert.ok(result);
  assert.equal(result.answers.province, 'Konya');
  assert.equal(result.answers.household_size, '3-4');
  assert.equal(result.answers.mustHaves, undefined);
});

test('drops invalid household size and city from answers', () => {
  const result = mapIntentToAssistantAnswers({
    categoryId: 'arac',
    usage: 'family',
    body: 'suv',
    city: 'şehir içi',
    householdSize: '9'
  });

  assert.ok(result);
  assert.equal(result.answers.province, undefined);
  assert.equal(result.answers.household_size, undefined);
});

test('keeps mustHaves and dealBreakers in summary only', () => {
  const result = mapIntentToAssistantAnswers({
    categoryId: 'arac',
    usage: 'family',
    body: 'suv',
    city: 'Konya',
    householdSize: '3-4',
    mustHaves: ['geniş bagaj'],
    dealBreakers: ['yüksek bakım']
  });

  assert.ok(result);
  assert.deepEqual(result.summary.mustHaves, ['geniş bagaj']);
  assert.deepEqual(result.summary.dealBreakers, ['yüksek bakım']);
  assert.equal(result.answers.mustHaves, undefined);
});

test('omits fuel from answers when fuel is absent after normalization', () => {
  const result = mapIntentToAssistantAnswers({
    categoryId: 'arac',
    budgetMax: 3000000,
    usagePurpose: 'family',
    body: 'suv',
    priority: 'lowCost'
  });

  assert.ok(result);
  assert.equal(result.answers.fuel, undefined);
});

test('title-cases lowercase city in mapped province answer', () => {
  const result = mapIntentToAssistantAnswers({
    categoryId: 'arac',
    usage: 'family',
    body: 'suv',
    city: 'izmir'
  });

  assert.ok(result);
  assert.equal(result.answers.province, 'İzmir');
});
