/**
 * İSTEBUL Business Report Engine — Policy Information (PR-104B).
 *
 * DecisionResult üzerinde ayrı PolicyEvaluation yoktur; risk/fırsat/öncelik
 * sayılarından yapısal özet türetilir.
 */

/**
 * Politika / risk-fırsat yapısal bilgisi.
 */
export interface ReportPolicyInformation {
  /** Risk kayıt sayısı */
  riskCount: number;
  /** Fırsat kayıt sayısı */
  opportunityCount: number;
  /** Öncelik kayıt sayısı */
  priorityCount: number;
  /** Herhangi bir politika-ilişkili kayıt var mı */
  present: boolean;
}
