import test from 'node:test';
import assert from 'node:assert/strict';
import { readStorageRaw, STORAGE_KEYS } from '../../js/core/storage-keys.js';

test('readStorageRaw migrates legacy cookie consent key', () => {
  const storage = {
    store: new Map(),
    getItem(key) {
      return this.store.get(key) ?? null;
    },
    setItem(key, value) {
      this.store.set(key, value);
    },
    removeItem(key) {
      this.store.delete(key);
    }
  };

  storage.setItem('istebu_cookie_consent', 'accepted');

  const value = readStorageRaw(STORAGE_KEYS.COOKIE_CONSENT, storage);
  assert.equal(value, 'accepted');
  assert.equal(storage.getItem(STORAGE_KEYS.COOKIE_CONSENT), 'accepted');
  assert.equal(storage.getItem('istebu_cookie_consent'), null);
});
