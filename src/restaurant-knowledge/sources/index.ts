export type { KnowledgeSource, RestaurantKnowledgeBundle, InventoryItemFact, OccupancySnapshot } from '../types/source.ts';

export {
  EXISTING_KNOWLEDGE_TABLES,
  ENTITY_SOURCE_MAP,
  type ExistingKnowledgeTable,
} from './existing-tables.ts';

export {
  InMemoryKnowledgeSource,
  type InMemoryKnowledgeSeed,
} from './in-memory-source.ts';
