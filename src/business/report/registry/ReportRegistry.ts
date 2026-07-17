/**
 * Rapor profil kayıt sistemi — henüz içerik yok.
 */

import type { ReportProfileDefinition } from './ReportRegistryTypes';

const PROFILES: ReportProfileDefinition[] = [];

export const REPORT_PROFILE_REGISTRY: readonly ReportProfileDefinition[] =
  Object.freeze(PROFILES);

export function listReportProfiles(): readonly ReportProfileDefinition[] {
  return REPORT_PROFILE_REGISTRY;
}

export function getReportProfileById(
  id: string
): ReportProfileDefinition | undefined {
  return REPORT_PROFILE_REGISTRY.find((entry) => entry.id === id);
}

export const REPORT_PROFILE_REGISTRY_COUNT = REPORT_PROFILE_REGISTRY.length;

export default REPORT_PROFILE_REGISTRY;
