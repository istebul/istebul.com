import test from 'node:test';
import assert from 'node:assert/strict';

const {
  fetchTuikReferenceSnapshot,
  buildTuikReferenceLayer,
  renderTuikReferenceLayer,
  mountTuikReferenceLayer,
  TUIK_REFERENCE_LAYER_DISCLAIMER
} = await import('../../js/features/results/results-tuik-reference-layer.js');

const REFERENCE_CATEGORY_FINANSMAN = {
  id: 'tuketici_fiyat_endeksi',
  title: 'Tüketici fiyat endeksi (TÜFE)',
  relatedVerticals: ['finansman', 'auto'],
  usage: 'Enflasyon referansı.',
  scoreImpact: false,
  aiNarrationAllowed: true
};

const REFERENCE_CATEGORY_KONUT = {
  id: 'konut_satis_istatistikleri',
  title: 'Konut Satış İstatistikleri',
  relatedVerticals: ['konut'],
  usage: 'Konut piyasası hacmi referansı.',
  scoreImpact: false,
  aiNarrationAllowed: true
};

const REFERENCE_SNAPSHOT = {
  ok: true,
  data: {
    status: 'reference',
    source: 'tuik',
    fetchedAt: '2026-06-23T12:00:00.000Z',
    lastReviewed: '2026-06-08',
    accessMode: 'Manuel referans',
    categories: [REFERENCE_CATEGORY_FINANSMAN, REFERENCE_CATEGORY_KONUT],
    attribution: {
      provider: 'Türkiye İstatistik Kurumu (TÜİK)',
      url: 'https://www.tuik.gov.tr/',
      disclaimer: 'Ham veri yeniden satılmaz veya ticari olarak paketlenmez.'
    }
  },
  meta: {
    upstream: 'static',
    scoreImpact: false,
    categoryCount: 2
  }
};

const BANNED_PHRASES = [
  'tavsiye eder',
  'skoru artırır',
  'canlı bağlı',
  'resmi API',
  'upstream'
];

function assertNoBannedPhrases(text) {
  const normalized = String(text || '').toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    assert.equal(normalized.includes(phrase.toLowerCase()), false, `forbidden phrase: ${phrase}`);
  }
}

test('buildTuikReferenceLayer reference payload ile hasData:true döndürür', () => {
  const layer = buildTuikReferenceLayer(REFERENCE_SNAPSHOT);

  assert.equal(layer.hasData, true);
  assert.equal(layer.status, 'reference');
  assert.equal(layer.source, 'tuik');
  assert.equal(layer.scoreImpact, false);
  assert.equal(layer.items.length, 2);
  assert.equal(layer.lastReviewed, '2026-06-08');
  assert.match(layer.attribution.provider, /Türkiye İstatistik Kurumu/);
});

test('vertical: finansman filtresi yalnız ilgili kategoriyi döndürür', () => {
  const layer = buildTuikReferenceLayer(REFERENCE_SNAPSHOT, { vertical: 'finansman' });

  assert.equal(layer.hasData, true);
  assert.equal(layer.items.length, 1);
  assert.equal(layer.items[0].id, 'tuketici_fiyat_endeksi');
});

test('snapshot yoksa hasData:false', () => {
  const layer = buildTuikReferenceLayer(null);
  assert.equal(layer.hasData, false);
  assert.deepEqual(layer.items, []);
});

test('status !== reference ise veri kabul etmez', () => {
  const layer = buildTuikReferenceLayer({
    ok: true,
    data: {
      status: 'connected',
      source: 'tuik',
      categories: [REFERENCE_CATEGORY_FINANSMAN]
    },
    meta: { scoreImpact: false }
  });

  assert.equal(layer.hasData, false);
});

test('meta.scoreImpact:true ise veri kabul etmez', () => {
  const layer = buildTuikReferenceLayer({
    ok: true,
    data: {
      status: 'reference',
      source: 'tuik',
      categories: [REFERENCE_CATEGORY_FINANSMAN]
    },
    meta: { scoreImpact: true }
  });

  assert.equal(layer.hasData, false);
});

test('categories[].scoreImpact:true olan kategori dışlanır', () => {
  const layer = buildTuikReferenceLayer({
    ok: true,
    data: {
      status: 'reference',
      source: 'tuik',
      categories: [
        REFERENCE_CATEGORY_FINANSMAN,
        {
          ...REFERENCE_CATEGORY_KONUT,
          scoreImpact: true
        }
      ],
      attribution: REFERENCE_SNAPSHOT.data.attribution
    },
    meta: { scoreImpact: false }
  });

  assert.equal(layer.hasData, true);
  assert.equal(layer.items.length, 1);
  assert.equal(layer.items[0].id, 'tuketici_fiyat_endeksi');
});

