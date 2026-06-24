import test from 'node:test';
import assert from 'node:assert/strict';

const {
  extractAssistantIntentFromText,
  buildDeterministicAutoIntentFromText,
  parseBudgetFromNarrative,
  MIN_INTENT_TEXT_LENGTH,
  hasMeaningfulAutoSignals
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
