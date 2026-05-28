/**
 * Unified premium decision results dashboard — shared across Auto, Konut, Tatil, Finans.
 * Auto quality reference; standard blocks for all verticals.
 */

export function escapeDashboardHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {object} config
 * @param {string} [config.category]
 * @param {string} [config.kicker]
 * @param {string} [config.title]
 * @param {string} [config.scoreBand]
 * @param {number|string} config.decisionScore
 * @param {string} config.totalCostLabel
 * @param {string} [config.totalCostHint]
 * @param {string} config.riskLabel
 * @param {string} [config.riskDetail]
 * @param {string[]} [config.advantages]
 * @param {string[]} [config.cautions]
 * @param {string} config.aiSummary
 * @param {string[]} [config.aiBullets]
 * @param {string} config.nextStep
 * @param {Array<{label:string,value:string,hint?:string}>} [config.extraKpis]
 * @param {string} [config.extraBlocks]
 */
export function renderPremiumDecisionDashboard(config) {
  const esc = escapeDashboardHtml;
  const adv = (config.advantages || []).filter(Boolean);
  const caut = (config.cautions || []).filter(Boolean);
  const bullets = (config.aiBullets || []).filter(Boolean);
  const extraKpis = (config.extraKpis || []).filter((k) => k?.label);

  const extraKpiHtml = extraKpis.length
    ? `<div class="ib-premium-dashboard__kpis ib-premium-dashboard__kpis--extra">
        ${extraKpis
          .map(
            (kpi) => `
          <article class="ib-premium-kpi">
            <span>${esc(kpi.label)}</span>
            <strong>${esc(kpi.value || '—')}</strong>
            ${kpi.hint ? `<small>${esc(kpi.hint)}</small>` : ''}
          </article>`
          )
          .join('')}
      </div>`
    : '';

  return `
    <section class="ib-premium-dashboard" data-category="${esc(config.category || 'vertical')}" aria-label="Karar analizi sonuç paneli">
      <header class="ib-premium-dashboard__hero">
        <p class="ib-premium-dashboard__kicker">${esc(config.kicker || 'Karar analizi tamamlandı')}</p>
        <h2 class="ib-premium-dashboard__title">${esc(config.title || 'Kişiselleştirilmiş sonuç')}</h2>
        ${config.scoreBand ? `<p class="ib-premium-dashboard__band">${esc(config.scoreBand)}</p>` : ''}
      </header>
      <div class="ib-premium-dashboard__kpis">
        <article class="ib-premium-kpi ib-premium-kpi--score">
          <span>Karar Skoru</span>
          <strong>${esc(String(config.decisionScore ?? '—'))}<small>/100</small></strong>
        </article>
        <article class="ib-premium-kpi ib-premium-kpi--cost">
          <span>Toplam Maliyet</span>
          <strong>${esc(config.totalCostLabel || '—')}</strong>
          ${config.totalCostHint ? `<small>${esc(config.totalCostHint)}</small>` : ''}
        </article>
        <article class="ib-premium-kpi ib-premium-kpi--risk">
          <span>Risk Analizi</span>
          <strong>${esc(config.riskLabel || '—')}</strong>
          ${config.riskDetail ? `<small>${esc(config.riskDetail)}</small>` : ''}
        </article>
      </div>
      ${extraKpiHtml}
      <div class="ib-premium-dashboard__dual">
        <article class="ib-premium-block ib-premium-block--pros">
          <h3>Avantajlar</h3>
          <ul>${adv.length ? adv.map((a) => `<li>${esc(a)}</li>`).join('') : '<li>Profilinize uygun dengeli senaryo</li>'}</ul>
        </article>
        <article class="ib-premium-block ib-premium-block--cautions">
          <h3>Dikkat Edilecekler</h3>
          <ul>${caut.length ? caut.map((c) => `<li>${esc(c)}</li>`).join('') : '<li>Kesin teklif değildir; bilgilendirme amaçlıdır</li>'}</ul>
        </article>
      </div>
      <article class="ib-premium-block ib-premium-block--ai">
        <h3>AI Yorumu</h3>
        <p class="ib-premium-ai-lead">${esc(config.aiSummary || '—')}</p>
        ${bullets.length ? `<ul class="ib-premium-ai-bullets">${bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
      </article>
      <article class="ib-premium-block ib-premium-block--next">
        <h3>Sonraki Adımlar</h3>
        <p>${esc(config.nextStep || 'Seçiminizi onaylayın veya alternatif senaryoları karşılaştırın.')}</p>
      </article>
      ${config.extraBlocks || ''}
    </section>`;
}
