import { register } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
register(
  pathToFileURL(
    path.join(dirname, '../helpers/business-ts-resolve.mjs')
  ).href
);

const { resolveBusinessAccess } = await import(
  '../../src/business/auth/resolveBusinessAccess.ts'
);

function createRuntime({
  session = { user: { id: 'user-1' } },
  sessionError = null,
  membership = { business_id: 'business-1', role: 'owner' },
  membershipError = null,
  throwSession = false,
  throwMembership = false
} = {}) {
  const query = {
    select() { return this; },
    eq() { return this; },
    limit() { return this; },
    async maybeSingle() {
      if (throwMembership) throw new Error('database unavailable');
      return { data: membership, error: membershipError };
    }
  };

  return {
    client: {
      auth: {
        async getSession() {
          if (throwSession) throw new Error('session unavailable');
          return {
            data: { session },
            error: sessionError
          };
        }
      },
      from(table) {
        assert.equal(table, 'business_users');
        return query;
      }
    }
  };
}

test('oturum yoksa unauthenticated döner', async () => {
  const result = await resolveBusinessAccess(
    createRuntime({ session: null })
  );
  assert.deepEqual(result, { state: 'unauthenticated' });
});

test('üyelik varsa business erişimini çözer', async () => {
  const result = await resolveBusinessAccess(createRuntime());
  assert.deepEqual(result, {
    state: 'ready',
    userId: 'user-1',
    businessId: 'business-1',
    role: 'owner'
  });
});

test('üyelik yoksa needs-business döner', async () => {
  const result = await resolveBusinessAccess(
    createRuntime({ membership: null })
  );
  assert.deepEqual(result, {
    state: 'needs-business',
    userId: 'user-1'
  });
});

test('üyelik sorgusu hatası onboarding olarak yorumlanmaz', async () => {
  const result = await resolveBusinessAccess(
    createRuntime({
      membershipError: { message: 'permission denied' }
    })
  );
  assert.equal(result.state, 'error');
  assert.ok(result.error);
});

test('oturum sorgusu hatası error durumuna dönüşür', async () => {
  const result = await resolveBusinessAccess(
    createRuntime({
      sessionError: { message: 'session unavailable' }
    })
  );
  assert.equal(result.state, 'error');
  assert.ok(result.error);
});

test('beklenmeyen sorgu hatası yakalanır', async () => {
  const result = await resolveBusinessAccess(
    createRuntime({ throwMembership: true })
  );
  assert.equal(result.state, 'error');
});
