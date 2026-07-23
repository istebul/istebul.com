/**
 * İSTEBUL Business Admin — Dashboard Workspace UI iskeleti (PR-202B).
 *
 * Responsive component yapısı. Gerçek tasarım sistemi zorunlu değil.
 * Charts / realtime / CRUD yok.
 */

import type { DashboardWorkspaceResult } from '../runtime/DashboardWorkspaceResult';
import type { DashboardWorkspaceWidgetProjection } from '../runtime/DashboardWorkspaceWidget';

export interface DashboardWorkspaceLayoutOptions {
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
export function createDashboardWorkspaceHeader(
  title: string,
  subtitle: string,
  tenantId: string
): HTMLElement {
  const header = el('header', 'ib-ba-dw__header');
  header.append(
    el('h1', 'ib-ba-dw__title', title),
    el('p', 'ib-ba-dw__subtitle', subtitle),
    el('p', 'ib-ba-dw__tenant', `Tenant: ${tenantId}`)
  );
  return header;
}

/**
 * Overview alanı.
 */
export function createDashboardWorkspaceOverview(
  widget?: DashboardWorkspaceWidgetProjection
): HTMLElement {
  const section = el('section', 'ib-ba-dw__overview');
  section.setAttribute('aria-label', 'Overview');
  section.append(el('h2', 'ib-ba-dw__section-title', 'Overview'));

  if (!widget?.overview) {
    section.append(
      el('p', 'ib-ba-dw__empty', 'Dashboard sonucu henüz bağlanmadı.')
    );
    return section;
  }

  const overview = widget.overview;
  const grid = el('div', 'ib-ba-dw__overview-grid');
  const rows: Array<[string, string]> = [
    ['Başlık', overview.title],
    ['Durum', overview.status],
    ['Son aşama', overview.lastStage],
    ['Versiyon', overview.version],
    ['Bölüm', String(overview.sectionCount)],
    ['Widget', String(overview.widgetCount)],
    ['KPI', String(overview.kpiCount)]
  ];
  if (overview.description) {
    rows.splice(1, 0, ['Açıklama', overview.description]);
  }
  for (const [label, value] of rows) {
    const item = el('div', 'ib-ba-dw__overview-item');
    item.append(
      el('span', 'ib-ba-dw__label', label),
      el('span', 'ib-ba-dw__value', value)
    );
    grid.append(item);
  }
  section.append(grid);
  return section;
}

/**
 * KPI Cards alanı.
 */
export function createDashboardWorkspaceCards(
  widget?: DashboardWorkspaceWidgetProjection
): HTMLElement {
  const section = el('section', 'ib-ba-dw__cards');
  section.setAttribute('aria-label', 'KPI Cards');
  section.append(el('h2', 'ib-ba-dw__section-title', 'KPI Cards'));

  const grid = el('div', 'ib-ba-dw__card-grid');
  const kpis = widget?.kpis ?? [];

  if (kpis.length === 0) {
    section.append(el('p', 'ib-ba-dw__empty', 'KPI kartı yok.'));
    return section;
  }

  for (const kpi of kpis) {
    const card = el('article', 'ib-ba-dw__card');
    card.append(
      el('h3', 'ib-ba-dw__card-title', kpi.name),
      el(
        'p',
        'ib-ba-dw__card-value',
        kpi.value === null ? '—' : String(kpi.value)
      ),
      el('p', 'ib-ba-dw__card-meta', kpi.unit)
    );
    if (kpi.trendLabel) {
      card.append(el('p', 'ib-ba-dw__card-trend', kpi.trendLabel));
    }
    grid.append(card);
  }

  section.append(grid);
  return section;
}

/**
 * Lists alanı (Recent Analysis / Decisions / Reports / Exports).
 */
export function createDashboardWorkspaceLists(
  widgets: readonly DashboardWorkspaceWidgetProjection[]
): HTMLElement {
  const section = el('section', 'ib-ba-dw__lists');
  section.setAttribute('aria-label', 'Recent lists');
  section.append(el('h2', 'ib-ba-dw__section-title', 'Lists'));

  const listWidgets = widgets.filter((item) => item.kind === 'list');
  if (listWidgets.length === 0) {
    section.append(el('p', 'ib-ba-dw__empty', 'Liste widget\'ı yok.'));
    return section;
  }

  const columns = el('div', 'ib-ba-dw__list-grid');
  for (const widget of listWidgets) {
    const column = el('div', 'ib-ba-dw__list-column');
    column.append(el('h3', 'ib-ba-dw__list-title', widget.name));
    if (widget.items.length === 0) {
      column.append(el('p', 'ib-ba-dw__empty', 'Öğe yok.'));
    } else {
      const ul = el('ul', 'ib-ba-dw__list');
      for (const item of widget.items) {
        const li = el('li', 'ib-ba-dw__list-item');
        li.append(el('span', 'ib-ba-dw__list-item-title', item.title));
        if (item.subtitle) {
          li.append(el('span', 'ib-ba-dw__list-item-sub', item.subtitle));
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
 * Summary alanı.
 */
export function createDashboardWorkspaceSummaryPanel(
  result: DashboardWorkspaceResult
): HTMLElement {
  const section = el('section', 'ib-ba-dw__summary');
  section.setAttribute('aria-label', 'Summary');
  section.append(el('h2', 'ib-ba-dw__section-title', 'Summary'));

  const grid = el('div', 'ib-ba-dw__summary-grid');
  for (const item of result.summaryItems) {
    const row = el('div', 'ib-ba-dw__summary-item');
    row.append(
      el('span', 'ib-ba-dw__label', item.label),
      el('span', 'ib-ba-dw__value', String(item.value))
    );
    grid.append(row);
  }
  section.append(grid);
  return section;
}

/**
 * Tam workspace layout iskeleti:
 * Header → Overview → Cards → Lists → Summary
 */
export function createDashboardWorkspaceLayout(
  result: DashboardWorkspaceResult,
  options: DashboardWorkspaceLayoutOptions = {}
): HTMLElement {
  const root = el('div', 'ib-ba-dw');
  root.setAttribute('data-workspace', 'dashboard');

  const overview = result.widgets.find((item) => item.widgetId === 'overview');
  const kpiCards = result.widgets.find((item) => item.widgetId === 'kpi-cards');

  root.append(
    createDashboardWorkspaceHeader(
      options.title ?? 'Dashboard Workspace',
      options.subtitle ?? 'Business Admin çalışma alanı (iskelet)',
      result.summary.tenantId
    ),
    createDashboardWorkspaceOverview(overview),
    createDashboardWorkspaceCards(kpiCards),
    createDashboardWorkspaceLists(result.widgets),
    createDashboardWorkspaceSummaryPanel(result)
  );

  return root;
}

/**
 * Workspace sonucunu container'a monte eder.
 */
export function mountDashboardWorkspace(
  container: HTMLElement,
  result: DashboardWorkspaceResult,
  options?: DashboardWorkspaceLayoutOptions
): void {
  container.replaceChildren(createDashboardWorkspaceLayout(result, options));
}
