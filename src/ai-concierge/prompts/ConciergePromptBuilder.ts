import type { KnowledgeResolveResult } from '../../restaurant-knowledge/types/resolve.ts';
import type { ConciergeIntent, ConciergeMemoryState } from '../types.ts';
import { ConciergeMemory } from '../memory/ConciergeMemory.ts';

export interface ConciergePromptParts {
  system: string;
  user: string;
  combined: string;
}

/**
 * Combines Restaurant Snapshot knowledge + Conversation Memory + User Intent
 * into a single prompt package for AI Core / Provider.
 */
export class ConciergePromptBuilder {
  build(input: {
    restaurantName: string;
    intent: ConciergeIntent;
    memory: ConciergeMemory | ConciergeMemoryState;
    knowledge: KnowledgeResolveResult;
    userMessage: string;
  }): ConciergePromptParts {
    const memoryBlock =
      input.memory instanceof ConciergeMemory
        ? input.memory.toPromptBlock()
        : new ConciergeMemory(
            input.memory.restaurantSlug,
            input.memory.restaurantId,
            input.memory,
          ).toPromptBlock();

    const snapshotBits = [
      '## Restaurant Knowledge Snapshot',
      `- name: ${input.knowledge.snapshot.restaurant.name}`,
      `- city: ${input.knowledge.snapshot.restaurant.city || '-'}`,
      `- cuisine: ${(input.knowledge.snapshot.restaurant.cuisine || []).join(', ') || '-'}`,
      input.knowledge.snapshot.occupancy
        ? `- occupancyLoad: ${input.knowledge.snapshot.occupancy.estimatedLoadPercent ?? '?'}%`
        : null,
      `- openTables: ${input.knowledge.snapshot.tables.filter((t) => t.status === 'available').length}`,
      `- activeCampaigns: ${input.knowledge.snapshot.campaigns.filter((c) => c.active !== false).length}`,
      `- menuItems: ${input.knowledge.snapshot.menu.items.length}`,
    ]
      .filter(Boolean)
      .join('\n');

    const intentBlock = [
      '## User Intent',
      `- id: ${input.intent.id}`,
      `- confidence: ${input.intent.confidence}`,
      `- slots: ${JSON.stringify(input.intent.slots)}`,
    ].join('\n');

    const system = [
      `Sen GarsonAI AI Concierge'sin. Restoran: ${input.restaurantName}.`,
      'Nazik, kısa ve aksiyon odaklı Türkçe yanıt ver.',
      'Rezervasyon, masa, menü, ön sipariş ve kampanya konularında yardımcı ol.',
      'Bilmediğin bilgi uydurma; Knowledge Snapshot ve Memory\'ye dayan.',
      '',
      snapshotBits,
      '',
      memoryBlock,
      '',
      intentBlock,
      '',
      input.knowledge.promptBlock || '',
    ]
      .filter(Boolean)
      .join('\n');

    const user = input.userMessage;
    return {
      system,
      user,
      combined: `${system}\n\n## User Message\n${user}`,
    };
  }
}

export const defaultConciergePromptBuilder = new ConciergePromptBuilder();
