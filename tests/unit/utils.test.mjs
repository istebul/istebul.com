import test from 'node:test';
import assert from 'node:assert/strict';

const { Utils } = await import('../../js/core/utils.js');

test('validateEmail returns true for valid email addresses', () => {
  assert.equal(Utils.validateEmail('user@example.com'), true);
  assert.equal(Utils.validateEmail('user.name+tag@local.co'), true);
});

test('validateEmail returns false for invalid email addresses', () => {
  assert.equal(Utils.validateEmail('user@@example.com'), false);
  assert.equal(Utils.validateEmail('not-an-email'), false);
});

test('validatePhone accepts valid Turkish phone formats', () => {
  assert.equal(Utils.validatePhone('+905551234567'), true);
  assert.equal(Utils.validatePhone('05551234567'), true);
  assert.equal(Utils.validatePhone('0555 123 4567'), true);
});

test('validatePhone rejects invalid phone numbers', () => {
  assert.equal(Utils.validatePhone('123456'), false);
  assert.equal(Utils.validatePhone('+901234567890'), false);
});

test('slugify normalizes text into URL-friendly slugs', () => {
  assert.equal(Utils.slugify('  İstanbul Taksi - 2026 '), 'istanbul-taksi-2026');
  assert.equal(Utils.slugify('Fiat Egea / 1.3 MT'), 'fiat-egea-13-mt');
});

test('isEmpty returns true for empty or null values', () => {
  assert.equal(Utils.isEmpty({}), true);
  assert.equal(Utils.isEmpty(null), true);
  assert.equal(Utils.isEmpty(undefined), true);
});

test('isEmpty returns false for non-empty objects', () => {
  assert.equal(Utils.isEmpty({ a: 1 }), false);
});

test('buildQueryString constructs query strings from params', () => {
  assert.equal(Utils.buildQueryString({ page: 1, q: 'test' }), '?page=1&q=test');
  assert.equal(Utils.buildQueryString({ page: 0, filter: null }), '?page=0');
});
