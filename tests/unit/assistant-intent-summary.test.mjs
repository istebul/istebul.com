import test from 'node:test';
import assert from 'node:assert/strict';

const { renderAssistantIntentSummary } = await import('../../js/ui/assistant-ui.js');

test('renderAssistantIntentSummary escapes values and keeps mustHaves in summary only', () => {
  const html = renderAssistantIntentSummary({
    categoryId: 'arac',
    answers: {
      budget: 3000000,
      usage: 'family',
      body: 'suv',
      priority: 'lowCost'
    },
    summary: {
      mustHaves: ['geniş iç hacim'],
      dealBreakers: ['<script>alert(1)</script>'],
      missingQuestions: ['province']
    }
  });

  assert.match(html, /Anladığımız kriterler/);
  assert.doesNotMatch(html, /Çıkarılan niyet/);
  assert.match(html, /Bütçe/);
  assert.match(html, /3\.000\.000 TL/);
  assert.match(html, /SUV/);
  assert.match(html, /geniş iç hacim/);
  assert.doesNotMatch(html, /\bgasoline\b/);
  assert.doesNotMatch(html, /\bsuv\b/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /şehir/);
  assert.doesNotMatch(html, /province/);
});

test('renderAssistantIntentSummary returns empty string without answer rows', () => {
  assert.equal(renderAssistantIntentSummary(null), '');
  assert.equal(
    renderAssistantIntentSummary({ categoryId: 'arac', answers: {}, summary: { mustHaves: [], dealBreakers: [] } }),
    ''
  );
});

test('renderAssistantIntentSummary maps missing question keys to friendly labels', () => {
  const html = renderAssistantIntentSummary({
    categoryId: 'arac',
    answers: {
      budget: 2000000,
      usage: 'city'
    },
    summary: {
      mustHaves: [],
      dealBreakers: [],
      missingQuestions: ['annual_km', 'fuel', 'body']
    }
  });

  assert.match(html, /yıllık km/);
  assert.match(html, /yakıt tercihi/);
  assert.match(html, /gövde tipi/);
  assert.doesNotMatch(html, /annual_km/);
});

test('renderAssistantIntentSummary maps fuel body and city labels to Turkish', () => {
  const html = renderAssistantIntentSummary({
    categoryId: 'arac',
    answers: {
      budget: 3000000,
      usage: 'family',
      fuel: 'gasoline',
      body: 'suv',
      province: 'izmir',
      priority: 'lowCost'
    },
    summary: {
      mustHaves: ['geniş'],
      dealBreakers: [],
      missingQuestions: []
    }
  });

  assert.match(html, /Yakıt tercihi/);
  assert.match(html, /Benzinli/);
  assert.match(html, /SUV/);
  assert.match(html, /İzmir/);
  assert.match(html, /Geniş iç hacim/);
  assert.doesNotMatch(html, /\bgasoline\b/);
  assert.doesNotMatch(html, /\bsuv\b/);
  assert.doesNotMatch(html, /izmir/);
});

test('renderAssistantIntentSummary maps hybrid and any fuel labels', () => {
  const hybridHtml = renderAssistantIntentSummary({
    categoryId: 'arac',
    answers: { fuel: 'hybrid', body: 'sedan' },
    summary: { mustHaves: [], dealBreakers: [], missingQuestions: [] }
  });
  assert.match(hybridHtml, /Hibrit/);
  assert.match(hybridHtml, /Sedan/);
  assert.doesNotMatch(hybridHtml, /\bhybrid\b/);

  const anyHtml = renderAssistantIntentSummary({
    categoryId: 'arac',
    answers: { fuel: 'any', body: 'hatchback' },
    summary: { mustHaves: [], dealBreakers: [], missingQuestions: [] }
  });
  assert.match(anyHtml, /Fark etmez/);
  assert.match(anyHtml, /Hatchback/);
});

test('renderAssistantIntentSummary omits fuel row when fuel answer is absent', () => {
  const html = renderAssistantIntentSummary({
    categoryId: 'arac',
    answers: {
      budget: 2000000,
      usage: 'family',
      body: 'suv'
    },
    summary: { mustHaves: [], dealBreakers: [], missingQuestions: [] }
  });

  assert.doesNotMatch(html, /Yakıt/);
  assert.match(html, /SUV/);
});
