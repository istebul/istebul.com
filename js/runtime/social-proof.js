/**
 * Hero social proof — live aggregates from /api/public-stats or example fallback.
 */

const EXAMPLE_METRICS = Object.freeze({
  analyses: '12.400+',
  reports: '3.100+',
  users: 'Aktif',
  partners: '50+'
});

export function formatMetricLabel(value, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

export async function initSocialProofMetrics() {
  const root = document.querySelector('[data-social-proof]');
  const disclaimer = document.querySelector('[data-social-proof-disclaimer]');
  if (!root) return;

  try {
    const res = await fetch('/api/public-stats', {
      credentials: 'omit',
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) throw new Error(`stats ${res.status}`);
    const data = await res.json();

    const rawAnalyses = Number(data.raw?.analyses ?? 0);
    const useLive =
      data.mode === 'live' && data.metrics && rawAnalyses >= 50;

    if (useLive) {
      applyMetrics(root, data.metrics);
      root.dataset.socialProofMode = 'live';
      if (disclaimer) {
        disclaimer.textContent =
          'Platform özeti — toplulaştırılmış, kişisel veri içermez. Analiz ve skorlar bilgilendirme amaçlıdır.';
        disclaimer.hidden = false;
      }
      return;
    }
  } catch {
    /* fall through to example */
  }

  applyMetrics(root, EXAMPLE_METRICS);
  root.dataset.socialProofMode = 'example';
  if (disclaimer) {
    disclaimer.textContent =
      'Örnek gösterim metrikleri — canlı platform özeti yüklenemedi veya henüz yeterli veri yok.';
    disclaimer.hidden = false;
  }
}

function applyMetrics(root, metrics) {
  Object.entries(metrics).forEach(([key, value]) => {
    const el = root.querySelector(`[data-metric="${key}"]`);
    if (el) el.textContent = formatMetricLabel(value);
  });
}
