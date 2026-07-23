/**
 * İSTEBUL Business Import Engine — SchemaRegistryRuntime (PR-101D).
 *
 * Üç alt kayıt: Schema / Column / Entity detector registry.
 */

import {
  ColumnDetectorRegistry,
  createColumnDetectorRegistry
} from './registries/ColumnDetectorRegistry';
import {
  EntityDetectorRegistry,
  createEntityDetectorRegistry
} from './registries/EntityDetectorRegistry';
import {
  SchemaDetectorRegistry,
  createSchemaDetectorRegistry
} from './registries/SchemaDetectorRegistry';

export class SchemaRegistryRuntime {
  readonly schemaDetectors: SchemaDetectorRegistry;
  readonly columnDetectors: ColumnDetectorRegistry;
  readonly entityDetectors: EntityDetectorRegistry;

  constructor(
    seedBuiltins = true,
    registries?: {
      schemaDetectors?: SchemaDetectorRegistry;
      columnDetectors?: ColumnDetectorRegistry;
      entityDetectors?: EntityDetectorRegistry;
    }
  ) {
    this.schemaDetectors =
      registries?.schemaDetectors ?? createSchemaDetectorRegistry(seedBuiltins);
    this.columnDetectors =
      registries?.columnDetectors ?? createColumnDetectorRegistry(seedBuiltins);
    this.entityDetectors =
      registries?.entityDetectors ?? createEntityDetectorRegistry(seedBuiltins);
  }

  clear(): void {
    this.schemaDetectors.clear();
    this.columnDetectors.clear();
    this.entityDetectors.clear();
  }

  totalCount(): number {
    return (
      this.schemaDetectors.count() +
      this.columnDetectors.count() +
      this.entityDetectors.count()
    );
  }
}

export function createSchemaRegistryRuntime(
  seedBuiltins = true
): SchemaRegistryRuntime {
  return new SchemaRegistryRuntime(seedBuiltins);
}

export {
  SchemaDetectorRegistry,
  createSchemaDetectorRegistry,
  ColumnDetectorRegistry,
  createColumnDetectorRegistry,
  EntityDetectorRegistry,
  createEntityDetectorRegistry
};
