export const QUALITY_DECISIONS = [
  "pending",
  "accepted",
  "conditionally_accepted",
  "rejected",
  "hold",
  "rework",
  "scrap",
  "return_to_supplier",
] as const;

export type QualityDecision =
  (typeof QUALITY_DECISIONS)[number];

export const QUALITY_DECISION_LABELS: Record<
  QualityDecision,
  string
> = {
  pending: "Karar Bekliyor",
  accepted: "Kabul Edildi",
  conditionally_accepted: "Şartlı Kabul Edildi",
  rejected: "Reddedildi",
  hold: "Beklemeye Alındı",
  rework: "Yeniden İşlem Gerekli",
  scrap: "Hurda",
  return_to_supplier: "Tedarikçiye İade",
};

export function isQualityDecision(
  value: unknown,
): value is QualityDecision {
  return (
    typeof value === "string" &&
    QUALITY_DECISIONS.includes(value as QualityDecision)
  );
}
