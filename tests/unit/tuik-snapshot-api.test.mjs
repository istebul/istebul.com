import test from 'node:test';
import assert from 'node:assert/strict';

const {
  onRequestGet,
  onRequestHead,
  onRequestOptions,
  buildTuikSnapshotPayload,
  toPublicTuikSource
} = await import('../../functions/api/tuik-snapshot.js');
const { normalizeTuikReferenceSnapshot } = await import('../../js/data/tuik-reference-model.js');
const { readFileSync } = await import('node:fs');
const { join } = await import('node:path');

const rawSnapshot = JSON.parse(
  readFileSync(join(process.cwd(), 'data/snapshots/tuik-reference.json'), 'utf8')
);

function forbiddenResponseKeys() {
  return ['rawTable', 'eventID', 'latitude', 'longitude', 'secret', 'env'];
}

function assertNoForbiddenKeys(value, path = 'response') {
  if (value == null || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    assert.equal(
      forbiddenResponseKeys().includes(key),
      false,
      `${path}.${key} should not be present`
    );
    assertNoForbiddenKeys(value[key], `${path}.${key}`);
  }
}

test('onRequestGet ok true döndürür', async () => {
  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/tuik-snapshot'),
    env: {}
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
});

test('data.source === "tuik"', async () => {
  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/tuik-snapshot'),
    env: {}
  });
  const body = await response.json();
  assert.equal(body.data.source, 'tuik');
  assert.equal(toPublicTuikSource(), 'tuik');
});

test('data.status === "reference"', async () => {
  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/tuik-snapshot'),
    env: {}
  });
  const body = await response.json();
  assert.equal(body.data.status, 'reference');
});

test('meta.upstream === "static"', async () => {
  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/tuik-snapshot'),
    env: {}
  });
  const body = await response.json();
  assert.equal(body.meta.upstream, 'static');
});

test('meta.scoreImpact === false', async () => {
  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/tuik-snapshot'),
    env: {}
  });
  const body = await response.json();
  assert.equal(body.meta.scoreImpact, false);
});

test('tüm kategorilerde scoreImpact false', async () => {
  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/tuik-snapshot'),
    env: {}
  });
  const body = await response.json();
  assert.ok(body.data.categories.length > 0);
  assert.ok(body.data.categories.every((category) => category.scoreImpact === false));
});

test('varsayılan response 9 kategori döndürür', async () => {
  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/tuik-snapshot'),
    env: {}
  });
  const body = await response.json();
  assert.equal(body.data.categories.length, 9);
  assert.equal(body.meta.categoryCount, 9);
});

test('attribution.provider içinde "Türkiye İstatistik Kurumu" geçer', async () => {
  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/tuik-snapshot'),
    env: {}
  });
  const body = await response.json();
  assert.match(body.data.attribution.provider, /Türkiye İstatistik Kurumu/);
});

test('response ham/secret alanları taşımaz', async () => {
  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/tuik-snapshot'),
    env: {}
  });
  const body = await response.json();
  assertNoForbiddenKeys(body);
});

test('?vertical=auto sadece auto ile ilişkili kategorileri döndürür', async () => {
  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/tuik-snapshot?vertical=auto'),
    env: {}
  });
  const body = await response.json();
  assert.ok(body.data.categories.length > 0);
  assert.ok(body.data.categories.every((category) => category.relatedVerticals.includes('auto')));
  assert.ok(
    body.data.categories.some((category) => category.id === 'motorlu_kara_tasitlari_istatistikleri')
  );
  assert.equal(
    body.data.categories.some((category) => category.id === 'konut_satis_istatistikleri'),
    false
  );
});

test('?vertical=konut sadece konut ile ilişkili kategorileri döndürür', async () => {
  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/tuik-snapshot?vertical=konut'),
    env: {}
  });
  const body = await response.json();
  assert.ok(body.data.categories.length > 0);
  assert.ok(body.data.categories.every((category) => category.relatedVerticals.includes('konut')));
  assert.ok(body.data.categories.some((category) => category.id === 'konut_satis_istatistikleri'));
  assert.equal(
    body.data.categories.some((category) => category.id === 'turizm_istatistikleri'),
    false
  );
});

test('?vertical=unknown boş categories döndürür', async () => {
  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/tuik-snapshot?vertical=unknown'),
    env: {}
  });
  const body = await response.json();
  assert.deepEqual(body.data.categories, []);
  assert.equal(body.meta.categoryCount, 0);
});

test('onRequestOptions 204 döndürür', async () => {
  const response = await onRequestOptions({
    request: new Request('https://www.istebul.com/api/tuik-snapshot', { method: 'OPTIONS' })
  });
  assert.equal(response.status, 204);
  assert.match(response.headers.get('Access-Control-Allow-Methods') || '', /GET/);
});

test('onRequestHead 200 döndürür ve body içermez', async () => {
  const response = await onRequestHead({
    request: new Request('https://www.istebul.com/api/tuik-snapshot', { method: 'HEAD' })
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Content-Type') || '', /application\/json/);
  const text = await response.text();
  assert.equal(text, '');
});

test('env boş obje ile çalışır', async () => {
  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/tuik-snapshot'),
    env: {}
  });
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.data.source, 'tuik');
});

test('debug=1 güvenli meta döndürür, secret/env içermez', async () => {
  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/tuik-snapshot?debug=1'),
    env: {}
  });
  const body = await response.json();
  assert.equal(body.data.debug.sourceDetail, 'static');
  assert.equal(body.data.debug.snapshotSource, 'data/snapshots/tuik-reference.json');
  assert.equal('secret' in (body.data.debug || {}), false);
  assert.equal('env' in (body.data.debug || {}), false);
  assertNoForbiddenKeys(body.data.debug, 'data.debug');
});

test('buildTuikSnapshotPayload normalize edilmiş snapshot ile uyumlu', () => {
  const snapshot = normalizeTuikReferenceSnapshot(rawSnapshot);
  const payload = buildTuikSnapshotPayload(snapshot);
  assert.equal(payload.status, 'reference');
  assert.equal(payload.source, 'tuik');
  assert.equal(payload.categories.length, 9);
});
