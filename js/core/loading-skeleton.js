/**
 * P4.5 — Reusable skeleton markup for perceived speed.
 */

export function renderListingSkeletonGrid(count = 6) {
  const cards = Array.from({ length: count }, () => `
    <article class="ib-skeleton-card">
      <div class="ib-skeleton ib-skeleton-media" aria-hidden="true"></div>
      <div class="ib-skeleton ib-skeleton-line" aria-hidden="true"></div>
      <div class="ib-skeleton ib-skeleton-line ib-skeleton-line--short" aria-hidden="true"></div>
      <div class="ib-skeleton ib-skeleton-line ib-skeleton-line--btn" aria-hidden="true"></div>
    </article>
  `).join('');

  return `
    <div class="ib-listings-skeleton" role="status" aria-live="polite" aria-busy="true" aria-label="Seçenekler yükleniyor">
      ${cards}
    </div>
  `;
}

export function renderInlineSkeletonPanel(lines = 3) {
  const rows = Array.from({ length: lines }, (_, i) => `
    <div class="ib-skeleton ib-skeleton-line${i === lines - 1 ? ' ib-skeleton-line--short' : ''}" aria-hidden="true"></div>
  `).join('');

  return `<div class="ib-panel-skeleton" role="status" aria-busy="true">${rows}</div>`;
}
