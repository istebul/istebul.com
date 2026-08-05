import type { QualityControlType } from "./QualityControlType";

export const QUALITY_RULE_OPERATORS = [
  "equals",
  "not_equals",
  "greater_than",
  "greater_than_or_equal",
  "less_than",
  "less_than_or_equal",
  "between",
  "contains",
  "not_contains",
  "required",
] as const;

export type QualityRuleOperator =
  (typeof QUALITY_RULE_OPERATORS)[number];

export const QUALITY_RULE_OPERATOR_LABELS: Record<
  QualityRuleOperator,
  string
> = {
  equals: "Eşittir",
  not_equals: "Eşit Değildir",
  greater_than: "Büyüktür",
  greater_than_or_equal: "Büyük veya Eşittir",
  less_than: "Küçüktür",
  less_than_or_equal: "Küçük veya Eşittir",
  between: "Arasındadır",
  contains: "İçerir",
  not_contains: "İçermez",
  required: "Zorunludur",
};

export interface QualityRule {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly controlType: QualityControlType;
  readonly operator: QualityRuleOperator;
  readonly expectedValue?: string | number | boolean;
  readonly minimumValue?: number;
  readonly maximumValue?: number;
  readonly unit?: string;
  readonly mandatory: boolean;
  readonly active: boolean;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateQualityRuleInput {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  controlType: QualityControlType;
  operator: QualityRuleOperator;
  expectedValue?: string | number | boolean;
  minimumValue?: number;
  maximumValue?: number;
  unit?: string;
  mandatory?: boolean;
  createdBy: string;
}

export function isQualityRuleOperator(
  value: unknown,
): value is QualityRuleOperator {
  return (
    typeof value === "string" &&
    QUALITY_RULE_OPERATORS.includes(
      value as QualityRuleOperator,
    )
  );
}
