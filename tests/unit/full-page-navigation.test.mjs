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
  assert.equal(isFullPageNavigation('/metodoloji'), true);
  assert.equal(isFullPageNavigation('/konut'), true);
  assert.equal(isFullPageNavigation('/rehber/suv-mi-sedan-mi/'), true);
  assert.equal(isFullPageNavigation('/rehber/tco-rehberi'), true);
  assert.equal(isFullPageNavigation('/garson/'), true);
  assert.equal(isFullPageNavigation('/garson/demo/'), true);
  assert.equal(isFullPageNavigation('/garson/panel/'), true);
});

test('resolveFullPageNavigation normalizes Auto trailing slash', () => {
  assert.equal(resolveFullPageNavigation('/auto'), '/auto/');
  assert.equal(resolveFullPageNavigation('/partner-olun'), '/partner-olun.html');
  assert.equal(resolveFullPageNavigation('/rehber/finansman-rehberi'), '/rehber/finansman-rehberi/');
  assert.equal(resolveFullPageNavigation('/rehber/'), '/rehber/');
  assert.equal(resolveFullPageNavigation('/garson'), '/garson/');
  assert.equal(resolveFullPageNavigation('/garson/'), '/garson/');
  assert.equal(resolveFullPageNavigation('/garson/demo'), '/garson/demo/');
});
