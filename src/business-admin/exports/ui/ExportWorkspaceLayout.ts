/**
 * İSTEBUL Business Admin — Export Workspace UI iskeleti (PR-202D).
 *
 * Responsive component yapısı. Gerçek tasarım sistemi zorunlu değil.
 * Realtime / CRUD yok.
 */

import type { ExportWorkspaceResult } from '../runtime/ExportWorkspaceResult';
import type { ExportWorkspaceWidgetProjection } from '../runtime/ExportWorkspaceWidget';

export interface ExportWorkspaceLayoutOptions {
  title?: string;
  subtitle?: string;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

/**
 * Workspace Header alanı.
 */
export function createExportWorkspaceHeader(
  title: string,
  subtitle: string,
  tenantId: string
): HTMLElement {
  const header = el('header', 'ib-ba-ew__header');
  header.append(
    el('h1', 'ib-ba-ew__title', title),
    el('p', 'ib-ba-ew__subtitle', subtitle),
    el('p', 'ib-ba-ew__tenant', `Tenant: ${tenantId}`)
  );
  return header;
}

/**
 * Overview alanı.
 */
export function createExportWorkspaceOverview(
  widget?: ExportWorkspaceWidgetProjection
): HTMLElement {
  const section = el('section', 'ib-ba-ew__overview');
  section.setAttribute('aria-label', 'Exports Overview');
  section.append(el('h2', 'ib-ba-ew__section-title', 'Overview'));

  if (!widget?.overview) {
    section.append(
      el('p', 'ib-ba-ew__empty', 'Export sonucu henüz bağlanmadı.')
    );
    return section;
  }

  const overview = widget.overview;
  const grid = el('div', 'ib-ba-ew__overview-grid');
  const rows: Array<[string, string]> = [
    ['Başlık', overview.title],
    ['Özet', overview.headline],
    ['Durum', overview.status],
    ['Son aşama', overview.lastStage],
    ['Versiyon', overview.version],
    ['Format', String(overview.formatCount)],
    ['Artifact', String(overview.artifactCount)],
    ['Uyarı', String(overview.warningCount)]
  ];
  for (const [label, value] of rows) {
    const item = el('div', 'ib-ba-ew__overview-item');
    item.append(
      el('span', 'ib-ba-ew__label', label),
      el('span', 'ib-ba-ew__value', value)
    );
    grid.append(item);
  }
  section.append(grid);
  return section;
}

/**
 * Formats alanı.
 */
export function createExportWorkspaceFormats(
  widget?: ExportWorkspaceWidgetProjection
): HTMLElement {
  const section = el('section', 'ib-ba-ew__formats');
  section.setAttribute('aria-label', 'Available Formats');
  section.append(el('h2', 'ib-ba-ew__section-title', 'Formats'));

  if (!widget || widget.items.length === 0) {
    section.append(el('p', 'ib-ba-ew__empty', 'Format yok.'));
    return section;
  }

  const grid = el('div', 'ib-ba-ew__format-grid');
  for (const item of widget.items) {
    const card = el('article', 'ib-ba-ew__format-card');
    card.append(
      el('h3', 'ib-ba-ew__format-title', item.title),
      el('p', 'ib-ba-ew__format-sub', item.subtitle ?? item.formatId ?? '')
    );
    if (item.status) {
      card.append(el('p', 'ib-ba-ew__format-status', item.status));
    }
    grid.append(card);
  }
  section.append(grid);
  return section;
}

/**
 * Recent Exports alanı.
 */
export function createExportWorkspaceRecentExports(
  widget?: ExportWorkspaceWidgetProjection
): HTMLElement {
  const section = el('section', 'ib-ba-ew__recent');
  section.setAttribute('aria-label', 'Recent Exports');
  section.append(el('h2', 'ib-ba-ew__section-title', 'Recent Exports'));

  if (!widget || widget.items.length === 0) {
    section.append(el('p', 'ib-ba-ew__empty', 'Export yok.'));
    return section;
  }

  const ul = el('ul', 'ib-ba-ew__items');
  for (const item of widget.items) {
    const li = el('li', 'ib-ba-ew__item');
    li.append(el('span', 'ib-ba-ew__item-title', item.title));
    if (item.subtitle) {
      li.append(el('span', 'ib-ba-ew__item-sub', item.subtitle));
    }
    if (item.status) {
      li.append(el('span', 'ib-ba-ew__item-status', item.status));
    }
    ul.append(li);
  }
  section.append(ul);
  return section;
}

/**
 * Status alanı.
 */
export function createExportWorkspaceStatus(
  widget?: ExportWorkspaceWidgetProjection
): HTMLElement {
  const section = el('section', 'ib-ba-ew__status');
  section.setAttribute('aria-label', 'Export Status');
  section.append(el('h2', 'ib-ba-ew__section-title', 'Status'));

  if (!widget?.exportStatus) {
    section.append(el('p', 'ib-ba-ew__empty', 'Durum yok.'));
    return section;
  }

  const status = widget.exportStatus;
  const grid = el('div', 'ib-ba-ew__status-grid');
  const rows: Array<[string, string]> = [
    ['Durum', status.status],
    ['Son aşama', status.lastStage],
    ['Artifact', String(status.artifactCount)],
    ['Format', String(status.formatCount)]
  ];
  if (status.completedAt) {
    rows.push(['Tamamlanma', status.completedAt]);
  }
  for (const [label, value] of rows) {
    const item = el('div', 'ib-ba-ew__status-item');
    item.append(
      el('span', 'ib-ba-ew__label', label),
      el('span', 'ib-ba-ew__value', value)
    );
    grid.append(item);
  }
  section.append(grid);
  return section;
}

/**
 * Summary alanı.
 */
export function createExportWorkspaceSummaryPanel(
  result: ExportWorkspaceResult
): HTMLElement {
  const section = el('section', 'ib-ba-ew__summary');
  section.setAttribute('aria-label', 'Summary');
  section.append(el('h2', 'ib-ba-ew__section-title', 'Summary'));

  const grid = el('div', 'ib-ba-ew__summary-grid');
  for (const item of result.summaryItems) {
    const row = el('div', 'ib-ba-ew__summary-item');
    row.append(
      el('span', 'ib-ba-ew__label', item.label),
      el('span', 'ib-ba-ew__value', String(item.value))
    );
    grid.append(row);
  }
  section.append(grid);
  return section;
}

/**
 * Tam workspace layout iskeleti:
 * Header → Overview → Formats → Recent Exports → Status → Summary
 */
export function createExportWorkspaceLayout(
  result: ExportWorkspaceResult,
  options: ExportWorkspaceLayoutOptions = {}
): HTMLElement {
  const root = el('div', 'ib-ba-ew');
  root.setAttribute('data-workspace', 'exports');

  const overview = result.widgets.find(
    (item) => item.widgetId === 'exports-overview'
  );
  const formats = result.widgets.find(
    (item) => item.widgetId === 'available-formats'
  );
  const recent = result.widgets.find(
    (item) => item.widgetId === 'recent-exports'
  );
  const status = result.widgets.find(
    (item) => item.widgetId === 'export-status'
  );

  root.append(
    createExportWorkspaceHeader(
      options.title ?? 'Export Workspace',
      options.subtitle ?? 'Business Admin export çalışma alanı (iskelet)',
      result.summary.tenantId
    ),
    createExportWorkspaceOverview(overview),
    createExportWorkspaceFormats(formats),
    createExportWorkspaceRecentExports(recent),
    createExportWorkspaceStatus(status),
    createExportWorkspaceSummaryPanel(result)
  );

  return root;
}

/**
 * Workspace sonucunu container'a monte eder.
 */
export function mountExportWorkspace(
  container: HTMLElement,
  result: ExportWorkspaceResult,
  options?: ExportWorkspaceLayoutOptions
): void {
  container.replaceChildren(createExportWorkspaceLayout(result, options));
}
