/**
 * İSTEBUL Business Admin — Reports Workspace responsive iskelet stilleri (PR-202C).
 */

export const REPORTS_WORKSPACE_STYLE_ID =
  'ib-ba-reports-workspace-styles' as const;

export const REPORTS_WORKSPACE_CSS = `
.ib-ba-rw {
  --ib-ba-rw-ink: #0f172a;
  --ib-ba-rw-muted: #475569;
  --ib-ba-rw-border: rgba(148, 163, 184, 0.35);
  --ib-ba-rw-surface: #ffffff;
  --ib-ba-rw-soft: #f8fafc;
  --ib-ba-rw-accent: #0f766e;
  box-sizing: border-box;
  color: var(--ib-ba-rw-ink);
  font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  max-width: 72rem;
  margin: 0 auto;
  padding: 1rem;
}

.ib-ba-rw *,
.ib-ba-rw *::before,
.ib-ba-rw *::after {
  box-sizing: border-box;
}

.ib-ba-rw__header {
  margin: 0 0 1.25rem;
  padding: 1.25rem 1rem;
  border: 1px solid var(--ib-ba-rw-border);
  border-radius: 12px;
  background:
    linear-gradient(140deg, rgba(15, 118, 110, 0.08), transparent 55%),
    var(--ib-ba-rw-surface);
}

.ib-ba-rw__title {
  margin: 0 0 0.35rem;
  font-size: clamp(1.5rem, 3.5vw, 2rem);
  line-height: 1.2;
}

.ib-ba-rw__subtitle,
.ib-ba-rw__tenant,
.ib-ba-rw__empty,
.ib-ba-rw__item-sub,
.ib-ba-rw__item-status,
.ib-ba-rw__detail-body {
  margin: 0;
  color: var(--ib-ba-rw-muted);
  font-size: 0.95rem;
  line-height: 1.5;
}

.ib-ba-rw__tenant {
  margin-top: 0.5rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85rem;
}

.ib-ba-rw__section-title {
  margin: 0 0 0.75rem;
  font-size: 1.15rem;
}

.ib-ba-rw__overview,
.ib-ba-rw__list,
.ib-ba-rw__detail,
.ib-ba-rw__summary {
  margin: 0 0 1.25rem;
  padding: 1rem;
  border: 1px solid var(--ib-ba-rw-border);
  border-radius: 12px;
  background: var(--ib-ba-rw-surface);
}

.ib-ba-rw__overview-grid,
.ib-ba-rw__summary-grid,
.ib-ba-rw__list-grid {
  display: grid;
  gap: 0.75rem;
}

.ib-ba-rw__overview-grid,
.ib-ba-rw__summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ib-ba-rw__list-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
}

.ib-ba-rw__overview-item,
.ib-ba-rw__summary-item,
.ib-ba-rw__detail-panel,
.ib-ba-rw__status-panel {
  padding: 0.75rem;
  border-radius: 10px;
  background: var(--ib-ba-rw-soft);
}

.ib-ba-rw__label {
  display: block;
  font-size: 0.78rem;
  color: var(--ib-ba-rw-muted);
  margin-bottom: 0.2rem;
}

.ib-ba-rw__value,
.ib-ba-rw__detail-headline {
  display: block;
  font-weight: 700;
}

.ib-ba-rw__detail-title,
.ib-ba-rw__list-title {
  margin: 0 0 0.4rem;
  font-size: 1rem;
}

.ib-ba-rw__items,
.ib-ba-rw__highlights {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ib-ba-rw__item,
.ib-ba-rw__highlight {
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--ib-ba-rw-border);
}

.ib-ba-rw__item:last-child,
.ib-ba-rw__highlight:last-child {
  border-bottom: 0;
}

.ib-ba-rw__item-title {
  display: block;
  font-weight: 600;
}

.ib-ba-rw__item-status {
  display: inline-block;
  margin-top: 0.25rem;
  color: var(--ib-ba-rw-accent);
  font-size: 0.8rem;
}

@media (max-width: 640px) {
  .ib-ba-rw {
    padding: 0.75rem;
  }

  .ib-ba-rw__overview-grid,
  .ib-ba-rw__summary-grid,
  .ib-ba-rw__list-grid {
    grid-template-columns: 1fr;
  }
}
`.trim();

/**
 * Workspace CSS'ini document head'e enjekte eder (idempotent).
 */
export function ensureReportsWorkspaceStyles(doc: Document = document): void {
  if (doc.getElementById(REPORTS_WORKSPACE_STYLE_ID)) {
    return;
  }
  const style = doc.createElement('style');
  style.id = REPORTS_WORKSPACE_STYLE_ID;
  style.textContent = REPORTS_WORKSPACE_CSS;
  doc.head.appendChild(style);
}
