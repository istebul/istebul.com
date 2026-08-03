/**
 * EPIC-800A — İSTEBUL Business Executive Copilot.
 *
 * Mevcut Analysis, Comparison, Alert ve Forecast motorlarının
 * yöneticiye sunulacak kanonik karar çıktısıdır.
 */

export type ExecutiveCopilotHealthStatus =
  | 'healthy'
  | 'attention'
  | 'critical';

export type ExecutiveCopilotTrend =
  | 'improving'
  | 'declining'
  | 'stable'
  | 'unknown';

export type ExecutiveCopilotPriority =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

export type ExecutiveCopilotActionSource =
  | 'alert'
  | 'analysis'
  | 'comparison'
  | 'forecast';

export type ExecutiveCopilotConfidenceLevel =
  | 'high'
  | 'medium'
  | 'low';

export interface ExecutiveCopilotHealth {
  score: number;
  status: ExecutiveCopilotHealthStatus;
  statusLabel: string;
  trend: ExecutiveCopilotTrend;
  trendLabel: string;
}

export interface ExecutiveCopilotSignal {
  id: string;
  title: string;
  description: string;
  severity: ExecutiveCopilotPriority;
  source:
    | 'alert'
    | 'comparison'
    | 'analysis'
    | 'forecast';
}

export interface ExecutiveCopilotAction {
  id: string;
  title: string;
  description: string;
  priority: ExecutiveCopilotPriority;
  source: ExecutiveCopilotActionSource;
  dueLabel: string;
}

export interface ExecutiveCopilotConfidence {
  score: number;
  level: ExecutiveCopilotConfidenceLevel;
  label: string;
  reasons: readonly string[];
}

export interface ExecutiveCopilotResult {
  generatedAt: string;
  businessId: string;
  analysisId: string;
  health: ExecutiveCopilotHealth;
  dailySummary: string;
  topRisk?: ExecutiveCopilotSignal;
  topOpportunity?: ExecutiveCopilotSignal;
  actions: readonly ExecutiveCopilotAction[];
  confidence: ExecutiveCopilotConfidence;
  disclosure: string;
}
