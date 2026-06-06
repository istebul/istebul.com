/**
 * Decision OS v2 — deterministic Turkey average benchmark (no external API).
 */

const VERTICAL_BASELINES = Object.freeze({
  auto: { score: 62, confidence: 68 },
  konut: { score: 58, confidence: 65 },
  finansman: { score: 64, confidence: 70 },
  tatil: { score: 66, confidence: 72 },
  sigorta: { score: 60, confidence: 67 },
  kasko: { score: 61, confidence: 66 },
  unknown: { score: 60, confidence: 65 }
});

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function normalizeVertical(value) {
  const vertical = String(value || 'unknown').toLowerCase();
  if (vertical === 'finans' || vertical === 'finance') return 'finansman';
  if (vertical === 'housing' || vertical === 'real-estate') return 'konut';
  if (vertical === 'vehicle' || vertical === 'arac') return 'auto';
  return vertical;
}

/**
 * Deterministic Turkey benchmark from vertical + user scores.
 * @param {object} params
 */
export function buildTurkeyBenchmark(params = {}) {
  const vertical = normalizeVertical(params.vertical);
  const baseline = VERTICAL_BASELINES[vertical] || VERTICAL_BASELINES.unknown;
  const userScore = clampScore(params.decisionScore);
  const userConfidence = clampScore(params.confidenceScore ?? params.confidencePercent);

  const seed = vertical.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const turkeyScore = clampScore(baseline.score + ((seed % 7) - 3));
  const turkeyConfidence = clampScore(baseline.confidence + ((seed % 5) - 2));

  const scoreDiff = userScore - turkeyScore;
  const confidenceDiff = userConfidence - turkeyConfidence;

  return {
    user: { score: userScore, confidence: userConfidence },
    turkey: { score: turkeyScore, confidence: turkeyConfidence },
    diff: {
      score: scoreDiff,
      confidence: confidenceDiff,
      scoreLabel: scoreDiff > 0 ? `+${scoreDiff}` : String(scoreDiff),
      confidenceLabel: confidenceDiff > 0 ? `+${confidenceDiff}` : String(confidenceDiff)
    },
    vertical
  };
}

/**
 * @param {object} benchmark
 * @param {(s: unknown) => string} esc
 */
export function renderTurkeyBenchmarkHtml(benchmark = {}, esc = (v) => String(v ?? '')) {
  const user = benchmark.user || {};
  const turkey = benchmark.turkey || {};
  const diff = benchmark.diff || {};

  return `
    <div class="dos-benchmark">
      <div class="dos-benchmark__row">
        <span class="dos-benchmark__label">Sen</span>
        <strong class="dos-benchmark__value">${esc(String(user.score))}/100</strong>
        <span class="dos-benchmark__sub">Güven %${esc(String(user.confidence))}</span>
      </div>
      <div class="dos-benchmark__row dos-benchmark__row--avg">
        <span class="dos-benchmark__label">Türkiye Ort.</span>
        <strong class="dos-benchmark__value">${esc(String(turkey.score))}/100</strong>
        <span class="dos-benchmark__sub">Güven %${esc(String(turkey.confidence))}</span>
      </div>
      <div class="dos-benchmark__row dos-benchmark__row--diff">
        <span class="dos-benchmark__label">Fark</span>
        <strong class="dos-benchmark__value dos-benchmark__value--${diff.score >= 0 ? 'up' : 'down'}">${esc(diff.scoreLabel || '0')} puan</strong>
        <span class="dos-benchmark__sub">Güven ${esc(diff.confidenceLabel || '0')}</span>
      </div>
    </div>`;
}
