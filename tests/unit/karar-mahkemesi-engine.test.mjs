import test from 'node:test';
import assert from 'node:assert/strict';

const {
  buildBeklemeSkoru,
  resolveKararAksiyonEtiketi,
  buildKararMahkemesiGerekceler,
  buildKararMahkemesiModel,
  containsForbiddenKararPhrase,
  KARAR_AKSIYON_ETIKETLERI,
  KARAR_MAHKEMESI_FORBIDDEN_PHRASES
} = await import('../../js/features/karar-mahkemesi/karar-mahkemesi-engine.js');

function baseForm(overrides = {}) {
  return {
    budget: 1_500_000,
    usage: 'city',
    body: 'sedan',
    fuel: 'hybrid',
    km: 15_000,
    loan: 'hayir',
    ...overrides
  };
}

function baseIntel(overrides = {}) {
  return {
    decisionScore: 70,
    confidenceScore: 72,
    recommendationLevel: 'proceed',
    overallRisk: 'Orta',
    riskAnalysis: [{ level: 'orta', title: 'TCO' }],
    warnings: [],
    scoreFactors: [{ label: 'TCO', impact: '+4', reason: '12 ay TCO bütçe ile dengeli modelleniyor.' }],
    ...overrides
  };
}

function baseTop(overrides = {}) {
  return {
    score: 74,
    costs: {
      ownership: {
        totals: { months12: 1_350_000 }
      }
    },
    risks: ['Finansman koşulları teklif aşamasında netleşmeli.'],
    ...overrides
  };
}

function collectModelText(model) {
  return [
    model.aksiyonEtiketi,
    model.disclaimer,
    ...(model.gerekceler || [])
  ].join(' ');
}

function assertNoForbiddenPhrases(text) {
  for (const phrase of KARAR_MAHKEMESI_FORBIDDEN_PHRASES) {
    assert.equal(
      containsForbiddenKararPhrase(text),
      false,
      `unexpected forbidden phrase: ${phrase}`
    );
    assert.ok(
      !String(text).toLocaleLowerCase('tr-TR').includes(phrase),
      `text contains forbidden phrase: ${phrase}`
    );
  }
}

test('buildBeklemeSkoru clamps score between 0 and 100', () => {
  const low = buildBeklemeSkoru({
    intel: baseIntel({ decisionScore: 95, confidenceScore: 95, recommendationLevel: 'proceed', overallRisk: 'Düşük' }),
    formData: baseForm(),
    topResult: baseTop({ costs: { ownership: { totals: { months12: 900_000 } } } })
  });
  const high = buildBeklemeSkoru({
    intel: baseIntel({
      decisionScore: 20,
      confidenceScore: 25,
      recommendationLevel: 'avoid',
      overallRisk: 'Yüksek',
      warnings: ['Uyarı 1', 'Uyarı 2', 'Uyarı 3'],
      riskAnalysis: [{ level: 'yüksek' }, { level: 'yüksek' }, { level: 'yüksek' }]
    }),
    formData: baseForm({ budget: 1_000_000 }),
    topResult: baseTop({ score: 30, costs: { ownership: { totals: { months12: 1_300_000 } } } })
  });

  assert.ok(low >= 0 && low <= 100);
  assert.ok(high >= 0 && high <= 100);
  assert.ok(high > low);
});

test('resolveKararAksiyonEtiketi returns Daha fazla veri gerekli for low confidence', () => {
  const label = resolveKararAksiyonEtiketi({
    beklemeSkoru: 40,
    intel: baseIntel({ confidenceScore: 42, recommendationLevel: 'proceed' }),
    formData: baseForm(),
    topResult: baseTop()
  });
  assert.equal(label, KARAR_AKSIYON_ETIKETLERI.DAHA_FAZLA_VERI);
});

test('resolveKararAksiyonEtiketi returns Daha fazla veri gerekli for missing critical form fields', () => {
  const label = resolveKararAksiyonEtiketi({
    beklemeSkoru: 35,
    intel: baseIntel({ confidenceScore: 80 }),
    formData: { budget: 1_200_000 },
    topResult: baseTop()
  });
  assert.equal(label, KARAR_AKSIYON_ETIKETLERI.DAHA_FAZLA_VERI);
});

test('resolveKararAksiyonEtiketi returns Vazgeç when recommendationLevel is avoid', () => {
  const label = resolveKararAksiyonEtiketi({
    beklemeSkoru: 80,
    intel: baseIntel({ recommendationLevel: 'avoid', decisionScore: 30, overallRisk: 'Yüksek' }),
    formData: baseForm(),
    topResult: baseTop()
  });
  assert.equal(label, KARAR_AKSIYON_ETIKETLERI.VAZGEC);
});

