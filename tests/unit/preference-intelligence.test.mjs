import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const {
  PREFERENCE_SIGNAL_KEYS,
  PREFERENCE_WARNING,
  isValidPreferenceSignal,
  normalizePreferenceSignal,
  clampPreferenceValue,
  deriveSignalsFromEvent,
  aggregatePreferenceProfile,
  buildPreferenceLabels,
  createSignalsFromEvent,
  buildPersonalizedInsights,
  buildPreferenceProfileHtml
} = await import('../../js/preference-intelligence/index.js');

const evil = '<script>xss</script>';

// --- CONSTANTS ---

test('seven preference signal keys', () => {
  assert.equal(PREFERENCE_SIGNAL_KEYS.length, 7);
});

test('warning message Turkish', () => {
  assert.match(PREFERENCE_WARNING, /Tercihleriniz zaman içinde güncellenebilir/);
});

for (const key of PREFERENCE_SIGNAL_KEYS) {
  test(`valid signal key: ${key}`, () => {
    assert.equal(isValidPreferenceSignal(key), true);
  });
}

test('invalid signal key', () => {
  assert.equal(isValidPreferenceSignal('invalid'), false);
});

// --- CLAMP ---

test('clampPreferenceValue defaults to 50', () => {
  assert.equal(clampPreferenceValue('bad'), 50);
});

test('clampPreferenceValue caps at 100', () => {
  assert.equal(clampPreferenceValue(150), 100);
});

test('clampPreferenceValue floors at 0', () => {
  assert.equal(clampPreferenceValue(-10), 0);
});

for (let v = 0; v <= 100; v += 10) {
  test(`clamp ${v}`, () => {
    assert.equal(clampPreferenceValue(v), v);
  });
}

// --- NORMALIZE ---

test('normalizePreferenceSignal maps fields', () => {
  const sig = normalizePreferenceSignal({ signalKey: 'riskSensitivity', signalValue: 70 });
  assert.equal(sig.signal_key, 'riskSensitivity');
  assert.equal(sig.signal_value, 70);
});

// --- DERIVE ---

test('deriveSignalsFromEvent compare_opened', () => {
  const deltas = deriveSignalsFromEvent('compare_opened');
  assert.ok(deltas.qualitySensitivity > 0);
});

test('deriveSignalsFromEvent scenario_opened', () => {
  const deltas = deriveSignalsFromEvent('scenario_opened');
  assert.ok(deltas.riskSensitivity > 0);
});

test('deriveSignalsFromEvent listing_viewed', () => {
  const deltas = deriveSignalsFromEvent('listing_viewed');
  assert.ok(deltas.cityUsagePreference > 0);
});

// --- AGGREGATE ---

test('aggregatePreferenceProfile returns all keys', () => {
  const profile = aggregatePreferenceProfile([]);
  for (const key of PREFERENCE_SIGNAL_KEYS) {
    assert.ok(key in profile);
  }
});

test('aggregatePreferenceProfile with signals', () => {
  const signals = [
    { signal_key: 'qualitySensitivity', signal_value: 80 },
    { signal_key: 'qualitySensitivity', signal_value: 90 }
  ];
  const profile = aggregatePreferenceProfile(signals);
  assert.ok(profile.qualitySensitivity >= 65);
});

test('aggregate does not modify recommendation scores note in builder', () => {
  const html = buildPreferenceProfileHtml(aggregatePreferenceProfile([]));
  assert.match(html, /öneri skorlarını değiştirmez/);
});

// --- LABELS ---

test('buildPreferenceLabels low risk', () => {
  const labels = buildPreferenceLabels({ riskSensitivity: 20 });
  assert.ok(labels.some((l) => l.includes('Düşük Risk')));
});

test('buildPreferenceLabels high quality', () => {
  const labels = buildPreferenceLabels({ qualitySensitivity: 80 });
  assert.ok(labels.some((l) => l.includes('Yüksek Kalite')));
});

