import test from 'node:test';
import assert from 'node:assert/strict';

const {
  buildAfadRiskLayer,
  buildAfadAiActivitySentence,
  renderAfadRiskLayerHtml,
  mountAfadRiskLayer,
  fetchAndBuildAfadRiskLayer,
  containsAfadDirectivePhrases,
  AFAD_AI_ACTIVITY_SENTENCE,
  AFAD_RISK_LAYER_DISCLAIMER
} = await import('../../js/features/results/results-afad-risk-layer.js');

const DISABLED_SNAPSHOT = {
  ok: false,
  data: {
    status: 'disabled',
    source: 'disabled',
    earthquakes: [],
    regionalSignals: []
  },
  meta: {
    featureEnabled: false,
    fallbackReason: 'AFAD_EARTHQUAKE_ENABLED kapalı'
  }
};

const CONNECTED_SNAPSHOT = {
  ok: true,
  data: {
    status: 'connected',
    source: 'afad',
    fetchedAt: '2026-06-16T12:00:00.000Z',
    dataDate: '2026-05-11T08:10:00',
    regionalSignals: [
      {
        province: 'İstanbul',
        district: 'Silivri',
        locationLabel: 'İstanbul / Silivri',
        eventCount: 5,
        maxMagnitude: 2.4,
        avgMagnitude: 1.8,
        significantCount: 0,
        activityLevel: 'düşük',
        hasLiveActivity: true,
        summary:
          'AFAD deprem istihbaratı: İstanbul / Silivri orta deprem risk bandında (skor 62/100). Aktivite seviyesi: düşük.'
      }
    ],
    earthquakes: [
      {
        date: '2026-05-11T08:10:00',
        magnitude: 2.4,
        depth: 6,
        location: 'Silivri (İstanbul)',
        province: 'İstanbul',
        district: 'Silivri'
      }
    ],
    attribution: {
      provider: 'AFAD Deprem Dairesi',
      url: 'https://www.afad.gov.tr/',
      disclaimer: 'Bilgilendirme amaçlı deprem aktivite verisi; resmi uyarı değildir.'
    }
  },
  meta: {
    featureEnabled: true
  }
};

const DEGRADED_SNAPSHOT = {
  ok: false,
  data: {
    status: 'degraded',
    source: 'fallback',
    regionalSignals: [
      {
        province: 'İzmir',
        eventCount: 0,
        maxMagnitude: 0,
        activityLevel: 'sakin',
        hasLiveActivity: false
      }
    ],
    earthquakes: []
  },
  meta: {
    featureEnabled: true,
    fallbackReason: 'AFAD canlı veri çekilemedi'
  }
};

function layerBlob(layer) {
  const html = renderAfadRiskLayerHtml(layer);
  return [layer.summary, ...(layer.bullets || []), html, buildAfadAiActivitySentence(layer)].join(' ');
}

test('disabled response → hasData:false', () => {
  const layer = buildAfadRiskLayer(DISABLED_SNAPSHOT);
  assert.equal(layer.hasData, false);
  assert.equal(layer.activityLevel, 'unavailable');
});

test('disabled response → HTML boş', () => {
  const layer = buildAfadRiskLayer(DISABLED_SNAPSHOT);
  assert.equal(renderAfadRiskLayerHtml(layer), '');
});

test('disabled response → DOM kart eklenmez', () => {
  let inserted = false;
  const root = {
    querySelector: () => null,
    prepend() {
      inserted = true;
    }
  };

  mountAfadRiskLayer(root, buildAfadRiskLayer(DISABLED_SNAPSHOT));
  assert.equal(inserted, false);
});

test('connected response + regionalSignals → hasData:true', () => {
  const layer = buildAfadRiskLayer(CONNECTED_SNAPSHOT, {
    province: 'İstanbul',
    district: 'Silivri'
  });

  assert.equal(layer.hasData, true);
  assert.equal(layer.activityLevel, 'düşük');
  assert.equal(layer.title, 'Deprem Aktivite Görünümü');
  assert.match(layer.summary, /AFAD kayıtlarında/);
  assert.ok(layer.bullets.length >= 1);
  assert.ok(layer.usedIndicators.length >= 2);
});

test('degraded response → hasData:false', () => {
  const layer = buildAfadRiskLayer(DEGRADED_SNAPSHOT);
  assert.equal(layer.hasData, false);
  assert.equal(renderAfadRiskLayerHtml(layer), '');
});

