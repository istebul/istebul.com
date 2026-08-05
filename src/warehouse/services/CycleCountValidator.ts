import type {
  CreateCycleCountInput,
} from "../types/CycleCount";
import type {
  CreateCycleCountAdjustmentInput,
} from "../types/CycleCountAdjustment";
import type {
  CreateCycleCountApprovalInput,
} from "../types/CycleCountApproval";
import type {
  ConfirmCycleCountItemInput,
  CreateCycleCountItemInput,
  RecountCycleCountItemInput,
} from "../types/CycleCountItem";
import type {
  CreateCycleCountRuleInput,
} from "../types/CycleCountRule";
import type {
  CreateCycleCountScheduleInput,
} from "../types/CycleCountSchedule";
import type {
  CreateCycleCountTaskInput,
} from "../types/CycleCountTask";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import {
  isCycleCountAdjustmentType,
} from "../types/CycleCountAdjustment";
import {
  isCycleCountAbcClass,
} from "../types/CycleCountRule";
import {
  isCycleCountStrategy,
} from "../types/CycleCountStrategy";

function requireText(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== "string") {
    throw new InventoryValidationError(
      `${fieldName} metin olmalıdır.`,
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new InventoryValidationError(
      `${fieldName} boş bırakılamaz.`,
    );
  }

  return normalized;
}

function normalizeOptionalText(
  value: unknown,
): string | undefined {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new InventoryValidationError(
      "İsteğe bağlı metin alanı geçersiz.",
    );
  }

  const normalized = value.trim();

  return normalized || undefined;
}

function requireNonNegativeNumber(
  value: unknown,
  fieldName: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new InventoryValidationError(
      `${fieldName} sıfır veya daha büyük olmalıdır.`,
    );
  }

  return value;
}

function requirePositiveNumber(
  value: unknown,
  fieldName: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new InventoryValidationError(
      `${fieldName} sıfırdan büyük olmalıdır.`,
    );
  }

  return value;
}

function normalizeOptionalNonNegativeNumber(
  value: unknown,
  fieldName: string,
): number | undefined {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  return requireNonNegativeNumber(
    value,
    fieldName,
  );
}

function optionalTextField<
  Key extends string,
>(
  key: Key,
  value: unknown,
): Partial<Record<Key, string>> {
  const normalized =
    normalizeOptionalText(value);

  if (normalized === undefined) {
    return {};
  }

  return {
    [key]: normalized,
  } as Record<Key, string>;
}

function optionalDateField<
  Key extends string,
>(
  key: Key,
  value: unknown,
  fieldName: string,
): Partial<Record<Key, string>> {
  const normalized =
    normalizeOptionalDate(
      value,
      fieldName,
    );

  if (normalized === undefined) {
    return {};
  }

  return {
    [key]: normalized,
  } as Record<Key, string>;
}

function optionalNonNegativeNumberField<
  Key extends string,
>(
  key: Key,
  value: unknown,
  fieldName: string,
): Partial<Record<Key, number>> {
  const normalized =
    normalizeOptionalNonNegativeNumber(
      value,
      fieldName,
    );

  if (normalized === undefined) {
    return {};
  }

  return {
    [key]: normalized,
  } as Record<Key, number>;
}

function normalizePriority(
  value: unknown,
): number {
  if (value === undefined) {
    return 50;
  }

  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new InventoryValidationError(
      "Öncelik 0 ile 100 arasında tam sayı olmalıdır.",
    );
  }

  return value;
}

function normalizeOptionalDate(
  value: unknown,
  fieldName: string,
): string | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new InventoryValidationError(
      `${fieldName} geçerli bir tarih olmalıdır.`,
    );
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    throw new InventoryValidationError(
      `${fieldName} geçerli bir tarih olmalıdır.`,
    );
  }

  return new Date(timestamp).toISOString();
}

