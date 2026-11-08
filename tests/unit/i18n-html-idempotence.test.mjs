import { test } from 'node:test';
import assert from 'node:assert/strict';
import { I18nManager } from '../../js/features/i18n/i18n.js';

test('applyTranslations does not rewrite unchanged translated HTML', () => {
  const originalDocument = globalThis.document;
  let html = '<p>Cookie consent</p>';
  let writes = 0;

  const element = {
    dataset: { i18nHtml: 'footer.cookieHtml' },
    get innerHTML() { return html; },
    set innerHTML(value) {
      writes += 1;
      html = value;
    }
  };

  globalThis.document = {
    documentElement: { dataset: {} },
    title: '',
    querySelectorAll(selector) {
      return selector === '[data-i18n-html]' ? [element] : [];
    }
  };

  try {
    const manager = Object.create(I18nManager.prototype);
    manager.t = () => '<p>Cookie consent</p>';
    manager.applyTranslations();
    assert.equal(writes, 0);

    manager.t = () => '<p>Translated consent</p>';
    manager.applyTranslations();
    assert.equal(writes, 1);
    assert.equal(html, '<p>Translated consent</p>');
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
