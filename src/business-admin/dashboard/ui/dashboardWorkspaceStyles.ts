/**
 * İSTEBUL Business Admin — Dashboard Workspace responsive iskelet stilleri (PR-202B).
 *
 * Gerçek tasarım sistemi zorunlu değil; responsive yapı hazır olsun.
 */

export const DASHBOARD_WORKSPACE_STYLE_ID =
  'ib-ba-dashboard-workspace-styles' as const;

export const DASHBOARD_WORKSPACE_CSS = `
.ib-ba-dw {
  --ib-ba-dw-ink: #0f172a;
  --ib-ba-dw-muted: #475569;
  --ib-ba-dw-border: rgba(148, 163, 184, 0.35);
  --ib-ba-dw-surface: #ffffff;
  --ib-ba-dw-soft: #f1f5f9;
  box-sizing: border-box;
  color: var(--ib-ba-dw-ink);
  font-family: Georgia, "Times New Roman", serif;
  max-width: 72rem;
  margin: 0 auto;
  padding: 1rem;
}

.ib-ba-dw *,
.ib-ba-dw *::before,
.ib-ba-dw *::after {
  box-sizing: border-box;
}

.ib-ba-dw__header {
  margin: 0 0 1.25rem;
  padding: 1.25rem 1rem;
  border: 1px solid var(--ib-ba-dw-border);
  border-radius: 12px;
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.04), transparent 55%),
    var(--ib-ba-dw-surface);
}

.ib-ba-dw__title {
  margin: 0 0 0.35rem;
  font-size: clamp(1.5rem, 3.5vw, 2rem);
  line-height: 1.2;
}

.ib-ba-dw__subtitle,
.ib-ba-dw__tenant,
.ib-ba-dw__empty,
.ib-ba-dw__card-meta,
.ib-ba-dw__card-trend,
.ib-ba-dw__list-item-sub {
  margin: 0;
  color: var(--ib-ba-dw-muted);
  font-size: 0.95rem;
  line-height: 1.5;
}

.ib-ba-dw__tenant {
  margin-top: 0.5rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85rem;
}

.ib-ba-dw__section-title {
  margin: 0 0 0.75rem;
  font-size: 1.15rem;
}

.ib-ba-dw__overview,
.ib-ba-dw__cards,
.ib-ba-dw__lists,
.ib-ba-dw__summary {
  margin: 0 0 1.25rem;
  padding: 1rem;
  border: 1px solid var(--ib-ba-dw-border);
  border-radius: 12px;
  background: var(--ib-ba-dw-surface);
}

.ib-ba-dw__overview-grid,
.ib-ba-dw__summary-grid,
.ib-ba-dw__card-grid,
.ib-ba-dw__list-grid {
  display: grid;
  gap: 0.75rem;
}

.ib-ba-dw__overview-grid,
.ib-ba-dw__summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ib-ba-dw__card-grid,
.ib-ba-dw__list-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
}

.ib-ba-dw__overview-item,
.ib-ba-dw__summary-item,
.ib-ba-dw__card {
  padding: 0.75rem;
  border-radius: 10px;
  background: var(--ib-ba-dw-soft);
}

.ib-ba-dw__label {
  display: block;
  font-size: 0.78rem;
  color: var(--ib-ba-dw-muted);
  margin-bottom: 0.2rem;
}

.ib-ba-dw__value,
.ib-ba-dw__card-value {
  display: block;
  font-weight: 700;
}

.ib-ba-dw__card-title,
.ib-ba-dw__list-title {
  margin: 0 0 0.4rem;
  font-size: 1rem;
}

.ib-ba-dw__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ib-ba-dw__list-item {
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--ib-ba-dw-border);
}

.ib-ba-dw__list-item:last-child {
  border-bottom: 0;
}

.ib-ba-dw__list-item-title {
  display: block;
  font-weight: 600;
}

@media (max-width: 640px) {
  .ib-ba-dw {
    padding: 0.75rem;
  }

  .ib-ba-dw__overview-grid,
  .ib-ba-dw__summary-grid,
  .ib-ba-dw__card-grid,
  .ib-ba-dw__list-grid {
    grid-template-columns: 1fr;
  }
}
`.trim();

/**
 * Workspace CSS'ini document head'e enjekte eder (idempotent).
 */
export function ensureDashboardWorkspaceStyles(
  doc: Document = document
): void {
  if (doc.getElementById(DASHBOARD_WORKSPACE_STYLE_ID)) {
    return;
  }
  const style = doc.createElement('style');
  style.id = DASHBOARD_WORKSPACE_STYLE_ID;
  style.textContent = DASHBOARD_WORKSPACE_CSS;
  doc.head.appendChild(style);
}
