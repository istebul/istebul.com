/**
 * İSTEBUL Business Admin — business özeti (PR-202A).
 *
 * Pipeline aşaması 3: Summary.
 * Yalnızca projeksiyon özeti — CRUD/API/DB yok.
 */

import type { BusinessAdminContext } from './BusinessAdminContext';
import type { BusinessAdminModule } from './BusinessAdminModule';
import type {
  BusinessAdminSummaryItem,
  BusinessAdminValidationIssue
} from './BusinessAdminResult';

/**
 * Business Admin özet öğelerini üretir.
 */
export function buildBusinessAdminSummaryItems(
  context: BusinessAdminContext,
  modules: readonly BusinessAdminModule[],
  validationIssues: readonly BusinessAdminValidationIssue[],
  registeredModuleCount: number
): readonly BusinessAdminSummaryItem[] {
  const items: BusinessAdminSummaryItem[] = [
    {
      key: 'tenant-id',
      label: 'Tenant ID',
      value: context.tenantId
    },
    {
      key: 'locale',
      label: 'Locale',
      value: context.locale
    },
    {
      key: 'registered-module-count',
      label: 'Registered Module Count',
      value: registeredModuleCount
    },
    {
      key: 'projected-module-count',
      label: 'Projected Module Count',
      value: modules.length
    },
    {
      key: 'validation-issue-count',
      label: 'Validation Issue Count',
      value: validationIssues.length
    },
    {
      key: 'has-errors',
      label: 'Has Errors',
      value: validationIssues.some((item) => item.severity === 'error')
    }
  ];

  const categoryCounts: Record<string, number> = {};
  for (const module of modules) {
    categoryCounts[module.category] =
      (categoryCounts[module.category] ?? 0) + 1;
  }

  for (const [category, count] of Object.entries(categoryCounts)) {
    items.push({
      key: `category-${category}`,
      label: `Category: ${category}`,
      value: count
    });
  }

  if (context.actorId) {
    items.push({
      key: 'actor-id',
      label: 'Actor ID',
      value: context.actorId
    });
  }

  return Object.freeze(items);
}
