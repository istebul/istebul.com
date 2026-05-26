import test from 'node:test';
import assert from 'node:assert/strict';

import {
  sanitizeAuthReturnPath,
  readAuthReturnFromLocation
} from '../../js/runtime/auth-return.js';

test('sanitizeAuthReturnPath allows internal app paths', () => {
  assert.equal(sanitizeAuthReturnPath('/auto/'), '/auto/');
  assert.equal(sanitizeAuthReturnPath('/profil?tab=billing'), '/profil?tab=billing');
});

test('sanitizeAuthReturnPath blocks auth loops and external URLs', () => {
  assert.equal(sanitizeAuthReturnPath('/giris'), null);
  assert.equal(sanitizeAuthReturnPath('/kayit?return=/auto/'), null);
  assert.equal(sanitizeAuthReturnPath('https://evil.test/phish'), null);
  assert.equal(sanitizeAuthReturnPath('//evil.test'), null);
});

test('readAuthReturnFromLocation parses return query', () => {
  assert.equal(readAuthReturnFromLocation('?return=%2Fauto%2F'), '/auto/');
  assert.equal(readAuthReturnFromLocation('?return=/giris'), null);
});