test('resolveKararAksiyonEtiketi returns Bekle for wait recommendation', () => {
  const waitLabel = resolveKararAksiyonEtiketi({
    beklemeSkoru: 55,
    intel: baseIntel({ recommendationLevel: 'wait', decisionScore: 58 }),
    formData: baseForm(),
    topResult: baseTop()
  });
  const cautionLabel = resolveKararAksiyonEtiketi({
    beklemeSkoru: 55,
    intel: baseIntel({ recommendationLevel: 'proceed_with_caution', decisionScore: 66 }),
    formData: baseForm(),
    topResult: baseTop()
  });

  assert.equal(waitLabel, KARAR_AKSIYON_ETIKETLERI.BEKLE);
  assert.equal(cautionLabel, KARAR_AKSIYON_ETIKETLERI.BEKLE);
});

test('resolveKararAksiyonEtiketi returns Pazarlık yap for medium score with TCO pressure', () => {
  const label = resolveKararAksiyonEtiketi({
    beklemeSkoru: 48,
    intel: baseIntel({
      decisionScore: 64,
      confidenceScore: 68,
      recommendationLevel: 'proceed',
      overallRisk: 'Orta'
    }),
    formData: baseForm({ budget: 1_000_000 }),
    topResult: baseTop({
      costs: { ownership: { totals: { months12: 1_040_000 } } }
    })
  });
  assert.equal(label, KARAR_AKSIYON_ETIKETLERI.PAZARLIK);
});

test('resolveKararAksiyonEtiketi returns Al for strong score, confidence and low risk', () => {
  const label = resolveKararAksiyonEtiketi({
    beklemeSkoru: 28,
    intel: baseIntel({
      decisionScore: 84,
      confidenceScore: 82,
      recommendationLevel: 'proceed',
      overallRisk: 'Düşük',
      riskAnalysis: [{ level: 'düşük' }]
    }),
    formData: baseForm({ budget: 2_000_000 }),
    topResult: baseTop({
      score: 86,
      costs: { ownership: { totals: { months12: 1_500_000 } } }
    })
  });
  assert.equal(label, KARAR_AKSIYON_ETIKETLERI.AL);
});

test('buildKararMahkemesiGerekceler returns 3 to 5 non-empty items', () => {
  const gerekceler = buildKararMahkemesiGerekceler({
    intel: baseIntel(),
    formData: baseForm(),
    topResult: baseTop()
  });

  assert.ok(Array.isArray(gerekceler));
  assert.ok(gerekceler.length >= 3);
  assert.ok(gerekceler.length <= 5);
  assert.ok(gerekceler.every((item) => String(item).trim().length > 0));
});

test('buildKararMahkemesiModel output avoids forbidden phrases', () => {
  const model = buildKararMahkemesiModel({
    intel: baseIntel({
      decisionScore: 40,
      confidenceScore: 48,
      recommendationLevel: 'wait',
      warnings: ['Bütçe baskısı izlenmeli.']
    }),
    formData: baseForm(),
    topResult: baseTop()
  });

  const text = collectModelText(model);
  assertNoForbiddenPhrases(text);
});

test('karar mahkemesi functions do not throw on null or missing inputs', () => {
  assert.doesNotThrow(() => buildBeklemeSkoru({ intel: null, formData: null, topResult: null }));
  assert.doesNotThrow(() => resolveKararAksiyonEtiketi({ intel: undefined, formData: undefined, topResult: undefined }));
  assert.doesNotThrow(() => buildKararMahkemesiGerekceler({}));
  assert.doesNotThrow(() => buildKararMahkemesiModel({ intel: null, formData: null, topResult: null }));

  const model = buildKararMahkemesiModel({ intel: null, formData: null, topResult: null });
  assert.ok(model.beklemeSkoru >= 0 && model.beklemeSkoru <= 100);
  assert.ok(model.gerekceler.length >= 3);
  assert.ok(Object.values(KARAR_AKSIYON_ETIKETLERI).includes(model.aksiyonEtiketi));
});

test('buildKararMahkemesiModel aggregates beklem skoru, aksiyon and gerekceler', () => {
  const model = buildKararMahkemesiModel({
    intel: baseIntel(),
    formData: baseForm(),
    topResult: baseTop()
  });

  assert.equal(typeof model.beklemeSkoru, 'number');
  assert.equal(typeof model.aksiyonEtiketi, 'string');
  assert.ok(model.gerekceler.length >= 3);
  assert.equal(typeof model.disclaimer, 'string');
  assert.ok(model.tcoPressure > 0);
});
