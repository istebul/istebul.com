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

  assert.match(html, /Bütçe/);
  assert.match(html, /3\.000\.000 TL/);
  assert.match(html, /geniş iç hacim/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /province/);
});

test('renderAssistantIntentSummary returns empty string without answer rows', () => {
  assert.equal(renderAssistantIntentSummary(null), '');
  assert.equal(
    renderAssistantIntentSummary({ categoryId: 'arac', answers: {}, summary: { mustHaves: [], dealBreakers: [] } }),
    ''
  );
});
