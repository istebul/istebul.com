import test from 'node:test';
import assert from 'node:assert/strict';

const {
  isKararMahkemesiEnabled,
  KARAR_MAHKEMESI_URL_PARAM,
  KARAR_MAHKEMESI_STORAGE_KEY
} = await import('../../js/features/karar-mahkemesi/karar-mahkemesi-flags.js');

function createSearchParams(query = '') {
  return new URLSearchParams(query);
}

function createStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    }
  };
}

test('isKararMahkemesiEnabled defaults to false', () => {
  assert.equal(isKararMahkemesiEnabled(createSearchParams(''), createStorage()), false);
  assert.equal(isKararMahkemesiEnabled(), false);
});

test('isKararMahkemesiEnabled respects URL karar_mahkemesi=1', () => {
  const params = createSearchParams(`${KARAR_MAHKEMESI_URL_PARAM}=1`);
  assert.equal(isKararMahkemesiEnabled(params, createStorage()), true);
});

test('isKararMahkemesiEnabled respects URL karar_mahkemesi=0', () => {
  const params = createSearchParams(`${KARAR_MAHKEMESI_URL_PARAM}=0`);
  assert.equal(isKararMahkemesiEnabled(params, createStorage()), false);
});

test('isKararMahkemesiEnabled respects storage kararMahkemesiBeta=1', () => {
  const storage = createStorage({ [KARAR_MAHKEMESI_STORAGE_KEY]: '1' });
  assert.equal(isKararMahkemesiEnabled(createSearchParams(''), storage), true);
});

test('isKararMahkemesiEnabled respects storage kararMahkemesiBeta=0', () => {
  const storage = createStorage({ [KARAR_MAHKEMESI_STORAGE_KEY]: '0' });
  assert.equal(isKararMahkemesiEnabled(createSearchParams(''), storage), false);
});

test('URL param overrides storage when both are set', () => {
  const params = createSearchParams(`${KARAR_MAHKEMESI_URL_PARAM}=0`);
  const storage = createStorage({ [KARAR_MAHKEMESI_STORAGE_KEY]: '1' });
  assert.equal(isKararMahkemesiEnabled(params, storage), false);

  const paramsOn = createSearchParams(`${KARAR_MAHKEMESI_URL_PARAM}=1`);
  const storageOff = createStorage({ [KARAR_MAHKEMESI_STORAGE_KEY]: '0' });
  assert.equal(isKararMahkemesiEnabled(paramsOn, storageOff), true);
});

test('isKararMahkemesiEnabled does not throw without window or localStorage', () => {
  assert.doesNotThrow(() => {
    assert.equal(isKararMahkemesiEnabled(null, null), false);
    assert.equal(isKararMahkemesiEnabled({ get: () => null }, { getItem: () => null }), false);
  });
});
