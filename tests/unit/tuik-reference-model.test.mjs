import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  getTuikReferenceCategories,
  getTuikReferenceCategoriesForVertical,
  isTuikReferenceSnapshot,
  normalizeTuikReferenceSnapshot,
  TUIK_REFERENCE_SOURCE_ID
} from '../../js/data/tuik-reference-model.js';

const root = process.cwd();
const snapshotPath = join(root, 'data/snapshots/tuik-reference.json');

const validCategory = {
  id: 'tuketici_fiyat_endeksi',
  title: 'Tüketici fiyat endeksi (TÜFE)',
  relatedVerticals: ['finansman', 'auto'],
  usage: 'Enflasyon referansı.',
  scoreImpact: false,
  aiNarrationAllowed: true
};

const validSnapshot = {
  sourceId: 'tuik',
  sourceName: 'Türkiye İstatistik Kurumu',
  status: 'manual_reference',
  lastReviewed: '2026-06-08',
  accessMode: 'Manuel referans — resmi web yayınları periyodik gözden geçirilir; otomatik API beslemesi yoktur',
  officialUrl: 'https://www.tuik.gov.tr/',
  disclaimer: 'Ham veri yeniden satılmaz veya ticari olarak paketlenmez.',
  categories: [validCategory]
};

test('valid snapshot normalize edilir', () => {
  const normalized = normalizeTuikReferenceSnapshot(validSnapshot);

  assert.equal(normalized.sourceId, 'tuik');
  assert.equal(normalized.sourceName, 'Türkiye İstatistik Kurumu');
  assert.equal(normalized.status, 'manual_reference');
  assert.equal(normalized.lastReviewed, '2026-06-08');
  assert.equal(normalized.officialUrl, 'https://www.tuik.gov.tr/');
  assert.equal(normalized.categories.length, 1);
  assert.equal(normalized.categories[0].id, 'tuketici_fiyat_endeksi');
  assert.equal(normalized.categories[0].scoreImpact, false);
  assert.equal(normalized.categories[0].aiNarrationAllowed, true);
  assert.equal(isTuikReferenceSnapshot(normalized), true);
});

test('bozuk/null input güvenli fallback döndürür', () => {
  for (const input of [null, undefined, '', 0, [], true]) {
    const normalized = normalizeTuikReferenceSnapshot(input);
    assert.equal(normalized.sourceId, TUIK_REFERENCE_SOURCE_ID);
    assert.deepEqual(normalized.categories, []);
    assert.match(normalized.accessMode, /Manuel referans/);
    assert.match(normalized.disclaimer, /ham veri/i);
  }
});

test('unknown fields public output’a taşınmaz', () => {
  const normalized = normalizeTuikReferenceSnapshot({
    ...validSnapshot,
    secretKey: 'must-not-leak',
    apiToken: 'hidden',
    latitude: 39.9,
    rawTable: [{ col: 1 }],
    categories: [
      {
        ...validCategory,
        eventID: 'internal-1',
        coordinates: [28.9, 41.0]
      }
    ]
  });

  assert.equal('secretKey' in normalized, false);
  assert.equal('apiToken' in normalized, false);
  assert.equal('latitude' in normalized, false);
  assert.equal('rawTable' in normalized, false);
  assert.equal('eventID' in normalized.categories[0], false);
  assert.equal('coordinates' in normalized.categories[0], false);
});

test('relatedVerticals whitelist dışı değerleri atar', () => {
  const normalized = normalizeTuikReferenceSnapshot({
    ...validSnapshot,
    categories: [
      {
        ...validCategory,
        relatedVerticals: ['auto', 'invalid_vertical', 'KONUT', 'partner_api']
      }
    ]
  });

  assert.deepEqual(normalized.categories[0].relatedVerticals, ['auto', 'konut']);
});

test('scoreImpact true verilse bile false normalize edilir', () => {
  const normalized = normalizeTuikReferenceSnapshot({
    ...validSnapshot,
    categories: [{ ...validCategory, scoreImpact: true }]
  });

  assert.equal(normalized.categories[0].scoreImpact, false);
});

test('officialUrl invalid ise boş string olur', () => {
  const ftp = normalizeTuikReferenceSnapshot({ ...validSnapshot, officialUrl: 'ftp://tuik.gov.tr/' });
  const relative = normalizeTuikReferenceSnapshot({ ...validSnapshot, officialUrl: '/tuik' });
  const junk = normalizeTuikReferenceSnapshot({ ...validSnapshot, officialUrl: 'not-a-url' });

  assert.equal(ftp.officialUrl, '');
  assert.equal(relative.officialUrl, '');
  assert.equal(junk.officialUrl, '');
});

test('kategori filtreleme auto için doğru kategorileri döndürür', () => {
  const raw = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  const snapshot = normalizeTuikReferenceSnapshot(raw);
  const autoCategories = getTuikReferenceCategoriesForVertical(snapshot, 'auto');

  assert.ok(autoCategories.length > 0);
  assert.ok(autoCategories.every((category) => category.relatedVerticals.includes('auto')));
  assert.ok(
    autoCategories.some((category) => category.id === 'motorlu_kara_tasitlari_istatistikleri')
  );
  assert.ok(
    autoCategories.some((category) => category.id === 'karayolu_trafik_kaza_istatistikleri')
  );
  assert.equal(
    autoCategories.some((category) => category.id === 'konut_satis_istatistikleri'),
    false
  );
});

test('kategori filtreleme konut için doğru kategorileri döndürür', () => {
  const raw = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  const snapshot = normalizeTuikReferenceSnapshot(raw);
  const konutCategories = getTuikReferenceCategoriesForVertical(snapshot, 'konut');

  assert.ok(konutCategories.length > 0);
  assert.ok(konutCategories.every((category) => category.relatedVerticals.includes('konut')));
  assert.ok(konutCategories.some((category) => category.id === 'konut_satis_istatistikleri'));
  assert.equal(
    konutCategories.some((category) => category.id === 'turizm_istatistikleri'),
    false
  );
});

test('kategori filtreleme bilinmeyen vertical için boş array döndürür', () => {
  const snapshot = normalizeTuikReferenceSnapshot(validSnapshot);

  assert.deepEqual(getTuikReferenceCategoriesForVertical(snapshot, 'unknown'), []);
  assert.deepEqual(getTuikReferenceCategoriesForVertical(snapshot, ''), []);
  assert.deepEqual(getTuikReferenceCategoriesForVertical(snapshot, null), []);
});

test('snapshot dosyası import edilip normalize edilebilir', () => {
  const raw = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  const normalized = normalizeTuikReferenceSnapshot(raw);

  assert.equal(normalized.sourceId, 'tuik');
  assert.equal(normalized.categories.length, 9);
  assert.equal(isTuikReferenceSnapshot(normalized), true);
  assert.equal(getTuikReferenceCategories(normalized).length, 9);
  assert.ok(normalized.categories.every((category) => category.scoreImpact === false));
});
