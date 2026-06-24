import test from 'node:test';
import assert from 'node:assert/strict';

const {
  extractAssistantIntentFromText,
  buildDeterministicAutoIntentFromText,
  parseBudgetFromNarrative,
  MIN_INTENT_TEXT_LENGTH,
  hasMeaningfulAutoSignals,
  shouldRejectNonAutoNarrative
} = await import('../../js/features/assistant/assistant-intent-extractor.js');

const SAMPLE_TEXT =
  '3 milyon TL bütçem var. SUV olsun. Az yaksın. 2 çocuk için geniş olsun. Bakımı pahalı olmasın.';

test('empty or very short text returns null', async () => {
  assert.equal(await extractAssistantIntentFromText(''), null);
  assert.equal(await extractAssistantIntentFromText('   '), null);
  assert.equal(await extractAssistantIntentFromText('kısa'), null);
  assert.ok(MIN_INTENT_TEXT_LENGTH >= 10);
});

test('deterministic fallback parses SUV family budget narrative', () => {
  const intent = buildDeterministicAutoIntentFromText(SAMPLE_TEXT);
  assert.ok(intent);
  assert.equal(intent.categoryId, 'arac');
  assert.equal(intent.budgetMax, 3000000);
  assert.equal(intent.usage, 'family');
  assert.equal(intent.body, 'suv');
  assert.equal(intent.fuel, 'hybrid');
  assert.equal(intent.priority, 'lowCost');
});

test('parseBudgetFromNarrative handles milyon and formatted amounts', () => {
  assert.equal(parseBudgetFromNarrative('3 milyon TL'), 3000000);
  assert.equal(parseBudgetFromNarrative('bütçem 3.000.000'), 3000000);
});

test('AI failure falls back to deterministic parser', async () => {
  const intent = await extractAssistantIntentFromText(SAMPLE_TEXT, {
    askAI: async () => {
      throw new Error('proxy down');
    }
  });

  assert.ok(intent);
  assert.equal(intent.categoryId, 'arac');
  assert.equal(intent.body, 'suv');
  assert.equal(intent.budgetMax, 3000000);
});

test('AI success path uses normalized assistant intent', async () => {
  const intent = await extractAssistantIntentFromText(SAMPLE_TEXT, {
    askAI: async () => ({
      result: JSON.stringify({
        categoryId: 'arac',
        budgetMax: 2800000,
        usagePurpose: 'family',
        body: 'suv',
        fuel: 'hybrid',
        priorities: ['lowCost'],
        mustHaves: ['geniş'],
        dealBreakers: [],
        missingQuestions: ['province']
      })
    })
  });

  assert.ok(intent);
  assert.equal(intent.budgetMax, 2800000);
  assert.equal(intent.usage, 'family');
  assert.deepEqual(intent.mustHaves, ['geniş']);
  assert.deepEqual(intent.missingQuestions, ['province']);
});

test('AI unsupported category falls back to deterministic arac parse for car narrative', async () => {
  const intent = await extractAssistantIntentFromText(SAMPLE_TEXT, {
    askAI: async () => ({
      result: JSON.stringify({
        categoryId: 'ev',
        budgetMax: 5000000
      })
    })
  });

  assert.ok(intent);
  assert.equal(intent.categoryId, 'arac');
  assert.equal(intent.body, 'suv');
});

test('AI unsupported category with no car signals returns null', async () => {
  const intent = await extractAssistantIntentFromText('merhaba dünya nasılsın bugün', {
    askAI: async () => ({
      result: JSON.stringify({
        categoryId: 'ev',
        budgetMax: 5000000
      })
    })
  });

  assert.equal(intent, null);
});

test('ambiguous text without auto signals returns null', () => {
  assert.equal(
    buildDeterministicAutoIntentFromText('merhaba nasılsın bugün hava güzel'),
    null
  );
  assert.equal(hasMeaningfulAutoSignals({ categoryId: 'arac', mustHaves: [], dealBreakers: [], missingQuestions: [] }), false);
});

test('budget-only narrative does not produce auto intent', () => {
  assert.equal(buildDeterministicAutoIntentFromText('3 milyon TL bütçem var'), null);
});

test('housing narrative with budget is rejected', () => {
  const housingText = 'İstanbul\'da 5 milyon TL daire arıyorum';
  assert.ok(shouldRejectNonAutoNarrative(housingText));
  assert.equal(buildDeterministicAutoIntentFromText(housingText), null);
});

test('travel narrative with budget is rejected', () => {
  const travelText = 'Tatil için 100 bin TL bütçem var';
  assert.ok(shouldRejectNonAutoNarrative(travelText));
  assert.equal(buildDeterministicAutoIntentFromText(travelText), null);
});

test('compact auto narrative with budget and SUV produces intent', () => {
  const intent = buildDeterministicAutoIntentFromText('3 milyon TL bütçem var SUV olsun az yaksın');
  assert.ok(intent);
  assert.equal(intent.categoryId, 'arac');
  assert.equal(intent.budgetMax, 3000000);
  assert.equal(intent.body, 'suv');
  assert.equal(intent.fuel, 'hybrid');
});

test('family vehicle narrative with maintenance signals produces intent', () => {
  const intent = buildDeterministicAutoIntentFromText(
    '2 çocuk için geniş araç arıyorum, bakım pahalı olmasın'
  );
  assert.ok(intent);
  assert.equal(intent.categoryId, 'arac');
  assert.equal(intent.usage, 'family');
  assert.equal(intent.householdSize, '3-4');
  assert.equal(intent.priority, 'lowCost');
});

test('Konya SUV narrative carries city and auto intent', () => {
  const intent = buildDeterministicAutoIntentFromText('Konya\'da 3 milyon TL SUV arıyorum');
  assert.ok(intent);
  assert.equal(intent.categoryId, 'arac');
  assert.equal(intent.city, 'Konya');
  assert.equal(intent.body, 'suv');
  assert.equal(intent.budgetMax, 3000000);
});

test('large family narrative maps household size to 5+', () => {
  const intent = buildDeterministicAutoIntentFromText('5 kişilik aile için geniş araç arıyorum');
  assert.ok(intent);
  assert.equal(intent.householdSize, '5+');
  assert.equal(intent.usage, 'family');
});

test('city usage profile does not set geographic city', () => {
  const intent = buildDeterministicAutoIntentFromText('şehir içi kullanım için araç arıyorum');
  assert.ok(intent);
  assert.equal(intent.usage, 'city');
  assert.equal(intent.city, null);
});

test('AI failure still rejects non-auto housing narrative', async () => {
  const housingText = 'İstanbul\'da 5 milyon TL daire arıyorum';
  const intent = await extractAssistantIntentFromText(housingText, {
    askAI: async () => {
      throw new Error('proxy down');
    }
  });

  assert.equal(intent, null);
});

test('AI success is blocked for non-auto housing narrative', async () => {
  const housingText = 'İstanbul\'da 5 milyon TL daire arıyorum';
  const intent = await extractAssistantIntentFromText(housingText, {
    askAI: async () => ({
      result: JSON.stringify({
        categoryId: 'arac',
        budgetMax: 5000000,
        body: 'suv'
      })
    })
  });

  assert.equal(intent, null);
});
