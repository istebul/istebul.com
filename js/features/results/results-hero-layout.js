/**
 * Shared mockup-style results hero — light site theme, 2-column shell.
 */
import { escapeHtml } from '../../core/security.js';

function clampScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * Circular suitability score ring (light theme).
 */
export function renderDecisionScoreRing(score, label = '', { tone = 'ok' } = {}) {
  const pct = clampScore(score);
  const esc = escapeHtml;
  return `
    <div class="ib-results-score-ring ib-results-score-ring--${esc(tone)}" aria-label="Uygunluk skoru ${esc(String(pct))} üzerinden 100">
      <div class="ib-results-score-ring__gauge" style="--score-pct: ${pct}">
        <strong>${esc(String(pct))}<span>/100</span></strong>
      </div>
      ${label ? `<p class="ib-results-score-ring__label">${esc(label)}</p>` : ''}
      <a class="ib-results-score-ring__link" href="#ib-results-detail">Detayları gör</a>
    </div>`;
}

function renderSpecGrid(specs = []) {
  const esc = escapeHtml;
  const rows = (specs || []).filter((s) => s?.label && s?.value != null && s.value !== '');
  if (!rows.length) return '';
  return `
    <dl class="ib-results-spec-grid">
      ${rows
        .map(
          (s) => `
        <div class="ib-results-spec-grid__item">
          <dt>${esc(s.label)}</dt>
          <dd>${esc(String(s.value))}</dd>
        </div>`
        )
        .join('')}
    </dl>`;
}

/**
 * @param {object} opts
 * @param {'auto'|'housing'|'finance'} opts.vertical
 * @param {string} opts.title Page headline
 * @param {string} [opts.subtitle]
 * @param {object} [opts.recommendation]
 * @param {string} [opts.recommendation.kicker]
 * @param {string} [opts.recommendation.title]
 * @param {string} [opts.recommendation.subtitle]
 * @param {string} [opts.recommendation.badge]
 * @param {string} [opts.recommendation.badgeTone] success|warning|neutral
 * @param {string} [opts.recommendation.imageUrl]
 * @param {string} [opts.recommendation.imageAlt]
 * @param {Array<{label:string,value:string}>} [opts.specs]
 * @param {number} opts.score
 * @param {string} [opts.scoreLabel]
 * @param {string} [opts.scoreTone] ok|warn|danger
 * @param {string} [opts.evdsMountClass] extra class on economic mount
 */
export function renderResultsHeroLayout(opts = {}) {
  const esc = escapeHtml;
  const vertical = opts.vertical || 'finance';
  const rec = opts.recommendation || {};
  const badgeTone = rec.badgeTone || 'success';
  const scoreTone = opts.scoreTone || 'ok';
  const mountClass = opts.evdsMountClass || '';

  const recMedia = rec.imageUrl
    ? `<div class="ib-results-rec-card__media"><img src="${esc(rec.imageUrl)}" alt="${esc(rec.imageAlt || rec.title || 'Öneri')}" loading="lazy" decoding="async"></div>`
    : '';

  const recBadge = rec.badge
    ? `<span class="ib-results-rec-card__badge ib-results-rec-card__badge--${esc(badgeTone)}">${esc(rec.badge)}</span>`
    : '';

  return `
    <div class="ib-results-hero-shell ib-results-hero-shell--${esc(vertical)}" id="ib-results-hero">
      <header class="ib-results-hero-head">
        <h2 class="ib-results-hero-head__title">${esc(opts.title || 'Karar öneriniz')}</h2>
        ${opts.subtitle ? `<p class="ib-results-hero-head__lead">${esc(opts.subtitle)}</p>` : ''}
      </header>

      <div class="ib-results-hero-grid">
        <div class="ib-results-hero-main">
          <article class="ib-results-rec-card">
            <div class="ib-results-rec-card__head">
              <p class="ib-results-rec-card__kicker">${esc(rec.kicker || 'Önerilen')}</p>
              ${recBadge}
            </div>
            <div class="ib-results-rec-card__body">
              ${recMedia}
              <div class="ib-results-rec-card__copy">
                <h3 class="ib-results-rec-card__title">${esc(rec.title || 'Profilinize uygun senaryo')}</h3>
                ${rec.subtitle ? `<p class="ib-results-rec-card__subtitle">${esc(rec.subtitle)}</p>` : ''}
                ${renderSpecGrid(opts.specs)}
              </div>
            </div>
          </article>

          ${renderDecisionScoreRing(opts.score, opts.scoreLabel || 'Uygunluk Skoru', { tone: scoreTone })}
        </div>

        <aside class="ib-results-hero-aside" aria-label="Ekonomik göstergeler">
          <div class="ib-results-economic-mount ib-results-economic--sidebar ${esc(mountClass)}" data-results-economic-mount hidden></div>
        </aside>
      </div>
    </div>`;
}

/** Map risk/score labels to ring tone tokens. */
export function scoreToneFromLabel(label = '') {
  const key = String(label || '').toLowerCase();
  if (/mükemmel|çok iyi|iyi|düşük risk|düşük/.test(key) && !/yüksek|orta/.test(key)) return 'ok';
  if (/orta|kabul|dikkat/.test(key)) return 'warn';
  if (/yüksek|zayıf|düşük uyum|kritik/.test(key)) return 'danger';
  return 'ok';
}
