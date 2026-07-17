/**
 * Öneri şablon kayıt girişi tipi.
 */

import type { DecisionPriorityLevel } from '../models/DecisionPriority';

export interface RecommendationTemplateDefinition {
  code: string;
  title: string;
  description: string;
  defaultPriorityLevel: DecisionPriorityLevel;
  version: string;
}
