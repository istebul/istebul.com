import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isFullPageNavigation,
  resolveFullPageNavigation
} from '../../js/runtime/full-page-navigation.js';

test('isFullPageNavigation detects Auto and partner HTML', () => {
  assert.equal(isFullPageNavigation('/auto/'), true);
  assert.equal(isFullPageNavigation('/partner-olun.html'), true);
  assert.equal(isFullPageNavigation('/ilanlar'), false);
  assert.equal(isFullPageNavigation('/metodoloji'), false);
});

test('resolveFullPageNavigation normalizes Auto trailing slash', () => {
  assert.equal(resolveFullPageNavigation('/auto'), '/auto/');
  assert.equal(resolveFullPageNavigation('/partner-olun'), '/partner-olun.html');
});
