/**
 * Optional port for P8-B Restaurant Knowledge Graph.
 * Implemented by `src/restaurant-knowledge` — AI Core does not import that package.
 */
export interface RestaurantKnowledgeResolverPort {
  resolveForOrchestrate(input: {
    restaurantId: string;
    userMessage: string;
    moduleId?: string;
    tags?: string[];
  }): Promise<{ promptBlock: string; summary?: string } | null>;
}