export function validateCreateCycleCount(
  input: CreateCycleCountInput,
): CreateCycleCountInput {
  const strategy = input.strategy;

  if (!isCycleCountStrategy(strategy)) {
    throw new InventoryValidationError(
      "Döngüsel sayım stratejisi geçersiz.",
    );
  }

  const toleranceQuantity =
    normalizeOptionalNonNegativeNumber(
      input.toleranceQuantity,
      "Miktar toleransı",
    );

  const tolerancePercentage =
    normalizeOptionalNonNegativeNumber(
      input.tolerancePercentage,
      "Yüzde toleransı",
    );

  if (
    tolerancePercentage !== undefined &&
    tolerancePercentage > 100
  ) {
    throw new InventoryValidationError(
      "Yüzde toleransı 100 değerini aşamaz.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    strategy,
    priority: normalizePriority(
      input.priority,
    ),
    blindCount:
      input.blindCount ?? false,
    freezeInventory:
      input.freezeInventory ?? false,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...optionalTextField(
      "ruleId",
      input.ruleId,
    ),
    ...optionalTextField(
      "scheduleId",
      input.scheduleId,
    ),
    ...optionalTextField(
      "referenceType",
      input.referenceType,
    ),
    ...optionalTextField(
      "referenceId",
      input.referenceId,
    ),
    ...optionalTextField(
      "referenceNumber",
      input.referenceNumber,
    ),
    ...(toleranceQuantity !== undefined
      ? { toleranceQuantity }
      : {}),
    ...(tolerancePercentage !== undefined
      ? { tolerancePercentage }
      : {}),
    ...optionalDateField(
      "plannedAt",
      input.plannedAt,
      "Planlanan sayım tarihi",
    ),
    ...optionalTextField(
      "notes",
      input.notes,
    ),
  };
}

export function validateCreateCycleCountItem(
  input: CreateCycleCountItemInput,
): CreateCycleCountItemInput {
  const toleranceQuantity =
    normalizeOptionalNonNegativeNumber(
      input.toleranceQuantity,
      "Satır miktar toleransı",
    );

  const tolerancePercentage =
    normalizeOptionalNonNegativeNumber(
      input.tolerancePercentage,
      "Satır yüzde toleransı",
    );

  if (
    tolerancePercentage !== undefined &&
    tolerancePercentage > 100
  ) {
    throw new InventoryValidationError(
      "Satır yüzde toleransı 100 değerini aşamaz.",
    );
  }

  const unitCost =
    normalizeOptionalNonNegativeNumber(
      input.unitCost,
      "Birim maliyet",
    );

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    cycleCountId: requireText(
      input.cycleCountId,
      "Sayım kimliği",
    ),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    locationId: requireText(
      input.locationId,
      "Lokasyon kimliği",
    ),
    productId: requireText(
      input.productId,
      "Ürün kimliği",
    ),
    unit: requireText(
      input.unit,
      "Ölçü birimi",
    ),
    expectedQuantity:
      requireNonNegativeNumber(
        input.expectedQuantity,
        "Beklenen miktar",
      ),
    blindCount:
      input.blindCount ?? false,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...optionalTextField(
      "skuId",
      input.skuId,
    ),
    ...optionalTextField(
      "inventoryBalanceId",
      input.inventoryBalanceId,
    ),
    ...optionalTextField(
      "stockStatus",
      input.stockStatus,
    ),
    ...(input.tracking !== undefined
      ? { tracking: input.tracking }
      : {}),
    ...(unitCost !== undefined
      ? { unitCost }
      : {}),
    ...optionalTextField(
      "currency",
      input.currency,
    ),
    ...(toleranceQuantity !== undefined
      ? { toleranceQuantity }
      : {}),
    ...(tolerancePercentage !== undefined
      ? { tolerancePercentage }
      : {}),
    ...optionalTextField(
      "notes",
      input.notes,
    ),
  };
}

export function validateConfirmCycleCountItem(
  input: ConfirmCycleCountItemInput,
): ConfirmCycleCountItemInput {
  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    cycleCountId: requireText(
      input.cycleCountId,
      "Sayım kimliği",
    ),
    cycleCountItemId: requireText(
      input.cycleCountItemId,
      "Sayım satırı kimliği",
    ),
    countedQuantity:
      requireNonNegativeNumber(
        input.countedQuantity,
        "Sayılan miktar",
      ),
    damagedQuantity:
      normalizeOptionalNonNegativeNumber(
        input.damagedQuantity,
        "Hasarlı miktar",
      ) ?? 0,
    countedBy: requireText(
      input.countedBy,
      "Sayımı yapan kullanıcı",
    ),
    ...optionalTextField(
      "barcode",
      input.barcode,
    ),
    ...optionalTextField(
      "lotNumber",
      input.lotNumber,
    ),
    ...optionalTextField(
      "serialNumber",
      input.serialNumber,
    ),
    ...optionalTextField(
      "notes",
      input.notes,
    ),
  };
}

export function validateRecountCycleCountItem(
  input: RecountCycleCountItemInput,
): RecountCycleCountItemInput {
  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    cycleCountId: requireText(
      input.cycleCountId,
      "Sayım kimliği",
    ),
    cycleCountItemId: requireText(
      input.cycleCountItemId,
      "Sayım satırı kimliği",
    ),
    countedQuantity:
      requireNonNegativeNumber(
        input.countedQuantity,
        "Yeniden sayılan miktar",
      ),
    damagedQuantity:
      normalizeOptionalNonNegativeNumber(
        input.damagedQuantity,
        "Hasarlı miktar",
      ) ?? 0,
    recountedBy: requireText(
      input.recountedBy,
      "Yeniden sayımı yapan kullanıcı",
    ),
    ...optionalTextField(
      "notes",
      input.notes,
    ),
  };
}

