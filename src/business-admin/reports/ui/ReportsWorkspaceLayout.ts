/**
 * İSTEBUL Business Admin — Reports Workspace UI iskeleti (PR-202C).
 *
 * Responsive component yapısı. Gerçek tasarım sistemi zorunlu değil.
 * Realtime / CRUD / Export yok.
 */

import type { ReportsWorkspaceResult } from '../runtime/ReportsWorkspaceResult';
import type { ReportsWorkspaceWidgetProjection } from '../runtime/ReportsWorkspaceWidget';

export interface ReportsWorkspaceLayoutOptions {
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
export function createReportsWorkspaceHeader(
  title: string,
  subtitle: string,
  tenantId: string
): HTMLElement {
  const header = el('header', 'ib-ba-rw__header');
  header.append(
    el('h1', 'ib-ba-rw__title', title),
    el('p', 'ib-ba-rw__subtitle', subtitle),
    el('p', 'ib-ba-rw__tenant', `Tenant: ${tenantId}`)
  );
  return header;
}

/**
 * Overview alanı.
 */
export function createReportsWorkspaceOverview(
  widget?: ReportsWorkspaceWidgetProjection
): HTMLElement {
  const section = el('section', 'ib-ba-rw__overview');
  section.setAttribute('aria-label', 'Reports Overview');
  section.append(el('h2', 'ib-ba-rw__section-title', 'Overview'));

  if (!widget?.overview) {
    section.append(
      el('p', 'ib-ba-rw__empty', 'Rapor sonucu henüz bağlanmadı.')
    );
    return section;
  }

  const overview = widget.overview;
  const grid = el('div', 'ib-ba-rw__overview-grid');
  const rows: Array<[string, string]> = [
    ['Başlık', overview.title],
    ['Özet', overview.headline],
    ['Durum', overview.status],
    ['Son aşama', overview.lastStage],
    ['Versiyon', overview.version],
    ['Bölüm', String(overview.sectionCount)],
    ['Bulgu', String(overview.findingCount)],
    ['Öneri', String(overview.recommendationCount)]
  ];
  if (overview.description) {
    rows.splice(1, 0, ['Açıklama', overview.description]);
  }
  for (const [label, value] of rows) {
    const item = el('div', 'ib-ba-rw__overview-item');
    item.append(
      el('span', 'ib-ba-rw__label', label),
      el('span', 'ib-ba-rw__value', value)
    );
    grid.append(item);
  }
  section.append(grid);
  return section;
}

/**
 * Report List alanı (Recent Reports + Categories).
 */
export function createReportsWorkspaceReportList(
  widgets: readonly ReportsWorkspaceWidgetProjection[]
): HTMLElement {
  const section = el('section', 'ib-ba-rw__list');
  section.setAttribute('aria-label', 'Report List');
  section.append(el('h2', 'ib-ba-rw__section-title', 'Report List'));

  const listWidgets = widgets.filter(
    (item) => item.kind === 'list' || item.kind === 'categories'
  );
  if (listWidgets.length === 0) {
    section.append(el('p', 'ib-ba-rw__empty', 'Liste widget\'ı yok.'));
    return section;
  }

  const columns = el('div', 'ib-ba-rw__list-grid');
  for (const widget of listWidgets) {
    const column = el('div', 'ib-ba-rw__list-column');
    column.append(el('h3', 'ib-ba-rw__list-title', widget.name));
    if (widget.items.length === 0) {
      column.append(el('p', 'ib-ba-rw__empty', 'Öğe yok.'));
    } else {
      const ul = el('ul', 'ib-ba-rw__items');
      for (const item of widget.items) {
        const li = el('li', 'ib-ba-rw__item');
        li.append(el('span', 'ib-ba-rw__item-title', item.title));
        if (item.subtitle) {
          li.append(el('span', 'ib-ba-rw__item-sub', item.subtitle));
        }
        if (item.status) {
          li.append(el('span', 'ib-ba-rw__item-status', item.status));
        }
        ul.append(li);
      }
      column.append(ul);
    }
    columns.append(column);
  }

  section.append(columns);
  return section;
}

/**
 * Report Detail alanı (Details + Status).
 */
export function createReportsWorkspaceReportDetail(
  widgets: readonly ReportsWorkspaceWidgetProjection[]
): HTMLElement {
  const section = el('section', 'ib-ba-rw__detail');
  section.setAttribute('aria-label', 'Report Detail');
  section.append(el('h2', 'ib-ba-rw__section-title', 'Report Detail'));

  const detail = widgets.find((item) => item.widgetId === 'report-details');
  const status = widgets.find((item) => item.widgetId === 'report-status');

  if (!detail?.detail && !status?.reportStatus) {
    section.append(el('p', 'ib-ba-rw__empty', 'Detay yok.'));
    return section;
  }

  if (detail?.detail) {
    const panel = el('div', 'ib-ba-rw__detail-panel');
    panel.append(
      el('h3', 'ib-ba-rw__detail-title', detail.detail.title),
      el('p', 'ib-ba-rw__detail-headline', detail.detail.headline),
      el('p', 'ib-ba-rw__detail-body', detail.detail.body)
    );
    if (detail.detail.highlights.length > 0) {
      const ul = el('ul', 'ib-ba-rw__highlights');
      for (const highlight of detail.detail.highlights) {
        ul.append(el('li', 'ib-ba-rw__highlight', highlight));
      }
      panel.append(ul);
    }
    section.append(panel);
  }

  if (status?.reportStatus) {
    const statusPanel = el('div', 'ib-ba-rw__status-panel');
    statusPanel.append(
      el('h3', 'ib-ba-rw__list-title', 'Report Status'),
      el(
        'p',
        'ib-ba-rw__value',
        `${status.reportStatus.status} · ${status.reportStatus.lastStage}`
      )
    );
    section.append(statusPanel);
  }

  return section;
}

/**
 * Summary alanı.
 */
export function createReportsWorkspaceSummaryPanel(
  result: ReportsWorkspaceResult
): HTMLElement {
  const section = el('section', 'ib-ba-rw__summary');
  section.setAttribute('aria-label', 'Summary');
  section.append(el('h2', 'ib-ba-rw__section-title', 'Summary'));

  const grid = el('div', 'ib-ba-rw__summary-grid');
  for (const item of result.summaryItems) {
    const row = el('div', 'ib-ba-rw__summary-item');
    row.append(
      el('span', 'ib-ba-rw__label', item.label),
      el('span', 'ib-ba-rw__value', String(item.value))
    );
    grid.append(row);
  }
  section.append(grid);
  return section;
}

/**
 * Tam workspace layout iskeleti:
 * Header → Overview → Report List → Report Detail → Summary
 */
export function createReportsWorkspaceLayout(
  result: ReportsWorkspaceResult,
  options: ReportsWorkspaceLayoutOptions = {}
): HTMLElement {
  const root = el('div', 'ib-ba-rw');
  root.setAttribute('data-workspace', 'reports');

  const overview = result.widgets.find(
    (item) => item.widgetId === 'reports-overview'
  );

  root.append(
    createReportsWorkspaceHeader(
      options.title ?? 'Reports Workspace',
      options.subtitle ?? 'Business Admin rapor çalışma alanı (iskelet)',
      result.summary.tenantId
    ),
    createReportsWorkspaceOverview(overview),
    createReportsWorkspaceReportList(result.widgets),
    createReportsWorkspaceReportDetail(result.widgets),
    createReportsWorkspaceSummaryPanel(result)
  );

  return root;
}

/**
 * Workspace sonucunu container'a monte eder.
 */
export function mountReportsWorkspace(
  container: HTMLElement,
  result: ReportsWorkspaceResult,
  options?: ReportsWorkspaceLayoutOptions
): void {
  container.replaceChildren(createReportsWorkspaceLayout(result, options));
}
