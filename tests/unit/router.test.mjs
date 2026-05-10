import test from 'node:test';
import assert from 'node:assert/strict';

const listeners = new Map();
const sections = new Map([
  ['home', { style: {} }],
  ['trust', { style: {} }],
  ['how-it-works', { style: {} }],
  ['decision-sample', { style: {} }],
  ['categories', { style: {} }],
  ['ilanlar', { style: {} }]
]);

global.window = {
  location: { pathname: '/' },
  history: { pushState: (_state, _title, path) => { global.window.location.pathname = path; } },
  addEventListener: (event, callback) => listeners.set(event, callback)
};

global.document = {
  title: '',
  addEventListener: () => {},
  dispatchEvent: () => {},
  querySelectorAll: (selector) => {
    if (selector === '.nav-link') return [];
    if (selector === 'main > section') return Array.from(sections.values());
    return [];
  },
  querySelector: () => null,
  getElementById: (id) => sections.get(id) || null
};

global.CustomEvent = class CustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
};

const { Router } = await import('../../js/core/router.js');

test('matchRoute resolves exact and dynamic listing routes', () => {
  const router = new Router();

  assert.deepEqual(router.matchRoute('/ilanlar'), { component: 'ilanlar', params: {} });
  assert.deepEqual(router.matchRoute('/ilan/test%20id'), {
    component: 'listing-detail',
    params: { id: 'test id' }
  });
  assert.equal(router.matchRoute('/bilinmeyen'), null);
});

test('handleRoute normalizes index.html and trailing slashes', () => {
  const router = new Router();

  global.window.location.pathname = '/index.html';
  router.handleRoute();
  assert.equal(global.document.title, 'isteBu - Modern İlan Platformu');

  global.window.location.pathname = '/ilanlar/';
  router.handleRoute();
  assert.equal(global.document.title, 'İlanlar - isteBu');
});
