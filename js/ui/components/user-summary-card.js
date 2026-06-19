import { escapeHtml } from '../../core/security.js';

export function renderUserSummaryCard({ title, value, subtitle, icon, tone = 'default' }) {
  const safeTitle = escapeHtml(title || 'Özet');
  const safeValue = escapeHtml(value == null ? '0' : String(value));
  const safeSubtitle = escapeHtml(subtitle || '');
  const safeIcon = escapeHtml(icon || 'circle');
  const safeTone = escapeHtml(tone);

  return `
    <article class="ud-summary-card tone-${safeTone}">
      <p class="ud-summary-icon"><i data-lucide="${safeIcon}" aria-hidden="true"></i></p>
      <p class="ud-summary-title">${safeTitle}</p>
      <strong class="ud-summary-value">${safeValue}</strong>
      <p class="ud-summary-subtitle">${safeSubtitle}</p>
    </article>
  `;
}
