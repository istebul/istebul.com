/**
 * Decision Engine V3 — ortak sonuç UI renderer.
 */
import { escapeHtml } from '../core/security.js';

function clampDisplay(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function formatTry(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function scoreTone(score) {
  if (score >= 75) return 'de-v3-score--good';
  if (score >= 55) return 'de-v3-score--mid';
  return 'de-v3-score--low';
}

function riskTone(score) {
  if (score <= 35) return 'de-v3-score--good';
  if (score <= 55) return 'de-v3-score--mid';
  return 'de-v3-score--low';
}

function renderScoreCard(label, value, toneClass, suffix = '/100') {
  return `
    <article class="de-v3-card de-v3-score-card">
      <h4 class="de-v3-card__label">${label}</h4>
      <p class="de-v3-score ${toneClass}" aria-label="${label}: ${value}${suffix}">
        <span class="de-v3-score__value">${value}</span>
        <span class="de-v3-score__suffix">${suffix}</span>
      </p>
    </article>`;
}

function renderRadarItem(label, value) {
  const pct = clampDisplay(value);
  return `
    <li class="de-v3-radar__item">
      <div class="de-v3-radar__head">
        <span class="de-v3-radar__label">${label}</span>
        <span class="de-v3-radar__value">${pct}</span>
      </div>
      <div class="de-v3-radar__track" role="presentation">
        <div class="de-v3-radar__fill" style="width:${pct}%"></div>
      </div>
    </li>`;
}

function renderListSection(title, items, className) {
  if (!items?.length) return '';
  return `
    <section class="de-v3-section ${className}">
      <h3 class="de-v3-section__title">${title}</h3>
      <ul class="de-v3-list">
        ${items.map((item) => `<li>${escapeHtml(String(item))}</li>`).join('')}
      </ul>
    </section>`;
}

function renderWhatIfSection(scenarios) {
  if (!scenarios?.length) return '';
  const cards = scenarios
    .map(
      (s) => `
    <article class="de-v3-whatif-card">
      <h4 class="de-v3-whatif-card__title">${escapeHtml(s.title)}</h4>
      <p class="de-v3-whatif-card__change">
        <span class="de-v3-whatif-card__field">${escapeHtml(s.changedField)}</span>:
        ${escapeHtml(String(s.before))} → ${escapeHtml(String(s.after))}
      </p>
      <p class="de-v3-whatif-card__impact">${escapeHtml(s.impact)}</p>
      <p class="de-v3-whatif-card__explanation">${escapeHtml(s.explanation)}</p>
    </article>`
    )
    .join('');

  return `
    <section class="de-v3-section de-v3-section--whatif">
      <h3 class="de-v3-section__title">What If Senaryoları</h3>
      <div class="de-v3-whatif-grid">${cards}</div>
    </section>`;
}

function renderDecisionHtml(decision) {
  const d = decision || {};
  const summary = d.summary || {};
  const totalCost = d.totalCost || {};
  const radar = d.radar || d.riskRadar || {};

  const decisionScore = clampDisplay(d.decisionScore);
  const confidenceScore = clampDisplay(d.confidenceScore);
  const riskScore = clampDisplay(d.riskScore);

  return `
    <div class="de-v3-root" data-decision-engine-version="v3">
      <header class="de-v3-header">
        <p class="de-v3-header__badge">AI Decision Engine v3</p>
        <h2 class="de-v3-header__title">${escapeHtml(summary.title || 'Karar Özeti')}</h2>
        <p class="de-v3-header__verdict">${escapeHtml(summary.verdict || '')}</p>
        <p class="de-v3-header__explanation">${escapeHtml(summary.shortExplanation || '')}</p>
      </header>

      <div class="de-v3-scores">
        ${renderScoreCard('Karar Skoru', decisionScore, scoreTone(decisionScore))}
        ${renderScoreCard('Güven Skoru', confidenceScore, scoreTone(confidenceScore))}
        ${renderScoreCard('Risk Skoru', riskScore, riskTone(riskScore))}
      </div>

      <section class="de-v3-section de-v3-section--cost">
        <h3 class="de-v3-section__title">Toplam Maliyet</h3>
        <div class="de-v3-cost-grid">
          <article class="de-v3-card de-v3-cost-card">
            <span class="de-v3-cost-card__period">1 Yıl</span>
            <span class="de-v3-cost-card__amount">${formatTry(totalCost.oneYear)}</span>
          </article>
          <article class="de-v3-card de-v3-cost-card">
            <span class="de-v3-cost-card__period">3 Yıl</span>
            <span class="de-v3-cost-card__amount">${formatTry(totalCost.threeYear)}</span>
          </article>
          <article class="de-v3-card de-v3-cost-card">
            <span class="de-v3-cost-card__period">5 Yıl</span>
            <span class="de-v3-cost-card__amount">${formatTry(totalCost.fiveYear)}</span>
          </article>
        </div>
      </section>

      <section class="de-v3-section de-v3-section--radar">
        <h3 class="de-v3-section__title">Risk Radar</h3>
        <ul class="de-v3-radar">
          ${renderRadarItem('Finansal Risk', radar.financialRisk)}
          ${renderRadarItem('Likidite Riski', radar.liquidityRisk)}
          ${renderRadarItem('Bakım Riski', radar.maintenanceRisk)}
          ${renderRadarItem('Değer Kaybı', radar.depreciationRisk)}
          ${renderRadarItem('Kredi Riski', radar.creditRisk)}
        </ul>
      </section>

      ${renderListSection('Neden Bu Sonuç?', d.explainableReasons, 'de-v3-section--reasons')}
      ${renderListSection('Alternatif Bakış', d.alternativeReasons, 'de-v3-section--alternatives')}
      ${renderWhatIfSection(d.whatIfScenarios)}

      <footer class="de-v3-footer">
        <h3 class="de-v3-footer__title">Sonraki En Mantıklı Aksiyon</h3>
        <p class="de-v3-footer__action">${escapeHtml(summary.nextBestAction || '')}</p>
      </footer>
    </div>`;
}

/**
 * Decision Engine V3 sonuçlarını container'a render eder.
 * @param {HTMLElement|null} container
 * @param {object} decision — buildDecisionEngineV3 çıktısı
 */
export function renderDecisionEngineV3(container, decision) {
  if (!container || !decision) return null;

  try {
    container.innerHTML = renderDecisionHtml(decision);
    container.classList.add('de-v3-mount');
    container.removeAttribute('hidden');
    return container;
  } catch {
    return null;
  }
}
