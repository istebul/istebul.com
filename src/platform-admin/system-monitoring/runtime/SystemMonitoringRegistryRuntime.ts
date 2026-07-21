/**
 * İSTEBUL Platform Admin — SystemMonitoringRegistryRuntime (PR-201E).
 */

import type { SystemMonitoringDefinition } from './SystemMonitoring';
import { BUILTIN_SYSTEM_MONITORING_DEFINITIONS } from './builtinSystemMonitoring';

/**
 * Runtime System Monitoring kayıt sistemi.
 */
export class SystemMonitoringRegistryRuntime {
  private readonly byId = new Map<string, SystemMonitoringDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const definition of BUILTIN_SYSTEM_MONITORING_DEFINITIONS) {
        this.byId.set(definition.identity.id, definition);
      }
    }
  }

  register(definition: SystemMonitoringDefinition): void {
    const id = definition?.identity?.id;
    if (!id || typeof id !== 'string') {
      throw new Error('SystemMonitoringDefinition.identity.id zorunludur.');
    }
    if (this.byId.has(id)) {
      throw new Error(`System monitoring kaydı zaten kayıtlı: ${id}`);
    }
    if (!definition.identity.name || typeof definition.identity.name !== 'string') {
      throw new Error(
        `SystemMonitoringDefinition.identity.name zorunludur: ${id}`
      );
    }
    this.byId.set(id, definition);
  }

  unregister(serviceId: string): boolean {
    return this.byId.delete(serviceId);
  }

  getById(serviceId: string): SystemMonitoringDefinition | undefined {
    return this.byId.get(serviceId);
  }

  getAll(): readonly SystemMonitoringDefinition[] {
    return Object.freeze(
      [...this.byId.values()].sort((a, b) =>
        a.identity.id.localeCompare(b.identity.id)
      )
    );
  }

  getByHealthStatus(
    healthStatus: SystemMonitoringDefinition['healthStatus']
  ): readonly SystemMonitoringDefinition[] {
    return Object.freeze(
      this.getAll().filter((item) => item.healthStatus === healthStatus)
    );
  }

  getByServiceStatus(
    serviceStatus: SystemMonitoringDefinition['serviceStatus']
  ): readonly SystemMonitoringDefinition[] {
    return Object.freeze(
      this.getAll().filter((item) => item.serviceStatus === serviceStatus)
    );
  }

  clear(): void {
    this.byId.clear();
  }

  count(): number {
    return this.byId.size;
  }
}

export function createSystemMonitoringRegistryRuntime(
  seedBuiltins = true
): SystemMonitoringRegistryRuntime {
  return new SystemMonitoringRegistryRuntime(seedBuiltins);
}

export default SystemMonitoringRegistryRuntime;
