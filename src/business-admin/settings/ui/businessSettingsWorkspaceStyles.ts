/**
 * İSTEBUL Business Admin — Business Settings Workspace responsive stilleri (PR-202E).
 */

export const BUSINESS_SETTINGS_WORKSPACE_STYLE_ID =
  'ib-ba-settings-workspace-styles' as const;

export const BUSINESS_SETTINGS_WORKSPACE_CSS = `
.ib-ba-sw {
  --ib-ba-sw-ink: #0f172a;
  --ib-ba-sw-muted: #475569;
  --ib-ba-sw-border: rgba(148, 163, 184, 0.35);
  --ib-ba-sw-surface: #ffffff;
  --ib-ba-sw-soft: #f8fafc;
  --ib-ba-sw-accent: #1d4ed8;
  box-sizing: border-box;
  color: var(--ib-ba-sw-ink);
  font-family: "IBM Plex Serif", "Source Serif 4", Georgia, serif;
  max-width: 72rem;
  margin: 0 auto;
  padding: 1rem;
}

.ib-ba-sw *,
.ib-ba-sw *::before,
.ib-ba-sw *::after {
  box-sizing: border-box;
}

.ib-ba-sw__header {
  margin: 0 0 1.25rem;
  padding: 1.25rem 1rem;
  border: 1px solid var(--ib-ba-sw-border);
  border-radius: 12px;
  background:
    linear-gradient(150deg, rgba(29, 78, 216, 0.08), transparent 55%),
    var(--ib-ba-sw-surface);
}

.ib-ba-sw__title {
  margin: 0 0 0.35rem;
  font-size: clamp(1.5rem, 3.5vw, 2rem);
  line-height: 1.2;
}

.ib-ba-sw__subtitle,
.ib-ba-sw__tenant,
.ib-ba-sw__empty {
  margin: 0;
  color: var(--ib-ba-sw-muted);
  font-size: 0.95rem;
  line-height: 1.5;
}

.ib-ba-sw__tenant {
  margin-top: 0.5rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85rem;
}

.ib-ba-sw__section-title {
  margin: 0 0 0.75rem;
  font-size: 1.15rem;
}

.ib-ba-sw__profile,
.ib-ba-sw__organization,
.ib-ba-sw__branding,
.ib-ba-sw__localization,
.ib-ba-sw__notifications,
.ib-ba-sw__ai,
.ib-ba-sw__summary {
  margin: 0 0 1.25rem;
  padding: 1rem;
  border: 1px solid var(--ib-ba-sw-border);
  border-radius: 12px;
  background: var(--ib-ba-sw-surface);
}

.ib-ba-sw__field-grid,
.ib-ba-sw__summary-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ib-ba-sw__field,
.ib-ba-sw__summary-item {
  padding: 0.75rem;
  border-radius: 10px;
  background: var(--ib-ba-sw-soft);
}

.ib-ba-sw__label {
  display: block;
  font-size: 0.78rem;
  color: var(--ib-ba-sw-muted);
  margin-bottom: 0.2rem;
}

.ib-ba-sw__value {
  display: block;
  font-weight: 700;
}

@media (max-width: 640px) {
  .ib-ba-sw {
    padding: 0.75rem;
  }

  .ib-ba-sw__field-grid,
  .ib-ba-sw__summary-grid {
    grid-template-columns: 1fr;
  }
}
`.trim();

/**
 * Workspace CSS'ini document head'e enjekte eder (idempotent).
 */
export function ensureBusinessSettingsWorkspaceStyles(
  doc: Document = document
): void {
  if (doc.getElementById(BUSINESS_SETTINGS_WORKSPACE_STYLE_ID)) {
    return;
  }
  const style = doc.createElement('style');
  style.id = BUSINESS_SETTINGS_WORKSPACE_STYLE_ID;
  style.textContent = BUSINESS_SETTINGS_WORKSPACE_CSS;
  doc.head.appendChild(style);
}
