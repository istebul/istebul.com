/**
 * İSTEBUL Business Admin — Export Workspace responsive iskelet stilleri (PR-202D).
 */

export const EXPORT_WORKSPACE_STYLE_ID =
  'ib-ba-export-workspace-styles' as const;

export const EXPORT_WORKSPACE_CSS = `
.ib-ba-ew {
  --ib-ba-ew-ink: #0f172a;
  --ib-ba-ew-muted: #475569;
  --ib-ba-ew-border: rgba(148, 163, 184, 0.35);
  --ib-ba-ew-surface: #ffffff;
  --ib-ba-ew-soft: #f8fafc;
  --ib-ba-ew-accent: #b45309;
  box-sizing: border-box;
  color: var(--ib-ba-ew-ink);
  font-family: "Source Serif 4", "Libre Baskerville", Georgia, serif;
  max-width: 72rem;
  margin: 0 auto;
  padding: 1rem;
}

.ib-ba-ew *,
.ib-ba-ew *::before,
.ib-ba-ew *::after {
  box-sizing: border-box;
}

.ib-ba-ew__header {
  margin: 0 0 1.25rem;
  padding: 1.25rem 1rem;
  border: 1px solid var(--ib-ba-ew-border);
  border-radius: 12px;
  background:
    linear-gradient(145deg, rgba(180, 83, 9, 0.08), transparent 55%),
    var(--ib-ba-ew-surface);
}

.ib-ba-ew__title {
  margin: 0 0 0.35rem;
  font-size: clamp(1.5rem, 3.5vw, 2rem);
  line-height: 1.2;
}

.ib-ba-ew__subtitle,
.ib-ba-ew__tenant,
.ib-ba-ew__empty,
.ib-ba-ew__item-sub,
.ib-ba-ew__item-status,
.ib-ba-ew__format-sub,
.ib-ba-ew__format-status {
  margin: 0;
  color: var(--ib-ba-ew-muted);
  font-size: 0.95rem;
  line-height: 1.5;
}

.ib-ba-ew__tenant {
  margin-top: 0.5rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85rem;
}

.ib-ba-ew__section-title {
  margin: 0 0 0.75rem;
  font-size: 1.15rem;
}

.ib-ba-ew__overview,
.ib-ba-ew__formats,
.ib-ba-ew__recent,
.ib-ba-ew__status,
.ib-ba-ew__summary {
  margin: 0 0 1.25rem;
  padding: 1rem;
  border: 1px solid var(--ib-ba-ew-border);
  border-radius: 12px;
  background: var(--ib-ba-ew-surface);
}

.ib-ba-ew__overview-grid,
.ib-ba-ew__summary-grid,
.ib-ba-ew__status-grid,
.ib-ba-ew__format-grid {
  display: grid;
  gap: 0.75rem;
}

.ib-ba-ew__overview-grid,
.ib-ba-ew__summary-grid,
.ib-ba-ew__status-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ib-ba-ew__format-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
}

.ib-ba-ew__overview-item,
.ib-ba-ew__summary-item,
.ib-ba-ew__status-item,
.ib-ba-ew__format-card {
  padding: 0.75rem;
  border-radius: 10px;
  background: var(--ib-ba-ew-soft);
}

.ib-ba-ew__label {
  display: block;
  font-size: 0.78rem;
  color: var(--ib-ba-ew-muted);
  margin-bottom: 0.2rem;
}

.ib-ba-ew__value,
.ib-ba-ew__format-title,
.ib-ba-ew__item-title {
  display: block;
  font-weight: 700;
}

.ib-ba-ew__format-title {
  margin: 0 0 0.25rem;
  font-size: 1rem;
}

.ib-ba-ew__items {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ib-ba-ew__item {
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--ib-ba-ew-border);
}

.ib-ba-ew__item:last-child {
  border-bottom: 0;
}

.ib-ba-ew__item-status,
.ib-ba-ew__format-status {
  display: inline-block;
  margin-top: 0.25rem;
  color: var(--ib-ba-ew-accent);
  font-size: 0.8rem;
}

@media (max-width: 640px) {
  .ib-ba-ew {
    padding: 0.75rem;
  }

  .ib-ba-ew__overview-grid,
  .ib-ba-ew__summary-grid,
  .ib-ba-ew__status-grid,
  .ib-ba-ew__format-grid {
    grid-template-columns: 1fr;
  }
}
`.trim();

/**
 * Workspace CSS'ini document head'e enjekte eder (idempotent).
 */
export function ensureExportWorkspaceStyles(doc: Document = document): void {
  if (doc.getElementById(EXPORT_WORKSPACE_STYLE_ID)) {
    return;
  }
  const style = doc.createElement('style');
  style.id = EXPORT_WORKSPACE_STYLE_ID;
  style.textContent = EXPORT_WORKSPACE_CSS;
  doc.head.appendChild(style);
}