test('buildPreferenceLabels family', () => {
  const labels = buildPreferenceLabels({ familyPreference: 75 });
  assert.ok(labels.some((l) => l.includes('Aile')));
});

// --- CREATE SIGNALS ---

test('createSignalsFromEvent returns array', () => {
  const signals = createSignalsFromEvent({ userId: 'u', eventType: 'compare_opened' });
  assert.ok(signals.length > 0);
});

// --- INSIGHTS ---

test('buildPersonalizedInsights cost sensitive', () => {
  const insights = buildPersonalizedInsights(
    { costSensitivity: 70 },
    { totalCostSummary: { total: 1000000 } }
  );
  assert.ok(insights.some((i) => i.includes('maliyet')));
});

test('buildPersonalizedInsights risk sensitive', () => {
  const insights = buildPersonalizedInsights({ riskSensitivity: 70 }, { riskLevel: 'high' });
  assert.ok(insights.some((i) => i.includes('Risk')));
});

// --- BUILDER ---

test('profile html renders Tercih Profili', () => {
  assert.match(buildPreferenceProfileHtml({}), /Tercih Profili/);
});

test('profile html shows warning', () => {
  assert.match(buildPreferenceProfileHtml({}), /Tercihleriniz zaman içinde/);
});

test('profile html XSS safe', () => {
  const html = buildPreferenceProfileHtml({
    labels: [evil],
    riskSensitivity: 50
  });
  assert.ok(!html.includes('<script>'));
});

test('profile html has aria-label metrics', () => {
  assert.match(buildPreferenceProfileHtml({ riskSensitivity: 60 }), /aria-label="Tercih metrikleri"/);
});

test('profile html mobile bar', () => {
  assert.match(buildPreferenceProfileHtml({ qualitySensitivity: 55 }), /udc-preferences__bar/);
});

// --- MIGRATION ---

test('user_preference_profile in migration', () => {
  const sql = fs.readFileSync('supabase/migrations/20260702_user_decision_platform_v1.sql', 'utf8');
  assert.match(sql, /user_preference_profile/);
  assert.match(sql, /user_preference_signals/);
});

// --- PARAMETERIZED ---

for (const key of PREFERENCE_SIGNAL_KEYS) {
  test(`aggregate key ${key} default 50`, () => {
    const profile = aggregatePreferenceProfile([]);
    assert.equal(profile[key], 50);
  });
}

for (let val = 10; val <= 90; val += 10) {
  test(`preference label at ${val}`, () => {
    const profile = { riskSensitivity: val, qualitySensitivity: val, costSensitivity: val };
    const labels = buildPreferenceLabels(profile);
    assert.ok(Array.isArray(labels));
  });
}

for (const event of ['compare_opened', 'scenario_opened', 'report_opened', 'decision_center_opened', 'listing_viewed']) {
  test(`signals from ${event}`, () => {
    const signals = createSignalsFromEvent({ eventType: event });
    assert.ok(signals.every((s) => isValidPreferenceSignal(s.signal_key)));
  });
}

for (let n = 1; n <= 25; n++) {
  test(`aggregate ${n} signals`, () => {
    const signals = Array.from({ length: n }, (_, i) => ({
      signal_key: PREFERENCE_SIGNAL_KEYS[i % PREFERENCE_SIGNAL_KEYS.length],
      signal_value: 40 + (i % 30)
    }));
    const profile = aggregatePreferenceProfile(signals);
    assert.equal(profile.signal_count, n);
  });
}

for (const label of ['Düşük Risk Eğilimi', 'Yüksek Kalite Eğilimi', 'Aile Kullanımı Eğilimi']) {
  test(`example label pattern: ${label}`, () => {
    const map = {
      'Düşük Risk Eğilimi': { riskSensitivity: 20 },
      'Yüksek Kalite Eğilimi': { qualitySensitivity: 80 },
      'Aile Kullanımı Eğilimi': { familyPreference: 80 }
    };
    const labels = buildPreferenceLabels(map[label]);
    assert.ok(labels.some((l) => l.includes(label.split(' ')[0])));
  });
}
