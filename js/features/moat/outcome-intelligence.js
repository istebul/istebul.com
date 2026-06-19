import { analytics } from '../../core/analytics.js';
import { escapeHtml } from '../../core/security.js';
import { buildSegmentKey } from './scoring-intelligence.js';

export const MOAT_ANALYTICS = Object.freeze({
  OUTCOME_INSIGHT_VIEW: 'outcome_insight_view',
  MOAT_DIFFERENTIATION_VIEW: 'moat_differentiation_view'
});

async function fetchDecisionIntelligence(params = {}) {
  const baseUrl = (window.__env?.SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = window.__env?.SUPABASE_ANON_KEY || '';
  if (!baseUrl || !anonKey) return null;

  const search = new URLSearchParams({ action: 'benchmarks', ...params });
  const res = await fetch(`${baseUrl}/functions/v1/decision-intelligence?${search}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`
    }
  });

  if (!res.ok) return null;
  return res.json().catch(() => null);
}

export function renderOutcomeInsightHtml(segment, benchmarks = []) {
  if (!segment || !segment.sample_size || segment.sample_size < 3) {
    const globalCount = benchmarks.reduce((s, b) => s + (b.sample_size || 0), 0);
    return `
      <section class="ib-outcome-insight ib-outcome-insight--sparse" aria-label="Outcome intelligence">
        <p class="kicker">Outcome graph</p>
        <h3>Segment benchmark henüz oluşuyor</h3>
        <p class="lead">
          Partner kapanış sinyalleri biriktikçe anonim segment içgörüleri burada görünür.
          ${globalCount > 0 ? `Platform genelinde ${globalCount} outcome kaydı işlendi.` : 'İlk kapanışlar moat kalibrasyonunu başlatır.'}
        </p>
        <p class="ib-outcome-disclaimer">Kişisel veri gösterilmez; yalnızca anonim segment istatistikleri.</p>
      </section>`;
  }

  const winRate = segment.win_rate_pct != null ? `${segment.win_rate_pct}%` : '—';
  const avgMatch = segment.avg_match_score != null ? Math.round(segment.avg_match_score) : '—';

  return `
    <section class="ib-outcome-insight" aria-label="Outcome intelligence">
      <p class="kicker">Outcome graph · anonim segment</p>
      <h3>Bu profilde partner kapanış sinyali</h3>
      <div class="ib-outcome-metrics">
        <div class="ib-outcome-metric">
          <span class="ib-outcome-metric-label">Örneklem</span>
          <strong>${segment.sample_size}</strong>
          <small>lead (anonim)</small>
        </div>
        <div class="ib-outcome-metric">
          <span class="ib-outcome-metric-label">Kapanış oranı</span>
          <strong>${escapeHtml(String(winRate))}</strong>
          <small>partner outcome</small>
        </div>
        <div class="ib-outcome-metric">
          <span class="ib-outcome-metric-label">Ort. uyum skoru</span>
          <strong>${escapeHtml(String(avgMatch))}</strong>
          <small>kapanan segment</small>
        </div>
      </div>
      <p class="ib-outcome-disclaimer">
        Gösterim bilgilendirme amaçlıdır; gelecek performans garantisi değildir. Skor kalibrasyonu deterministik kurallarla uygulanır.
      </p>
    </section>`;
}

export async function mountOutcomeIntelligence(container, form = {}) {
  if (!container) return;

  const segmentKey = buildSegmentKey(form);
  container.innerHTML = `
    <section class="ib-outcome-insight ib-outcome-insight--loading" aria-live="polite">
      <p>Segment outcome verisi yükleniyor…</p>
    </section>`;

  const data = await fetchDecisionIntelligence({ segment: segmentKey });
  const segment = data?.segment || data?.benchmarks?.find((b) => b.segment_key === segmentKey);
  container.innerHTML = renderOutcomeInsightHtml(segment, data?.benchmarks || []);

  if (analytics.hasConsent()) {
    analytics.track(
      MOAT_ANALYTICS.OUTCOME_INSIGHT_VIEW,
      { segment_key: segmentKey, sample_size: segment?.sample_size || 0 },
      { category: 'decision', funnel: 'decision_moat', funnel_step: 'outcome_insight' }
    );
  }
}
