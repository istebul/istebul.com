/**
 * İSTEBUL Business Admin — Business Settings Workspace UI iskeleti (PR-202E).
 *
 * Responsive component yapısı. CRUD / Realtime / Auth yok.
 */

import type { BusinessSettingsWorkspaceResult } from '../runtime/BusinessSettingsWorkspaceResult';
import type { BusinessSettingsWorkspaceWidgetProjection } from '../runtime/BusinessSettingsWorkspaceWidget';

export interface BusinessSettingsWorkspaceLayoutOptions {
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

function createFieldsSection(
  className: string,
  ariaLabel: string,
  title: string,
  widget?: BusinessSettingsWorkspaceWidgetProjection
): HTMLElement {
  const section = el('section', className);
  section.setAttribute('aria-label', ariaLabel);
  section.append(el('h2', 'ib-ba-sw__section-title', title));

  if (!widget || widget.fields.length === 0) {
    section.append(el('p', 'ib-ba-sw__empty', 'Ayar bağlanmadı.'));
    return section;
  }

  const grid = el('div', 'ib-ba-sw__field-grid');
  for (const field of widget.fields) {
    const item = el('div', 'ib-ba-sw__field');
    item.append(
      el('span', 'ib-ba-sw__label', field.label),
      el('span', 'ib-ba-sw__value', String(field.value))
    );
    grid.append(item);
  }
  section.append(grid);
  return section;
}

/**
 * Workspace Header alanı.
 */
export function createBusinessSettingsWorkspaceHeader(
  title: string,
  subtitle: string,
  tenantId: string
): HTMLElement {
  const header = el('header', 'ib-ba-sw__header');
  header.append(
    el('h1', 'ib-ba-sw__title', title),
    el('p', 'ib-ba-sw__subtitle', subtitle),
    el('p', 'ib-ba-sw__tenant', `Tenant: ${tenantId}`)
  );
  return header;
}

export function createBusinessSettingsWorkspaceProfile(
  widget?: BusinessSettingsWorkspaceWidgetProjection
): HTMLElement {
  return createFieldsSection(
    'ib-ba-sw__profile',
    'Business Profile',
    'Profile',
    widget
  );
}

export function createBusinessSettingsWorkspaceOrganization(
  widget?: BusinessSettingsWorkspaceWidgetProjection
): HTMLElement {
  return createFieldsSection(
    'ib-ba-sw__organization',
    'Organization',
    'Organization',
    widget
  );
}

export function createBusinessSettingsWorkspaceBranding(
  widget?: BusinessSettingsWorkspaceWidgetProjection
): HTMLElement {
  return createFieldsSection(
    'ib-ba-sw__branding',
    'Branding',
    'Branding',
    widget
  );
}

export function createBusinessSettingsWorkspaceLocalization(
  widget?: BusinessSettingsWorkspaceWidgetProjection
): HTMLElement {
  return createFieldsSection(
    'ib-ba-sw__localization',
    'Localization',
    'Localization',
    widget
  );
}

export function createBusinessSettingsWorkspaceNotifications(
  widget?: BusinessSettingsWorkspaceWidgetProjection
): HTMLElement {
  return createFieldsSection(
    'ib-ba-sw__notifications',
    'Notifications',
    'Notifications',
    widget
  );
}

export function createBusinessSettingsWorkspaceAiPreferences(
  widget?: BusinessSettingsWorkspaceWidgetProjection
): HTMLElement {
  return createFieldsSection(
    'ib-ba-sw__ai',
    'AI Preferences',
    'AI Preferences',
    widget
  );
}

/**
 * Summary alanı.
 */
export function createBusinessSettingsWorkspaceSummaryPanel(
  result: BusinessSettingsWorkspaceResult
): HTMLElement {
  const section = el('section', 'ib-ba-sw__summary');
  section.setAttribute('aria-label', 'Summary');
  section.append(el('h2', 'ib-ba-sw__section-title', 'Summary'));

  const grid = el('div', 'ib-ba-sw__summary-grid');
  for (const item of result.summaryItems) {
    const row = el('div', 'ib-ba-sw__summary-item');
    row.append(
      el('span', 'ib-ba-sw__label', item.label),
      el('span', 'ib-ba-sw__value', String(item.value))
    );
    grid.append(row);
  }
  section.append(grid);
  return section;
}

/**
 * Tam workspace layout iskeleti:
 * Header → Profile → Organization → Branding → Localization → Notifications → AI Preferences → Summary
 */
export function createBusinessSettingsWorkspaceLayout(
  result: BusinessSettingsWorkspaceResult,
  options: BusinessSettingsWorkspaceLayoutOptions = {}
): HTMLElement {
  const root = el('div', 'ib-ba-sw');
  root.setAttribute('data-workspace', 'business-settings');

  const byId = (id: string) =>
    result.widgets.find((item) => item.widgetId === id);

  root.append(
    createBusinessSettingsWorkspaceHeader(
      options.title ?? 'Business Settings Workspace',
      options.subtitle ?? 'Business Admin ayar çalışma alanı (iskelet)',
      result.summary.tenantId
    ),
    createBusinessSettingsWorkspaceProfile(byId('business-profile')),
    createBusinessSettingsWorkspaceOrganization(byId('organization')),
    createBusinessSettingsWorkspaceBranding(byId('branding')),
    createBusinessSettingsWorkspaceLocalization(byId('localization')),
    createBusinessSettingsWorkspaceNotifications(
      byId('notification-preferences')
    ),
    createBusinessSettingsWorkspaceAiPreferences(byId('ai-preferences')),
    createBusinessSettingsWorkspaceSummaryPanel(result)
  );

  return root;
}

/**
 * Workspace sonucunu container'a monte eder.
 */
export function mountBusinessSettingsWorkspace(
  container: HTMLElement,
  result: BusinessSettingsWorkspaceResult,
  options?: BusinessSettingsWorkspaceLayoutOptions
): void {
  container.replaceChildren(
    createBusinessSettingsWorkspaceLayout(result, options)
  );
}
