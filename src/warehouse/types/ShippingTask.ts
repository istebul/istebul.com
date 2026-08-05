export const SHIPPING_TASK_TYPES = [
  "prepare_packages",
  "verify_packages",
  "assign_dock",
  "assign_vehicle",
  "load_package",
  "verify_weight",
  "verify_manifest",
  "generate_asn",
  "dispatch_vehicle",
  "confirm_delivery",
] as const;

export type ShippingTaskType =
  (typeof SHIPPING_TASK_TYPES)[number];

export const SHIPPING_TASK_TYPE_LABELS: Record<
  ShippingTaskType,
  string
> = {
  prepare_packages: "Paketleri Hazırla",
  verify_packages: "Paketleri Doğrula",
  assign_dock: "Rampa Ata",
  assign_vehicle: "Araç Ata",
  load_package: "Paketi Yükle",
  verify_weight: "Ağırlığı Doğrula",
  verify_manifest: "Manifesti Doğrula",
  generate_asn: "ASN Oluştur",
  dispatch_vehicle: "Araç Çıkışını Onayla",
  confirm_delivery: "Teslimatı Onayla",
};

export const SHIPPING_TASK_STATUSES = [
  "pending",
  "assigned",
  "in_progress",
  "partially_completed",
  "completed",
  "cancelled",
] as const;

export type ShippingTaskStatus =
  (typeof SHIPPING_TASK_STATUSES)[number];

export const SHIPPING_TASK_STATUS_LABELS: Record<
  ShippingTaskStatus,
  string
> = {
  pending: "Bekliyor",
  assigned: "Atandı",
  in_progress: "Devam Ediyor",
  partially_completed: "Kısmen Tamamlandı",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

export interface ShippingTask {
  readonly id: string;
  readonly tenantId: string;
  readonly shippingId: string;
  readonly shippingItemId?: string;
  readonly shippingPackageId?: string;

  readonly warehouseId: string;
  readonly shippingLocationId: string;
  readonly dockId?: string;
  readonly vehicleId?: string;

  readonly type: ShippingTaskType;
  readonly status: ShippingTaskStatus;

  readonly assignedUserId?: string;
  readonly assignedEquipmentId?: string;

  readonly priority: number;
  readonly sequence: number;

  readonly plannedAt?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;

  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateShippingTaskInput {
  tenantId: string;
  shippingId: string;
  shippingItemId?: string;
  shippingPackageId?: string;

  warehouseId: string;
  shippingLocationId: string;
  dockId?: string;
  vehicleId?: string;

  type: ShippingTaskType;

  assignedUserId?: string;
  assignedEquipmentId?: string;

  priority?: number;
  sequence?: number;
  plannedAt?: string;
  notes?: string;
  createdBy: string;
}

export function isShippingTaskType(
  value: unknown,
): value is ShippingTaskType {
  return (
    typeof value === "string" &&
    SHIPPING_TASK_TYPES.includes(
      value as ShippingTaskType,
    )
  );
}

export function isShippingTaskStatus(
  value: unknown,
): value is ShippingTaskStatus {
  return (
    typeof value === "string" &&
    SHIPPING_TASK_STATUSES.includes(
      value as ShippingTaskStatus,
    )
  );
}
