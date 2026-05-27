import test from 'node:test';
import assert from 'node:assert/strict';
import { apiErrorBody, apiSuccessBody } from '../../functions/_shared/api-response.js';

test('apiErrorBody uses consistent envelope', () => {
  const body = apiErrorBody('bad_request', 'Invalid payload', { field: 'x' });
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'bad_request');
  assert.equal(body.error.message, 'Invalid payload');
  assert.deepEqual(body.error.details, { field: 'x' });
});

test('apiSuccessBody uses consistent envelope', () => {
  const body = apiSuccessBody({ url: 'https://stripe.test' }, { requestId: 'abc' });
  assert.equal(body.ok, true);
  assert.equal(body.data.url, 'https://stripe.test');
  assert.equal(body.meta.requestId, 'abc');
});
