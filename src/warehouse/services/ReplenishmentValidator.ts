import type {
  CreateReplenishmentInput,
} from "../types/Replenishment";
import type {
  CreateReplenishmentAllocationInput,
} from "../types/ReplenishmentAllocation";
import type {
  CreateReplenishmentDemandInput,
} from "../types/ReplenishmentDemand";
import type {
  CreateReplenishmentItemInput,
} from "../types/ReplenishmentItem";
import type {
  CreateReplenishmentRuleInput,
} from "../types/ReplenishmentRule";
import {
  isReplenishmentSourceType,
} from "../types/ReplenishmentSource";
import {
  isReplenishmentStrategy,
} from "../types/ReplenishmentStrategy";
import type {
  CreateReplenishmentTaskInput,
} from "../types/ReplenishmentTask";
import {
  REPLENISHMENT_TASK_TYPES,
} from "../types/ReplenishmentTask";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";

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
  fieldName: string,
): string | undefined {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new InventoryValidationError(
      `${fieldName} metin olmalıdır.`,
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
  const normalized =
    requireNonNegativeNumber(
      value,
      fieldName,
    );

  if (normalized <= 0) {
    throw new InventoryValidationError(
      `${fieldName} sıfırdan büyük olmalıdır.`,
    );
  }

  return normalized;
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

function normalizeOptionalPositiveNumber(
  value: unknown,
  fieldName: string,
): number | undefined {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  return requirePositiveNumber(
    value,
    fieldName,
  );
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

  const text =
    requireText(
      value,
      fieldName,
    );

  const timestamp =
    Date.parse(text);

  if (Number.isNaN(timestamp)) {
    throw new InventoryValidationError(
      `${fieldName} geçerli bir tarih olmalıdır.`,
    );
  }

  return new Date(
    timestamp,
  ).toISOString();
}

function optionalTextField<
  Key extends string,
>(
  key: Key,
  value: unknown,
  fieldName: string,
): Partial<Record<Key, string>> {
  const normalized =
    normalizeOptionalText(
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

function optionalNumberField<
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

function optionalPositiveNumberField<
  Key extends string,
>(
  key: Key,
  value: unknown,
  fieldName: string,
): Partial<Record<Key, number>> {
  const normalized =
    normalizeOptionalPositiveNumber(
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

function normalizeSource(
  source:
    CreateReplenishmentInput["source"],
): CreateReplenishmentInput["source"] {
  if (
    !source ||
    typeof source !== "object"
  ) {
    throw new InventoryValidationError(
      "İkmal kaynağı zorunludur.",
    );
  }

  if (
    !isReplenishmentSourceType(
      source.type,
    )
  ) {
    throw new InventoryValidationError(
      "İkmal kaynak türü geçersiz.",
    );
  }

  return {
    type: source.type,
    ...optionalTextField(
      "referenceId",
      source.referenceId,
      "Referans kimliği",
    ),
    ...optionalTextField(
      "referenceNumber",
      source.referenceNumber,
      "Referans numarası",
    ),
    ...optionalTextField(
      "waveId",
      source.waveId,
      "Dalga kimliği",
    ),
    ...optionalTextField(
      "orderId",
      source.orderId,
      "Sipariş kimliği",
    ),
    ...optionalTextField(
      "pickingId",
      source.pickingId,
      "Toplama kimliği",
    ),
    ...optionalTextField(
      "cycleCountId",
      source.cycleCountId,
      "Sayım kimliği",
    ),
    ...optionalTextField(
      "externalSystem",
      source.externalSystem,
      "Harici sistem",
    ),
  };
}

export function validateCreateReplenishment(
  input: CreateReplenishmentInput,
): CreateReplenishmentInput {
  if (
    !isReplenishmentStrategy(
      input.strategy,
    )
  ) {
    throw new InventoryValidationError(
      "İkmal stratejisi geçersiz.",
    );
  }

  const priority =
    input.priority === undefined
      ? 50
      : requireNonNegativeNumber(
          input.priority,
          "İkmal önceliği",
        );

  if (priority > 100) {
    throw new InventoryValidationError(
      "İkmal önceliği 100 değerini aşamaz.",
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
    strategy: input.strategy,
    source: normalizeSource(
      input.source,
    ),
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    priority,
    ...optionalTextField(
      "ruleId",
      input.ruleId,
      "İkmal kuralı kimliği",
    ),
    ...optionalDateField(
      "plannedAt",
      input.plannedAt,
      "Planlanan ikmal tarihi",
    ),
    ...optionalTextField(
      "notes",
      input.notes,
      "İkmal notu",
    ),
  };
}

export function validateCreateReplenishmentItem(
  input: CreateReplenishmentItemInput,
): CreateReplenishmentItemInput {
  const requestedQuantity =
    requirePositiveNumber(
      input.requestedQuantity,
      "Talep edilen miktar",
    );

  const currentDestinationQuantity =
    requireNonNegativeNumber(
      input.currentDestinationQuantity,
      "Hedef lokasyon mevcut miktarı",
    );

  const minimumQuantity =
    normalizeOptionalNonNegativeNumber(
      input.minimumQuantity,
      "Minimum stok miktarı",
    );

  const maximumQuantity =
    normalizeOptionalNonNegativeNumber(
      input.maximumQuantity,
      "Maksimum stok miktarı",
    );

  if (
    minimumQuantity !== undefined &&
    maximumQuantity !== undefined &&
    minimumQuantity > maximumQuantity
  ) {
    throw new InventoryValidationError(
      "Minimum stok miktarı maksimum stok miktarından büyük olamaz.",
    );
  }

  if (
    maximumQuantity !== undefined &&
    currentDestinationQuantity +
      requestedQuantity >
      maximumQuantity
  ) {
    throw new InventoryValidationError(
      "Talep edilen ikmal miktarı hedef lokasyon maksimum stok sınırını aşmaktadır.",
    );
  }

  const priority =
    input.priority === undefined
      ? 50
      : requireNonNegativeNumber(
          input.priority,
          "Satır önceliği",
        );

  if (priority > 100) {
    throw new InventoryValidationError(
      "Satır önceliği 100 değerini aşamaz.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    replenishmentId: requireText(
      input.replenishmentId,
      "İkmal kimliği",
    ),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    destinationLocationId:
      requireText(
        input.destinationLocationId,
        "Hedef lokasyon kimliği",
      ),
    productId: requireText(
      input.productId,
      "Ürün kimliği",
    ),
    stockStatus: requireText(
      input.stockStatus,
      "Stok durumu",
    ),
    unit: requireText(
      input.unit,
      "Ölçü birimi",
    ),
    requestedQuantity,
    currentDestinationQuantity,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    priority,
    ...optionalTextField(
      "skuId",
      input.skuId,
      "SKU kimliği",
    ),
    ...(minimumQuantity !== undefined
      ? { minimumQuantity }
      : {}),
    ...(maximumQuantity !== undefined
      ? { maximumQuantity }
      : {}),
    ...(input.tracking !== undefined
      ? {
          tracking:
            structuredClone(
              input.tracking,
            ),
        }
      : {}),
    ...optionalDateField(
      "requiredAt",
      input.requiredAt,
      "Gerekli ikmal tarihi",
    ),
    ...optionalTextField(
      "notes",
      input.notes,
      "Satır notu",
    ),
  };
}

export function validateCreateReplenishmentDemand(
  input: CreateReplenishmentDemandInput,
): CreateReplenishmentDemandInput {
  const currentQuantity =
    requireNonNegativeNumber(
      input.currentQuantity,
      "Mevcut stok miktarı",
    );

  const orderDemandQuantity =
    input.orderDemandQuantity ??
    0;

  const forecastDemandQuantity =
    input.forecastDemandQuantity ??
    0;

  const safetyStockQuantity =
    input.safetyStockQuantity ??
    0;

  requireNonNegativeNumber(
    orderDemandQuantity,
    "Sipariş talep miktarı",
  );

  requireNonNegativeNumber(
    forecastDemandQuantity,
    "Tahmini talep miktarı",
  );

  requireNonNegativeNumber(
    safetyStockQuantity,
    "Emniyet stok miktarı",
  );

  const minimumQuantity =
    normalizeOptionalNonNegativeNumber(
      input.minimumQuantity,
      "Minimum stok miktarı",
    );

  const maximumQuantity =
    normalizeOptionalNonNegativeNumber(
      input.maximumQuantity,
      "Maksimum stok miktarı",
    );

  if (
    minimumQuantity !== undefined &&
    maximumQuantity !== undefined &&
    minimumQuantity > maximumQuantity
  ) {
    throw new InventoryValidationError(
      "Minimum stok miktarı maksimum stok miktarından büyük olamaz.",
    );
  }

  const priority =
    input.priority === undefined
      ? 50
      : requireNonNegativeNumber(
          input.priority,
          "Talep önceliği",
        );

  if (priority > 100) {
    throw new InventoryValidationError(
      "Talep önceliği 100 değerini aşamaz.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    replenishmentId: requireText(
      input.replenishmentId,
      "İkmal kimliği",
    ),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    destinationLocationId:
      requireText(
        input.destinationLocationId,
        "Hedef lokasyon kimliği",
      ),
    productId: requireText(
      input.productId,
      "Ürün kimliği",
    ),
    stockStatus: requireText(
      input.stockStatus,
      "Stok durumu",
    ),
    unit: requireText(
      input.unit,
      "Ölçü birimi",
    ),
    currentQuantity,
    orderDemandQuantity,
    forecastDemandQuantity,
    safetyStockQuantity,
    priority,
    source: normalizeSource(
      input.source,
    ),
    ...optionalTextField(
      "skuId",
      input.skuId,
      "SKU kimliği",
    ),
    ...(minimumQuantity !== undefined
      ? { minimumQuantity }
      : {}),
    ...(maximumQuantity !== undefined
      ? { maximumQuantity }
      : {}),
    ...(input.tracking !== undefined
      ? {
          tracking:
            structuredClone(
              input.tracking,
            ),
        }
      : {}),
    ...optionalDateField(
      "requiredAt",
      input.requiredAt,
      "Gerekli ikmal tarihi",
    ),
  };
}

export function validateCreateReplenishmentAllocation(
  input: CreateReplenishmentAllocationInput,
): CreateReplenishmentAllocationInput {
  const allocatedQuantity =
    requirePositiveNumber(
      input.allocatedQuantity,
      "Tahsis edilen miktar",
    );

  const sequence =
    requirePositiveNumber(
      input.sequence,
      "Tahsis sırası",
    );

  if (!Number.isInteger(sequence)) {
    throw new InventoryValidationError(
      "Tahsis sırası tam sayı olmalıdır.",
    );
  }

  const score =
    requireNonNegativeNumber(
      input.score,
      "Tahsis puanı",
    );

  if (score > 100) {
    throw new InventoryValidationError(
      "Tahsis puanı 100 değerini aşamaz.",
    );
  }

  const sourceLocationId =
    requireText(
      input.sourceLocationId,
      "Kaynak lokasyon kimliği",
    );

  const destinationLocationId =
    requireText(
      input.destinationLocationId,
      "Hedef lokasyon kimliği",
    );

  if (
    sourceLocationId ===
    destinationLocationId
  ) {
    throw new InventoryValidationError(
      "Kaynak ve hedef lokasyon aynı olamaz.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    replenishmentId: requireText(
      input.replenishmentId,
      "İkmal kimliği",
    ),
    replenishmentItemId:
      requireText(
        input.replenishmentItemId,
        "İkmal satırı kimliği",
      ),
    sourceLocationId,
    destinationLocationId,
    productId: requireText(
      input.productId,
      "Ürün kimliği",
    ),
    stockStatus: requireText(
      input.stockStatus,
      "Stok durumu",
    ),
    unit: requireText(
      input.unit,
      "Ölçü birimi",
    ),
    allocatedQuantity,
    sequence,
    score,
    ...optionalTextField(
      "skuId",
      input.skuId,
      "SKU kimliği",
    ),
    ...optionalTextField(
      "inventoryBalanceId",
      input.inventoryBalanceId,
      "Stok bakiyesi kimliği",
    ),
    ...(input.tracking !== undefined
      ? {
          tracking:
            structuredClone(
              input.tracking,
            ),
        }
      : {}),
    ...optionalTextField(
      "inventoryReservationId",
      input.inventoryReservationId,
      "Stok rezervasyon kimliği",
    ),
  };
}

export function validateCreateReplenishmentTask(
  input: CreateReplenishmentTaskInput,
): CreateReplenishmentTaskInput {
  if (
    !REPLENISHMENT_TASK_TYPES.includes(
      input.type,
    )
  ) {
    throw new InventoryValidationError(
      "İkmal görev türü geçersiz.",
    );
  }

  const priority =
    input.priority === undefined
      ? 50
      : requireNonNegativeNumber(
          input.priority,
          "Görev önceliği",
        );

  if (priority > 100) {
    throw new InventoryValidationError(
      "Görev önceliği 100 değerini aşamaz.",
    );
  }

  const sequence =
    input.sequence === undefined
      ? 1
      : requirePositiveNumber(
          input.sequence,
          "Görev sırası",
        );

  if (!Number.isInteger(sequence)) {
    throw new InventoryValidationError(
      "Görev sırası tam sayı olmalıdır.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    replenishmentId: requireText(
      input.replenishmentId,
      "İkmal kimliği",
    ),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    type: input.type,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    priority,
    sequence,
    ...optionalTextField(
      "replenishmentItemId",
      input.replenishmentItemId,
      "İkmal satırı kimliği",
    ),
    ...optionalTextField(
      "allocationId",
      input.allocationId,
      "Tahsis kimliği",
    ),
    ...optionalTextField(
      "sourceLocationId",
      input.sourceLocationId,
      "Kaynak lokasyon kimliği",
    ),
    ...optionalTextField(
      "destinationLocationId",
      input.destinationLocationId,
      "Hedef lokasyon kimliği",
    ),
    ...optionalTextField(
      "productId",
      input.productId,
      "Ürün kimliği",
    ),
    ...optionalTextField(
      "assignedUserId",
      input.assignedUserId,
      "Atanan kullanıcı",
    ),
    ...optionalTextField(
      "assignedTeamId",
      input.assignedTeamId,
      "Atanan ekip",
    ),
    ...optionalTextField(
      "assignedEquipmentId",
      input.assignedEquipmentId,
      "Atanan ekipman",
    ),
    ...optionalDateField(
      "plannedAt",
      input.plannedAt,
      "Planlanan görev tarihi",
    ),
    ...optionalTextField(
      "notes",
      input.notes,
      "Görev notu",
    ),
  };
}

export function validateCreateReplenishmentRule(
  input: CreateReplenishmentRuleInput,
): CreateReplenishmentRuleInput {
  if (
    !isReplenishmentStrategy(
      input.strategy,
    )
  ) {
    throw new InventoryValidationError(
      "İkmal kuralı stratejisi geçersiz.",
    );
  }

  const minimumQuantity =
    normalizeOptionalNonNegativeNumber(
      input.minimumQuantity,
      "Minimum stok miktarı",
    );

  const maximumQuantity =
    normalizeOptionalNonNegativeNumber(
      input.maximumQuantity,
      "Maksimum stok miktarı",
    );

  if (
    minimumQuantity !== undefined &&
    maximumQuantity !== undefined &&
    minimumQuantity > maximumQuantity
  ) {
    throw new InventoryValidationError(
      "Minimum stok miktarı maksimum stok miktarından büyük olamaz.",
    );
  }

  const minimumTransferQuantity =
    normalizeOptionalPositiveNumber(
      input.minimumTransferQuantity,
      "Minimum transfer miktarı",
    );

  const maximumTransferQuantity =
    normalizeOptionalPositiveNumber(
      input.maximumTransferQuantity,
      "Maksimum transfer miktarı",
    );

  if (
    minimumTransferQuantity !==
      undefined &&
    maximumTransferQuantity !==
      undefined &&
    minimumTransferQuantity >
      maximumTransferQuantity
  ) {
    throw new InventoryValidationError(
      "Minimum transfer miktarı maksimum transfer miktarından büyük olamaz.",
    );
  }

  const targetFillPercentage =
    normalizeOptionalNonNegativeNumber(
      input.targetFillPercentage,
      "Hedef doluluk oranı",
    );

  if (
    targetFillPercentage !== undefined &&
    targetFillPercentage > 100
  ) {
    throw new InventoryValidationError(
      "Hedef doluluk oranı 100 değerini aşamaz.",
    );
  }

  const priority =
    input.priority === undefined
      ? 50
      : requireNonNegativeNumber(
          input.priority,
          "Kural önceliği",
        );

  if (priority > 100) {
    throw new InventoryValidationError(
      "Kural önceliği 100 değerini aşamaz.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    code: requireText(
      input.code,
      "Kural kodu",
    ).toUpperCase(),
    name: requireText(
      input.name,
      "Kural adı",
    ),
    strategy: input.strategy,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    priority,
    automaticRelease:
      input.automaticRelease ??
      false,
    allowPartialAllocation:
      input.allowPartialAllocation ??
      true,
    ...optionalTextField(
      "description",
      input.description,
      "Kural açıklaması",
    ),
    ...optionalTextField(
      "warehouseId",
      input.warehouseId,
      "Depo kimliği",
    ),
    ...optionalTextField(
      "zoneId",
      input.zoneId,
      "Bölge kimliği",
    ),
    ...optionalTextField(
      "destinationLocationId",
      input.destinationLocationId,
      "Hedef lokasyon kimliği",
    ),
    ...optionalTextField(
      "productId",
      input.productId,
      "Ürün kimliği",
    ),
    ...optionalTextField(
      "skuId",
      input.skuId,
      "SKU kimliği",
    ),
    ...optionalTextField(
      "productCategoryId",
      input.productCategoryId,
      "Ürün kategorisi kimliği",
    ),
    ...(input.abcClass !== undefined
      ? { abcClass: input.abcClass }
      : {}),
    ...(minimumQuantity !== undefined
      ? { minimumQuantity }
      : {}),
    ...(maximumQuantity !== undefined
      ? { maximumQuantity }
      : {}),
    ...optionalNumberField(
      "safetyStockQuantity",
      input.safetyStockQuantity,
      "Emniyet stok miktarı",
    ),
    ...optionalNumberField(
      "reorderPoint",
      input.reorderPoint,
      "Yeniden sipariş noktası",
    ),
    ...(targetFillPercentage !==
    undefined
      ? { targetFillPercentage }
      : {}),
    ...(minimumTransferQuantity !==
    undefined
      ? { minimumTransferQuantity }
      : {}),
    ...(maximumTransferQuantity !==
    undefined
      ? { maximumTransferQuantity }
      : {}),
    ...optionalPositiveNumberField(
      "transferMultiple",
      input.transferMultiple,
      "Transfer katı",
    ),
    ...optionalNumberField(
      "leadTimeMinutes",
      input.leadTimeMinutes,
      "İkmal tedarik süresi",
    ),
  };
}
