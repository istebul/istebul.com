/**
 * Karar profili kayıt girişi tipi.
 */

export interface DecisionDefinitionEntry {
  id: string;
  name: string;
  description: string;
  reportId?: string;
  version: string;
}
