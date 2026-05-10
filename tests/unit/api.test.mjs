import test from 'node:test';
import assert from 'node:assert/strict';

global.window = {
  __env: {},
  supabase: {
    createClient: () => ({
      auth: {},
      from: () => ({})
    })
  }
};

global.document = {
  addEventListener: () => {}
};

const { API } = await import('../../js/core/api.js');

test('sanitizeSearchTerm removes Supabase wildcard/control characters and limits length', () => {
  const dirty = '%Toyota_(Corolla), Kadıköy '.repeat(10);
  const clean = API.sanitizeSearchTerm(dirty);

  assert.equal(clean.includes('%'), false);
  assert.equal(clean.includes('_'), false);
  assert.equal(clean.includes('('), false);
  assert.equal(clean.includes(')'), false);
  assert.equal(clean.includes(','), false);
  assert.equal(clean.length <= 100, true);
});

test('sanitizeProfileUpdates only keeps allowed profile fields', () => {
  assert.deepEqual(API.sanitizeProfileUpdates({
    full_name: 'Test User',
    role: 'admin',
    bio: 'Merhaba',
    created_at: '2026-01-01'
  }), {
    full_name: 'Test User',
    bio: 'Merhaba'
  });
});

test('sanitizeListingUpdates only keeps allowed listing fields', () => {
  assert.deepEqual(API.sanitizeListingUpdates({
    title: 'Toyota Corolla',
    description: 'Bakımlı hibrit araç',
    user_id: 'attacker-user',
    price: 1230000,
    script: '<script>alert(1)</script>'
  }), {
    title: 'Toyota Corolla',
    description: 'Bakımlı hibrit araç',
    price: 1230000
  });
});