export function validateCreateCycleCountRule(
  input: CreateCycleCountRuleInput,
): CreateCycleCountRuleInput {
  if (!isCycleCountStrategy(input.strategy)) {
    throw new InventoryValidationError(
      "Sayım kuralı stratejisi geçersiz.",
    );
  }

  if (
    input.abcClass !== undefined &&
    !isCycleCountAbcClass(
      input.abcClass,
    )
  ) {
    throw new InventoryValidationError(
      "ABC stok sınıfı geçersiz.",
    );
  }

  const minimumStockValue =
    normalizeOptionalNonNegativeNumber(
      input.minimumStockValue,
      "Minimum stok değeri",
    );

  const maximumStockValue =
    normalizeOptionalNonNegativeNumber(
      input.maximumStockValue,
      "Maksimum stok değeri",
    );

  if (
    minimumStockValue !== undefined &&
    maximumStockValue !== undefined &&
    minimumStockValue >
      maximumStockValue
  ) {
    throw new InventoryValidationError(
      "Minimum stok değeri maksimum stok değerinden büyük olamaz.",
    );
  }

  const tolerancePercentage =
    normalizeOptionalNonNegativeNumber(
      input.tolerancePercentage,
      "Yüzde toleransı",
    );

  if (
    tolerancePercentage !== undefined &&
    tolerancePercentage > 100
  ) {
    throw new InventoryValidationError(
      "Yüzde toleransı 100 değerini aşamaz.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    code: requireText(
      input.code,
      "Sayım kuralı kodu",
    ).toLocaleUpperCase("tr-TR"),
    name: requireText(
      input.name,
      "Sayım kuralı adı",
    ),
    strategy: input.strategy,
    frequencyDays:
      requirePositiveNumber(
        input.frequencyDays,
        "Sayım sıklığı",
      ),
    blindCount:
      input.blindCount ?? false,
    recountRequired:
      input.recountRequired ?? true,
    approvalRequired:
      input.approvalRequired ?? true,
    freezeInventory:
      input.freezeInventory ?? false,
    priority: normalizePriority(
      input.priority,
    ),
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(input.abcClass !== undefined
      ? { abcClass: input.abcClass }
      : {}),
    ...optionalTextField(
      "description",
      input.description,
    ),
    ...optionalTextField(
      "warehouseId",
      input.warehouseId,
    ),
    ...optionalTextField(
      "zoneId",
      input.zoneId,
    ),
    ...optionalTextField(
      "locationType",
      input.locationType,
    ),
    ...optionalTextField(
      "productCategoryId",
      input.productCategoryId,
    ),
    ...optionalTextField(
      "productId",
      input.productId,
    ),
    ...optionalTextField(
      "stockStatus",
      input.stockStatus,
    ),
    ...(minimumStockValue !== undefined
      ? { minimumStockValue }
      : {}),
    ...(maximumStockValue !== undefined
      ? { maximumStockValue }
      : {}),
    ...optionalNonNegativeNumberField(
      "minimumMovementCount",
      input.minimumMovementCount,
      "Minimum hareket sayısı",
    ),
    ...optionalNonNegativeNumberField(
      "maximumDaysSinceLastCount",
      input.maximumDaysSinceLastCount,
      "Son sayımdan itibaren maksimum gün",
    ),
    ...optionalNonNegativeNumberField(
      "toleranceQuantity",
      input.toleranceQuantity,
      "Miktar toleransı",
    ),
    ...(tolerancePercentage !== undefined
      ? { tolerancePercentage }
      : {}),
  };
}

export function validateCreateCycleCountSchedule(
  input: CreateCycleCountScheduleInput,
): CreateCycleCountScheduleInput {
  const startDate = normalizeOptionalDate(
    input.startDate,
    "Sayım planı başlangıç tarihi",
  );

  if (startDate === undefined) {
    throw new InventoryValidationError(
      "Sayım planı başlangıç tarihi zorunludur.",
    );
  }

  const endDate = normalizeOptionalDate(
    input.endDate,
    "Sayım planı bitiş tarihi",
  );

  if (
    endDate !== undefined &&
    endDate < startDate
  ) {
    throw new InventoryValidationError(
      "Sayım planı bitiş tarihi başlangıç tarihinden önce olamaz.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    ruleId: requireText(
      input.ruleId,
      "Sayım kuralı kimliği",
    ),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    name: requireText(
      input.name,
      "Sayım planı adı",
    ),
    startDate,
    frequencyDays:
      requirePositiveNumber(
        input.frequencyDays,
        "Sayım sıklığı",
      ),
    assignedUserIds:
      input.assignedUserIds
        ?.map((value) =>
          requireText(
            value,
            "Atanan kullanıcı kimliği",
          ),
        ) ?? [],
    automaticRelease:
      input.automaticRelease ?? false,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(endDate !== undefined
      ? { endDate }
      : {}),
    ...optionalNonNegativeNumberField(
      "maximumItemsPerRun",
      input.maximumItemsPerRun,
      "Çalıştırma başına maksimum satır",
    ),
    ...optionalTextField(
      "assignedTeamId",
      input.assignedTeamId,
    ),
  };
}