test('fetchTuikReferenceSnapshot /api/tuik-snapshot çağırır', async () => {
  let requestedUrl = '';
  const snapshot = await fetchTuikReferenceSnapshot({
    fetchImpl: async (url) => {
      requestedUrl = String(url);
      return {
        ok: true,
        async json() {
          return REFERENCE_SNAPSHOT;
        }
      };
    }
  });

  assert.equal(requestedUrl, '/api/tuik-snapshot');
  assert.equal(snapshot?.data?.status, 'reference');
});

test('fetchTuikReferenceSnapshot vertical=finansman query string ekler', async () => {
  let requestedUrl = '';
  await fetchTuikReferenceSnapshot({
    vertical: 'finansman',
    fetchImpl: async (url) => {
      requestedUrl = String(url);
      return {
        ok: true,
        async json() {
          return REFERENCE_SNAPSHOT;
        }
      };
    }
  });

  assert.equal(requestedUrl, '/api/tuik-snapshot?vertical=finansman');
});

test('fetchTuikReferenceSnapshot non-OK response null döndürür', async () => {
  const snapshot = await fetchTuikReferenceSnapshot({
    fetchImpl: async () => ({
      ok: false,
      status: 500,
      async json() {
        return { ok: false };
      }
    })
  });

  assert.equal(snapshot, null);
});

test('fetchTuikReferenceSnapshot fetch exception null döndürür', async () => {
  const snapshot = await fetchTuikReferenceSnapshot({
    fetchImpl: async () => {
      throw new Error('network');
    }
  });

  assert.equal(snapshot, null);
});

test('render HTML dinamik metinleri escape eder', () => {
  const layer = buildTuikReferenceLayer({
    ok: true,
    data: {
      status: 'reference',
      source: 'tuik',
      lastReviewed: '2026-06-08',
      categories: [
        {
          id: 'unsafe',
          title: '<script>alert(1)</script>',
          relatedVerticals: ['finansman'],
          usage: '<img onerror=alert(1)>',
          scoreImpact: false
        }
      ],
      attribution: {
        provider: '<b>TÜİK</b>',
        disclaimer: '<i>ham</i>'
      }
    },
    meta: { scoreImpact: false }
  });

  const html = renderTuikReferenceLayer(layer);

  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;b&gt;TÜİK&lt;\/b&gt;/);
});

test('render içinde attribution, disclaimer ve lastReviewed görünür', () => {
  const layer = buildTuikReferenceLayer(REFERENCE_SNAPSHOT);
  const html = renderTuikReferenceLayer(layer);

  assert.match(html, /Türkiye İstatistik Kurumu \(TÜİK\)/);
  assert.match(html, /Ham veri yeniden satılmaz/);
  assert.match(html, /Son gözden geçirme: 2026-06-08/);
  assert.match(html, /Karar skoru üretmez/);
  assert.match(html, /Ham tablo yayınlamaz/);
  assert.match(html, /Manuel gözden geçirilmiş referans snapshot/);
  assert.match(html, /data-tuik-reference-layer/);
  assert.match(html, /TÜİK referans verisi/);
});

test('render içinde yasaklı ifadeler yok', () => {
  const layer = buildTuikReferenceLayer(REFERENCE_SNAPSHOT);
  const html = renderTuikReferenceLayer(layer);

  assertNoBannedPhrases(html);
  assertNoBannedPhrases(TUIK_REFERENCE_LAYER_DISCLAIMER);
  assert.doesNotMatch(html, /\b\d{1,3}\s*\/\s*100\b/);
});

test('mountTuikReferenceLayer container yoksa false döndürür', () => {
  const layer = buildTuikReferenceLayer(REFERENCE_SNAPSHOT);
  assert.equal(mountTuikReferenceLayer(null, layer), false);
  assert.equal(mountTuikReferenceLayer(undefined, layer), false);
});

test('mountTuikReferenceLayer hasData false ise no-op false döndürür', () => {
  const container = { innerHTML: 'unchanged' };
  const layer = buildTuikReferenceLayer(null);

  assert.equal(mountTuikReferenceLayer(container, layer), false);
  assert.equal(container.innerHTML, 'unchanged');
});

test('mountTuikReferenceLayer hasData true ise container HTML yazar ve true döndürür', () => {
  const container = { innerHTML: '' };
  const layer = buildTuikReferenceLayer(REFERENCE_SNAPSHOT);

  assert.equal(mountTuikReferenceLayer(container, layer), true);
  assert.match(container.innerHTML, /data-tuik-reference-layer/);
  assert.match(container.innerHTML, /TÜİK referans verisi/);
});
