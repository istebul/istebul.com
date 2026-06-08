/**
 * Preference Intelligence — profile HTML builder (Sprint-32).
 */

import { escapeHtml } from '../core/dom-safe.js';
import { PREFERENCE_WARNING, buildPreferenceLabels } from './preference-engine.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
function safe(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {Record<string, unknown>} profile
 * @returns {string}
 */
export function buildPreferenceProfileHtml(profile = {}) {
  const labels = Array.isArray(profile.labels)
    ? profile.labels
    : buildPreferenceLabels(profile);

  return `
    <section class="udc-preferences" aria-label="Tercih Profili">
      <h4>Tercih Profili</h4>
      <p class="udc-preferences__warning" role="note">${safe(PREFERENCE_WARNING)}</p>

      ${
        labels.length
          ? `<ul class="udc-preferences__labels" role="list">
          ${labels.map((label) => `<li class="udc-preferences__chip">${safe(label)}</li>`).join('')}
        </ul>`
          : '<p class="udc-muted">Henüz yeterli davranış verisi toplanmadı. İlan incelemeleriniz zamanla profilinizi şekillendirecek.</p>'
      }

      <div class="udc-preferences__metrics" aria-label="Tercih metrikleri">
        ${renderMetric('Risk Hassasiyeti', profile.riskSensitivity)}
        ${renderMetric('Maliyet Hassasiyeti', profile.costSensitivity)}
        ${renderMetric('Kalite Hassasiyeti', profile.qualitySensitivity)}
        ${renderMetric('Aile Tercihi', profile.familyPreference)}
        ${renderMetric('Şehir Kullanımı', profile.cityUsagePreference)}
        ${renderMetric('Konfor Tercihi', profile.comfortPreference)}
        ${renderMetric('Performans Tercihi', profile.performancePreference)}
      </div>

      <p class="udc-disclaimer">Bu tercihler yalnızca açıklama ve kişiselleştirme için kullanılır; öneri skorlarını değiştirmez.</p>
    </section>`;
}

/**
 * @param {string} label
 * @param {unknown} value
 * @returns {string}
 */
function renderMetric(label, value) {
  const n = Math.max(0, Math.min(100, Number(value) || 50));
  return `
    <div class="udc-preferences__metric">
      <span>${safe(label)}</span>
      <div class="udc-preferences__bar" role="img" aria-label="${safe(label)} yüzde ${n}">
        <span style="width:${n}%"></span>
      </div>
      <small>%${n}</small>
    </div>`;
}