test('HTML sanitization → eventID/coordinates/internal score fields görünmez', () => {
  const polluted = {
    ok: true,
    data: {
      status: 'connected',
      source: 'afad',
      regionalSignals: [
        {
          province: 'Ankara',
          district: 'Çankaya',
          eventCount: 3,
          maxMagnitude: 3.1,
          activityLevel: 'orta',
          hasLiveActivity: true,
          earthquakeRiskScore: 88,
          activityScore: 44,
          seismicBaseRisk: 55,
          summary: 'skor 88/100 earthquakeRiskScore activityScore seismicBaseRisk'
        }
      ],
      earthquakes: [
        {
          eventID: 'secret-1',
          latitude: 39.9,
          longitude: 32.8,
          coordinates: 'hidden',
          magnitude: 3.1,
          province: 'Ankara',
          district: 'Çankaya'
        }
      ],
      attribution: { provider: 'AFAD Deprem Dairesi' }
    }
  };

  const layer = buildAfadRiskLayer(polluted);
  const html = renderAfadRiskLayerHtml(layer);
  const blob = layerBlob(layer).toLowerCase();

  assert.equal(layer.hasData, true);
  assert.doesNotMatch(blob, /eventid/);
  assert.doesNotMatch(blob, /latitude/);
  assert.doesNotMatch(blob, /longitude/);
  assert.doesNotMatch(blob, /coordinates/);
  assert.doesNotMatch(blob, /earthquakeriskscore/);
  assert.doesNotMatch(blob, /activityscore/);
  assert.doesNotMatch(blob, /seismicbaserisk/);
  assert.doesNotMatch(blob, /\b88\s*\/\s*100\b/);
  assert.match(html, /data-afad-risk-layer/);
  assert.match(html, /AFAD Deprem Dairesi/);
  assert.match(html, /Resmi uyarı değildir/);
});

test('copy safety → satın al/bekle/vazgeç gibi karar yönlendirmesi yok', () => {
  const layer = buildAfadRiskLayer(CONNECTED_SNAPSHOT);
  const blob = layerBlob(layer);

  assert.equal(containsAfadDirectivePhrases(blob), false);
  assert.doesNotMatch(blob, /\bsatın al\b/i);
  assert.doesNotMatch(blob, /\bbekle\b/i);
  assert.doesNotMatch(blob, /\bvazgeç\b/i);
  assert.doesNotMatch(blob, /\bskor değişti\b/i);
  assert.doesNotMatch(blob, /\brisk skorun\b/i);
});

test('mountAfadRiskLayer null root ile throw etmez', () => {
  const layer = buildAfadRiskLayer(CONNECTED_SNAPSHOT);
  assert.doesNotThrow(() => mountAfadRiskLayer(null, layer));
  assert.doesNotThrow(() => mountAfadRiskLayer(undefined, buildAfadRiskLayer(DISABLED_SNAPSHOT)));
});

test('buildAfadAiActivitySentence sadece bilgilendirme cümlesi üretir, skor üretmez', () => {
  const layer = buildAfadRiskLayer(CONNECTED_SNAPSHOT);
  const sentence = buildAfadAiActivitySentence(layer);

  assert.ok(sentence.length > 0);
  assert.match(sentence, /AFAD deprem aktivite verileri/);
  assert.doesNotMatch(sentence, /\b\d{1,3}\s*\/\s*100\b/);
  assert.doesNotMatch(sentence, /earthquakeRiskScore/i);
  assert.doesNotMatch(sentence, /skorunuz/i);
  assert.equal(buildAfadAiActivitySentence(buildAfadRiskLayer(DISABLED_SNAPSHOT)), '');
});

test('fetchAndBuildAfadRiskLayer fetchImpl ile mocklanabilir', async () => {
  const layer = await fetchAndBuildAfadRiskLayer({
    province: 'İstanbul',
    district: 'Silivri',
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return CONNECTED_SNAPSHOT;
      }
    })
  });

  assert.equal(layer.hasData, true);
  assert.match(layer.locationLabel, /İstanbul|Silivri/);
});

test('fetch error → hasData:false', async () => {
  const layer = await fetchAndBuildAfadRiskLayer({
    fetchImpl: async () => {
      throw new Error('network');
    }
  });

  assert.equal(layer.hasData, false);
});

test('fetch non-ok response → hasData:false', async () => {
  const layer = await fetchAndBuildAfadRiskLayer({
    fetchImpl: async () => ({
      ok: false,
      status: 500,
      async json() {
        return { ok: false, data: { status: 'degraded' } };
      }
    })
  });

  assert.equal(layer.hasData, false);
});

test('connected without meaningful regionalSignals → hasData:false', () => {
  const layer = buildAfadRiskLayer({
    ok: true,
    data: {
      status: 'connected',
      source: 'afad',
      regionalSignals: [
        {
          province: 'İzmir',
          eventCount: 0,
          maxMagnitude: 0,
          activityLevel: 'sakin',
          hasLiveActivity: false
        }
      ],
      earthquakes: []
    }
  });

  assert.equal(layer.hasData, false);
});

test('AFAD sabit metinleri bilgilendirme dilinde', () => {
  assert.match(AFAD_AI_ACTIVITY_SENTENCE, /bilgilendirme katmanı/);
  assert.match(AFAD_RISK_LAYER_DISCLAIMER, /Resmi uyarı değildir/);
  assert.match(AFAD_RISK_LAYER_DISCLAIMER, /AFAD Deprem Dairesi/);
  assert.equal(containsAfadDirectivePhrases(AFAD_AI_ACTIVITY_SENTENCE), false);
});
