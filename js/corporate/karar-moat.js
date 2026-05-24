import { analytics } from '../core/analytics.js';
import {
  MOAT_PILLARS,
  COMPETITOR_FRAMES,
  renderMoatPillarsHtml,
  renderCompetitorFramesHtml
} from '../features/moat/competitive-positioning.js';
import { MOAT_ANALYTICS } from '../features/moat/outcome-intelligence.js';

function mountMoatPage() {
  const root = document.getElementById('karar-moat-root');
  if (!root) return;

  root.innerHTML = `
    <p class="kicker">Kategori sahipliği</p>
    <h1>isteBul = karar altyapısı</h1>
    <p class="lead">
      <strong>İlan bulmak başka, doğru karar vermek başka.</strong>
      isteBul ilan sitesi, generic AI sohbet veya yalnızca kredi karşılaştırması değil —
      toplam sahip olma maliyetine göre karar veren <em>decision infrastructure</em>.
    </p>

    <section aria-labelledby="moat-pillars-heading">
      <h2 id="moat-pillars-heading" class="section-title">Ürün moat katmanları</h2>
      ${renderMoatPillarsHtml()}
    </section>

    <section aria-labelledby="moat-competitors-heading" style="margin-top:2rem;">
      <h2 id="moat-competitors-heading" class="section-title">Rekabetçi konumlandırma</h2>
      <p class="lead">Listeleyici, fintech, OTA ve genel AI — her biri farklı optimizasyon yapar; isteBul karar altyapısıdır.</p>
      ${renderCompetitorFramesHtml()}
    </section>

    <section class="final-cta-card" style="margin-top:2rem;">
      <h2>Canlı deneyim</h2>
      <p>Auto analizde outcome insight ve feedback loop aktiftir; partner tarafında skorlu lead + callback ile outcome graph beslenir.</p>
      <div class="final-cta-actions">
        <a class="btn primary" href="/auto/#analiz">Auto karar analizi</a>
        <a class="btn secondary" href="/partner-olun.html">Partner programı</a>
      </div>
    </section>
  `;

  if (analytics.hasConsent()) {
    analytics.track(
      MOAT_ANALYTICS.MOAT_DIFFERENTIATION_VIEW,
      { pillars: MOAT_PILLARS.length, frames: COMPETITOR_FRAMES.length },
      { category: 'decision', funnel: 'decision_moat', funnel_step: 'positioning' }
    );
  }
}

document.addEventListener('DOMContentLoaded', mountMoatPage);
