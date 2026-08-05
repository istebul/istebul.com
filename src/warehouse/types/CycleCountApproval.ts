export const CYCLE_COUNT_APPROVAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
] as const;

export type CycleCountApprovalStatus =
  (typeof CYCLE_COUNT_APPROVAL_STATUSES)[number];

export const CYCLE_COUNT_APPROVAL_STATUS_LABELS: Record<
  CycleCountApprovalStatus,
  string
> = {
  pending: "Onay Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  cancelled: "İptal Edildi",
};

export interface CycleCountApproval {
  readonly id: string;
  readonly tenantId: string;
  readonly cycleCountId: string;
  readonly cycleCountItemId?: string;
  readonly adjustmentId?: string;
  readonly status: CycleCountApprovalStatus;
  readonly level: number;
  readonly requestedBy: string;
  readonly requestedAt: string;
  readonly approverRole?: string;
  readonly approverId?: string;
  readonly approvedBy?: string;
  readonly approvedAt?: string;
  readonly rejectedBy?: string;
  readonly rejectedAt?: string;
  readonly rejectionReason?: string;
  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateCycleCountApprovalInput {
  tenantId: string;
  cycleCountId: string;
  cycleCountItemId?: string;
  adjustmentId?: string;
  level?: number;
  approverRole?: string;
  approverId?: string;
  requestedBy: string;
  notes?: string;
}

export interface ApproveCycleCountInput {
  tenantId: string;
  cycleCountId: string;
  approvalId: string;
  approvedBy: string;
  notes?: string;
}

export interface RejectCycleCountInput {
  tenantId: string;
  cycleCountId: string;
  approvalId: string;
  rejectedBy: string;
  rejectionReason: string;
}

export function isCycleCountApprovalStatus(
  value: unknown,
): value is CycleCountApprovalStatus {
  return (
    typeof value === "string" &&
    CYCLE_COUNT_APPROVAL_STATUSES.includes(
      value as CycleCountApprovalStatus,
    )
  );
}
