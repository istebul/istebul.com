import test from 'node:test';
import assert from 'node:assert/strict';

const {
  isHttpOrHttpsUrl,
  validateCreateListingBody,
  validatePatchListingBody,
  parseListFilters
} = await import('../../supabase/functions/_shared/ai-listings/validation.js');

const { EDGE_ERROR_CODES } = await import('../../supabase/functions/_shared/ai-listings/errors.js');

test('isHttpOrHttpsUrl accepts http and https only', () => {
  assert.equal(isHttpOrHttpsUrl('https://example.com/listing'), true);
  assert.equal(isHttpOrHttpsUrl('http://example.com/listing'), true);
  assert.equal(isHttpOrHttpsUrl('javascript:alert(1)'), false);
  assert.equal(isHttpOrHttpsUrl('ftp://example.com'), false);
  assert.equal(isHttpOrHttpsUrl('not-a-url'), false);
});

test('validateCreateListingBody requires category and title', () => {
  const missing = validateCreateListingBody({});
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.code, EDGE_ERROR_CODES.INVALID_REQUEST);

  const ok = validateCreateListingBody({
    category: 'vehicle',
    title: 'Toyota Corolla',
    price: 950000,
    currency: 'TRY',
    images: ['https://cdn.example/img.jpg'],
    attributes: { year: 2020 }
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.value.category, 'vehicle');
    assert.equal(ok.value.currency, 'TRY');
  }
});

test('validateCreateListingBody rejects invalid source_url', () => {
  const result = validateCreateListingBody({
    category: 'housing',
    title: 'Daire',
    source_url: 'javascript:evil()'
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /http or https/i);
  }
});

test('validatePatchListingBody allows only permitted fields', () => {
  const invalid = validatePatchListingBody({ category: 'vehicle' });
  assert.equal(invalid.ok, false);

  const valid = validatePatchListingBody({ title: 'Updated title', price: 100 });
  assert.equal(valid.ok, true);
});

test('validatePatchListingBody rejects invalid source_url', () => {
  const result = validatePatchListingBody({ source_url: 'data:text/html,bad' });
  assert.equal(result.ok, false);
});

test('parseListFilters maps query params', () => {
  const params = new URLSearchParams('category=vehicle&status=draft&limit=20&offset=5');
  const filters = parseListFilters(params);
  assert.equal(filters.category, 'vehicle');
  assert.equal(filters.status, 'draft');
  assert.equal(filters.limit, 20);
  assert.equal(filters.offset, 5);
});