export function validateCreateCycleCountTask(
  input: CreateCycleCountTaskInput,
): CreateCycleCountTaskInput {
  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    cycleCountId: requireText(
      input.cycleCountId,
      "Sayım kimliği",
    ),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    type: input.type,
    priority: normalizePriority(
      input.priority,
    ),
    sequence:
      input.sequence === undefined
        ? 1
        : requirePositiveNumber(
            input.sequence,
            "Görev sırası",
          ),
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...optionalTextField(
      "cycleCountItemId",
      input.cycleCountItemId,
    ),
    ...optionalTextField(
      "locationId",
      input.locationId,
    ),
    ...optionalTextField(
      "productId",
      input.productId,
    ),
    ...optionalTextField(
      "assignedUserId",
      input.assignedUserId,
    ),
    ...optionalTextField(
      "assignedTeamId",
      input.assignedTeamId,
    ),
    ...optionalTextField(
      "assignedEquipmentId",
      input.assignedEquipmentId,
    ),
    ...optionalDateField(
      "plannedAt",
      input.plannedAt,
      "Planlanan görev tarihi",
    ),
    ...optionalTextField(
      "notes",
      input.notes,
    ),
  };
}

export function validateCreateCycleCountAdjustment(
  input: CreateCycleCountAdjustmentInput,
): CreateCycleCountAdjustmentInput {
  if (
    !isCycleCountAdjustmentType(
      input.type,
    )
  ) {
    throw new InventoryValidationError(
      "Stok düzeltme türü geçersiz.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    cycleCountId: requireText(
      input.cycleCountId,
      "Sayım kimliği",
    ),
    cycleCountItemId: requireText(
      input.cycleCountItemId,
      "Sayım satırı kimliği",
    ),
    resultId: requireText(
      input.resultId,
      "Sayım sonucu kimliği",
    ),
    type: input.type,
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    locationId: requireText(
      input.locationId,
      "Lokasyon kimliği",
    ),
    productId: requireText(
      input.productId,
      "Ürün kimliği",
    ),
    quantity: requirePositiveNumber(
      input.quantity,
      "Düzeltme miktarı",
    ),
    unit: requireText(
      input.unit,
      "Ölçü birimi",
    ),
    previousQuantity:
      requireNonNegativeNumber(
        input.previousQuantity,
        "Önceki miktar",
      ),
    adjustedQuantity:
      requireNonNegativeNumber(
        input.adjustedQuantity,
        "Düzeltilmiş miktar",
      ),
    requestedBy: requireText(
      input.requestedBy,
      "Düzeltmeyi talep eden kullanıcı",
    ),
    ...optionalTextField(
      "skuId",
      input.skuId,
    ),
    ...optionalTextField(
      "stockStatus",
      input.stockStatus,
    ),
    ...optionalTextField(
      "targetStockStatus",
      input.targetStockStatus,
    ),
    ...optionalTextField(
      "externalSystem",
      input.externalSystem,
    ),
    ...optionalTextField(
      "notes",
      input.notes,
    ),
  };
}

export function validateCreateCycleCountApproval(
  input: CreateCycleCountApprovalInput,
): CreateCycleCountApprovalInput {
  if (
    input.cycleCountItemId ===
      undefined &&
    input.adjustmentId === undefined
  ) {
    throw new InventoryValidationError(
      "Onay kaydı için sayım satırı veya stok düzeltme kimliği gereklidir.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    cycleCountId: requireText(
      input.cycleCountId,
      "Sayım kimliği",
    ),
    level:
      input.level === undefined
        ? 1
        : requirePositiveNumber(
            input.level,
            "Onay seviyesi",
          ),
    requestedBy: requireText(
      input.requestedBy,
      "Onayı talep eden kullanıcı",
    ),
    ...optionalTextField(
      "cycleCountItemId",
      input.cycleCountItemId,
    ),
    ...optionalTextField(
      "adjustmentId",
      input.adjustmentId,
    ),
    ...optionalTextField(
      "approverRole",
      input.approverRole,
    ),
    ...optionalTextField(
      "approverId",
      input.approverId,
    ),
    ...optionalTextField(
      "notes",
      input.notes,
    ),
  };
}
