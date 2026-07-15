import type { Table } from '../entities/table.ts';
import type { MenuItem } from '../entities/menu-item.ts';
import type { DiningRoom } from '../entities/dining-room.ts';
import type { Campaign } from '../entities/campaign.ts';
import type { RestaurantSnapshot } from './snapshot.ts';

/**
 * Module ids that may request knowledge (mirrors AI Core but stays decoupled).
 */
export type KnowledgeConsumerModuleId =
  | 'reservation'
  | 'menu'
  | 'crm'
  | 'kitchen'
  | 'waiter'
  | 'payments'
  | 'customer'
  | 'inventory'
  | 'concierge'
  | 'whatsapp'
  | string;

/**
 * Natural-language-ish constraints extracted from an AI user message.
 * Heuristic only — no LLM inside this package.
 */
export interface ResolveConstraints {
  partySize?: number;
  quietPreferred?: boolean;
  outdoorPreferred?: boolean;
  indoorPreferred?: boolean;
  windowPreferred?: boolean;
  accessiblePreferred?: boolean;
  vipPreferred?: boolean;
  salon?: string;
  date?: string;
  time?: string;
  dietaryTags?: string[];
  maxPrice?: number;
  menuQuery?: string;
  rawQuery: string;
}

export interface TableCandidate {
  table: Table;
  diningRoom?: DiningRoom;
  score: number;
  reasons: string[];
}

export interface MenuCandidate {
  item: MenuItem;
  score: number;
  reasons: string[];
}

export interface CampaignCandidate {
  campaign: Campaign;
  score: number;
  reasons: string[];
}

export interface KnowledgeResolveInput {
  restaurantId: string;
  query: string;
  moduleId?: KnowledgeConsumerModuleId;
  date?: string;
  partySize?: number;
  tags?: string[];
  /** Prebuilt snapshot; if omitted, resolver builds via KnowledgeService. */
  snapshot?: RestaurantSnapshot;
  limit?: number;
}

export interface KnowledgeResolveResult {
  restaurantId: string;
  query: string;
  constraints: ResolveConstraints;
  snapshot: RestaurantSnapshot;
  candidates: {
    tables: TableCandidate[];
    menuItems: MenuCandidate[];
    campaigns: CampaignCandidate[];
  };
  /** Compact block ready for PromptBuilder / system prompt injection. */
  promptBlock: string;
  /** Structured summary for audit / downstream AI (still no LLM call here). */
  summary: string;
}
