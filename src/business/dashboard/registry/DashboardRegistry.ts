/**
 * Dashboard profil kayıt sistemi — henüz içerik yok.
 */

import type { DashboardProfileDefinition } from './DashboardRegistryTypes';

const PROFILES: DashboardProfileDefinition[] = [];

export const DASHBOARD_PROFILE_REGISTRY: readonly DashboardProfileDefinition[] =
  Object.freeze(PROFILES);

export function listDashboardProfiles(): readonly DashboardProfileDefinition[] {
  return DASHBOARD_PROFILE_REGISTRY;
}

export function getDashboardProfileById(
  id: string
): DashboardProfileDefinition | undefined {
  return DASHBOARD_PROFILE_REGISTRY.find((entry) => entry.id === id);
}

export const DASHBOARD_PROFILE_REGISTRY_COUNT =
  DASHBOARD_PROFILE_REGISTRY.length;

export default DASHBOARD_PROFILE_REGISTRY;
