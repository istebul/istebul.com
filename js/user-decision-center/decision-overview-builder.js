/**
 * User Decision Center — overview section builder (Sprint-30).
 */

import { escapeHtml } from '../core/dom-safe.js';
import { RISK_LEVEL_LABELS } from '../ai-purchase-decision/decision-summary.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
function safe(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {string|null|undefined} level
 * @returns {string}
 */
function riskToneClass(level) {
  if (level === 'low') return 'udc-metric--low';
  if (level === 'high') return 'udc-metric--high';
  return 'udc-metric--mid';
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {string}
 */
export function buildDecisionOverviewHtml(ctx) {
  if (!ctx?.ready) {
    return `
      <section class="udc-overview udc-overview--empty" aria-label="Karar özeti">
        <p class="udc-empty">${safe(ctx?.emptyMessage ?? 'Bu ilan için karar analizi henüz hazır değil.')}</p>
      </section>`;
  }

  const riskLabel = RISK_LEVEL_LABELS[String(ctx.riskLevel)] ?? safe(ctx.riskLabel);

  return `
    <section class="udc-overview" aria-label="Karar özeti">
      <div class="udc-overview__grid">
        <div class="udc-metric">
          <span class="udc-metric__label">Karar Skoru</span>
          <strong class="udc-metric__value">${safe(ctx.decisionScore)}</strong>
          <small>${safe(ctx.decisionLabel)}</small>
        </div>
        <div class="udc-metric">
          <span class="udc-metric__label">Güven Seviyesi</span>
          <strong class="udc-metric__value">${safe(ctx.confidenceScore)}</strong>
          <small>${safe(ctx.confidenceLevel)}</small>
        </div>
        <div class="udc-metric ${riskToneClass(String(ctx.riskLevel))}">
          <span class="udc-metric__label">Risk Seviyesi</span>
          <strong class="udc-metric__value">${safe(riskLabel)}</strong>
          <small>Tahmini risk değerlendirmesi</small>
        </div>
        <div class="udc-metric">
          <span class="udc-metric__label">Kalite Skoru</span>
          <strong class="udc-metric__value">${safe(ctx.qualityScore)}</strong>
        </div>
        <div class="udc-metric">
          <span class="udc-metric__label">Güven Skoru</span>
          <strong class="udc-metric__value">${safe(ctx.trustScore)}</strong>
        </div>
        ${
          ctx.totalCostSummary
            ? `<div class="udc-metric udc-metric--wide">
          <span class="udc-metric__label">Toplam Maliyet Özeti</span>
          <strong class="udc-metric__value">${safe(Number(ctx.totalCostSummary.total).toLocaleString('tr-TR'))} TRY</strong>
          <small>${safe(ctx.totalCostSummary.label)}</small>
        </div>`
            : `<div class="udc-metric udc-metric--wide">
          <span class="udc-metric__label">Toplam Maliyet Özeti</span>
          <strong class="udc-metric__value">—</strong>
          <small>Maliyet simülasyonu sınırlı</small>
        </div>`
        }
      </div>
    </section>`;
}
