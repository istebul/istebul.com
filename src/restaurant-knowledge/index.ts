/**
 * GarsonAI — P8-B Restaurant Knowledge Graph
 *
 * Shared restaurant knowledge layer for Concierge, CRM AI, Kitchen AI, WhatsApp AI.
 * Standardizes facts only — **no LLM calls**.
 *
 * Additive: does not modify P6 production panel or P7 ERP/CX apps.
 * Supabase: reads existing tables via adapters (no new migrations in P8-B).
 */

export * from './entities/index.ts';
export * from './types/index.ts';
export * from './sources/index.ts';
export * from './queries/index.ts';
export * from './services/index.ts';

import { InMemoryKnowledgeSource } from './sources/in-memory-source.ts';
import { KnowledgeService } from './services/KnowledgeService.ts';
import { KnowledgeResolver } from './services/KnowledgeResolver.ts';

export interface CreateRestaurantKnowledgeOptions {
  /** Seed the demo restaurant into an in-memory source (default true when no source given). */
  seedDemo?: boolean;
  restaurantId?: string;
  service?: KnowledgeService;
}

/**
 * One-line bootstrap for AI wiring:
 *   const { resolver } = createRestaurantKnowledge();
 *   createAICore({}, { knowledgeResolver: resolver });
 */
export function createRestaurantKnowledge(
  options: CreateRestaurantKnowledgeOptions = {},
): { service: KnowledgeService; resolver: KnowledgeResolver; source: InMemoryKnowledgeSource } {
  const source = new InMemoryKnowledgeSource();
  if (options.seedDemo !== false) {
    source.seedDemo(options.restaurantId || 'demo-lokanta');
  }
  const service = options.service || new KnowledgeService({ source });
  const resolver = new KnowledgeResolver(service);
  return { service, resolver, source };
}
