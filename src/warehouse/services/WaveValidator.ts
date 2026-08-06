import type {
  CreateWaveInput,
} from "../types/Wave";
import type {
  WaveCapacityInput,
} from "../types/WaveCapacity";
import type {
  CreateWaveItemInput,
} from "../types/WaveItem";
import type {
  CreateWaveOrderInput,
} from "../types/WaveOrder";
import type {
  CreateWaveRuleInput,
} from "../types/WaveRule";
import type {
  CreateWaveScheduleInput,
} from "../types/WaveSchedule";
import {
  isWaveStrategy,
} from "../types/WaveStrategy";
import type {
  CreateWaveTaskInput,
} from "../types/WaveTask";
import {
  WAVE_TASK_TYPES,
} from "../types/WaveTask";
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

function requirePositiveInteger(
  value: unknown,
  fieldName: string,
): number {
  const normalized =
    requirePositiveNumber(
      value,
      fieldName,
    );

  if (!Number.isInteger(normalized)) {
    throw new InventoryValidationError(
      `${fieldName} tam sayı olmalıdır.`,
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

function normalizeOptionalPositiveInteger(
  value: unknown,
  fieldName: string,
): number | undefined {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  return requirePositiveInteger(
    value,
    fieldName,
  );
}

function requireDate(
  value: unknown,
  fieldName: string,
): string {
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

  return requireDate(
    value,
    fieldName,
  );
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

function optionalPositiveIntegerField<
  Key extends string,
>(
  key: Key,
  value: unknown,
  fieldName: string,
): Partial<Record<Key, number>> {
  const normalized =
    normalizeOptionalPositiveInteger(
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

function normalizePriority(
  value: unknown,
  fieldName: string,
  defaultValue = 50,
): number {
  const priority =
    value === undefined
      ? defaultValue
      : requireNonNegativeNumber(
          value,
          fieldName,
        );

  if (priority > 100) {
    throw new InventoryValidationError(
      `${fieldName} 100 değerini aşamaz.`,
    );
  }

  return priority;
}

export function validateCreateWave(
  input: CreateWaveInput,
): CreateWaveInput {
  if (
    !isWaveStrategy(
      input.strategy,
    )
  ) {
    throw new InventoryValidationError(
      "Dalga planlama stratejisi geçersiz.",
    );
  }

  const plannedAt =
    normalizeOptionalDate(
      input.plannedAt,
      "Planlanan dalga tarihi",
    );

  const cutoffAt =
    normalizeOptionalDate(
      input.cutoffAt,
      "Dalga kesim tarihi",
    );

  if (
    plannedAt !== undefined &&
    cutoffAt !== undefined &&
    cutoffAt > plannedAt
  ) {
    throw new InventoryValidationError(
      "Dalga kesim tarihi planlanan dalga tarihinden sonra olamaz.",
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
    name: requireText(
      input.name,
      "Dalga adı",
    ),
    strategy: input.strategy,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    priority: normalizePriority(
      input.priority,
      "Dalga önceliği",
    ),
    ...optionalTextField(
      "ruleId",
      input.ruleId,
      "Dalga kuralı kimliği",
    ),
    ...optionalTextField(
      "scheduleId",
      input.scheduleId,
      "Dalga takvimi kimliği",
    ),
    ...(plannedAt !== undefined
      ? { plannedAt }
      : {}),
    ...(cutoffAt !== undefined
      ? { cutoffAt }
      : {}),
    ...optionalTextField(
      "notes",
      input.notes,
      "Dalga notu",
    ),
  };
}

export function validateCreateWaveOrder(
  input: CreateWaveOrderInput,
): CreateWaveOrderInput {
  const lineCount =
    requirePositiveInteger(
      input.lineCount,
      "Sipariş satır sayısı",
    );

  const itemQuantity =
    requirePositiveNumber(
      input.itemQuantity,
      "Sipariş ürün miktarı",
    );

  const cutoffAt =
    normalizeOptionalDate(
      input.cutoffAt,
      "Sipariş kesim tarihi",
    );

  const promisedAt =
    normalizeOptionalDate(
      input.promisedAt,
      "Taahhüt edilen teslim tarihi",
    );

  if (
    cutoffAt !== undefined &&
    promisedAt !== undefined &&
    promisedAt < cutoffAt
  ) {
    throw new InventoryValidationError(
      "Taahhüt edilen teslim tarihi sipariş kesim tarihinden önce olamaz.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    waveId: requireText(
      input.waveId,
      "Dalga kimliği",
    ),
    orderId: requireText(
      input.orderId,
      "Sipariş kimliği",
    ),
    orderNumber: requireText(
      input.orderNumber,
      "Sipariş numarası",
    ),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    priority: normalizePriority(
      input.priority,
      "Sipariş önceliği",
    ),
    lineCount,
    itemQuantity,
    ...optionalTextField(
      "customerId",
      input.customerId,
      "Müşteri kimliği",
    ),
    ...optionalTextField(
      "routeId",
      input.routeId,
      "Rota kimliği",
    ),
    ...optionalTextField(
      "carrierId",
      input.carrierId,
      "Taşıyıcı kimliği",
    ),
    ...optionalTextField(
      "serviceLevel",
      input.serviceLevel,
      "Servis seviyesi",
    ),
    ...optionalTextField(
      "temperatureZone",
      input.temperatureZone,
      "Sıcaklık bölgesi",
    ),
    ...optionalTextField(
      "shippingMethod",
      input.shippingMethod,
      "Sevkiyat yöntemi",
    ),
    ...optionalTextField(
      "destinationCountry",
      input.destinationCountry,
      "Hedef ülke",
    ),
    ...optionalTextField(
      "destinationCity",
      input.destinationCity,
      "Hedef şehir",
    ),
    ...optionalNumberField(
      "totalWeight",
      input.totalWeight,
      "Toplam ağırlık",
    ),
    ...optionalNumberField(
      "totalVolume",
      input.totalVolume,
      "Toplam hacim",
    ),
    ...(cutoffAt !== undefined
      ? { cutoffAt }
      : {}),
    ...(promisedAt !== undefined
      ? { promisedAt }
      : {}),
    ...optionalTextField(
      "notes",
      input.notes,
      "Sipariş notu",
    ),
  };
}

export function validateCreateWaveItem(
  input: CreateWaveItemInput,
): CreateWaveItemInput {
  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    waveId: requireText(
      input.waveId,
      "Dalga kimliği",
    ),
    waveOrderId: requireText(
      input.waveOrderId,
      "Dalga siparişi kimliği",
    ),
    orderId: requireText(
      input.orderId,
      "Sipariş kimliği",
    ),
    orderLineId: requireText(
      input.orderLineId,
      "Sipariş satırı kimliği",
    ),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
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
    requestedQuantity:
      requirePositiveNumber(
        input.requestedQuantity,
        "Talep edilen miktar",
      ),
    priority: normalizePriority(
      input.priority,
      "Dalga satırı önceliği",
    ),
    sequence:
      input.sequence === undefined
        ? 1
        : requirePositiveInteger(
            input.sequence,
            "Dalga satırı sırası",
          ),
    ...optionalTextField(
      "skuId",
      input.skuId,
      "SKU kimliği",
    ),
    ...optionalTextField(
      "zoneId",
      input.zoneId,
      "Depo bölgesi kimliği",
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
    ...(input.tracking !== undefined
      ? {
          tracking:
            structuredClone(
              input.tracking,
            ),
        }
      : {}),
  };
}

export function validateCreateWaveTask(
  input: CreateWaveTaskInput,
): CreateWaveTaskInput {
  if (
    !WAVE_TASK_TYPES.includes(
      input.type,
    )
  ) {
    throw new InventoryValidationError(
      "Dalga görev türü geçersiz.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    waveId: requireText(
      input.waveId,
      "Dalga kimliği",
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
    priority: normalizePriority(
      input.priority,
      "Görev önceliği",
    ),
    sequence:
      input.sequence === undefined
        ? 1
        : requirePositiveInteger(
            input.sequence,
            "Görev sırası",
          ),
    ...optionalTextField(
      "waveOrderId",
      input.waveOrderId,
      "Dalga siparişi kimliği",
    ),
    ...optionalTextField(
      "waveItemId",
      input.waveItemId,
      "Dalga satırı kimliği",
    ),
    ...optionalTextField(
      "allocationId",
      input.allocationId,
      "Tahsis kimliği",
    ),
    ...optionalTextField(
      "zoneId",
      input.zoneId,
      "Depo bölgesi kimliği",
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
    ...optionalPositiveNumberField(
      "estimatedMinutes",
      input.estimatedMinutes,
      "Tahmini görev süresi",
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

export function validateCreateWaveRule(
  input: CreateWaveRuleInput,
): CreateWaveRuleInput {
  if (
    !isWaveStrategy(
      input.strategy,
    )
  ) {
    throw new InventoryValidationError(
      "Dalga kuralı stratejisi geçersiz.",
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
    automaticPlanning:
      input.automaticPlanning ??
      false,
    automaticRelease:
      input.automaticRelease ??
      false,
    allowPartialRelease:
      input.allowPartialRelease ??
      true,
    priority: normalizePriority(
      input.priority,
      "Kural önceliği",
    ),
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
      "Depo bölgesi kimliği",
    ),
    ...optionalTextField(
      "routeId",
      input.routeId,
      "Rota kimliği",
    ),
    ...optionalTextField(
      "carrierId",
      input.carrierId,
      "Taşıyıcı kimliği",
    ),
    ...optionalTextField(
      "serviceLevel",
      input.serviceLevel,
      "Servis seviyesi",
    ),
    ...optionalTextField(
      "temperatureZone",
      input.temperatureZone,
      "Sıcaklık bölgesi",
    ),
    ...optionalPositiveIntegerField(
      "maximumOrders",
      input.maximumOrders,
      "Maksimum sipariş sayısı",
    ),
    ...optionalPositiveIntegerField(
      "maximumLines",
      input.maximumLines,
      "Maksimum satır sayısı",
    ),
    ...optionalPositiveNumberField(
      "maximumItems",
      input.maximumItems,
      "Maksimum ürün miktarı",
    ),
    ...optionalPositiveNumberField(
      "maximumWeight",
      input.maximumWeight,
      "Maksimum ağırlık",
    ),
    ...optionalPositiveNumberField(
      "maximumVolume",
      input.maximumVolume,
      "Maksimum hacim",
    ),
    ...optionalPositiveNumberField(
      "maximumEstimatedMinutes",
      input.maximumEstimatedMinutes,
      "Maksimum tahmini süre",
    ),
    ...optionalNumberField(
      "cutoffBufferMinutes",
      input.cutoffBufferMinutes,
      "Kesim saati güvenlik süresi",
    ),
    ...optionalNumberField(
      "minimumPriority",
      input.minimumPriority,
      "Minimum sipariş önceliği",
    ),
  };
}

export function validateCreateWaveSchedule(
  input: CreateWaveScheduleInput,
): CreateWaveScheduleInput {
  const startDate =
    requireDate(
      input.startDate,
      "Takvim başlangıç tarihi",
    );

  const endDate =
    normalizeOptionalDate(
      input.endDate,
      "Takvim bitiş tarihi",
    );

  if (
    endDate !== undefined &&
    endDate < startDate
  ) {
    throw new InventoryValidationError(
      "Takvim bitiş tarihi başlangıç tarihinden önce olamaz.",
    );
  }

  const frequencyMinutes =
    requirePositiveInteger(
      input.frequencyMinutes,
      "Planlama sıklığı",
    );

  const releaseOffsetMinutes =
    input.releaseOffsetMinutes ===
      undefined
      ? 0
      : requireNonNegativeNumber(
          input.releaseOffsetMinutes,
          "Serbest bırakma farkı",
        );

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    ruleId: requireText(
      input.ruleId,
      "Dalga kuralı kimliği",
    ),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    name: requireText(
      input.name,
      "Takvim adı",
    ),
    startDate,
    frequencyMinutes,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    releaseOffsetMinutes,
    ...(endDate !== undefined
      ? { endDate }
      : {}),
    ...optionalTextField(
      "cutoffTime",
      input.cutoffTime,
      "Kesim saati",
    ),
  };
}

export function validateWaveCapacityInput(
  input: WaveCapacityInput,
): WaveCapacityInput {
  const normalized:
    WaveCapacityInput = {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    availableLaborMinutes:
      requireNonNegativeNumber(
        input.availableLaborMinutes,
        "Kullanılabilir personel süresi",
      ),
    requiredLaborMinutes:
      requireNonNegativeNumber(
        input.requiredLaborMinutes,
        "Gerekli personel süresi",
      ),
    availableEquipmentMinutes:
      requireNonNegativeNumber(
        input.availableEquipmentMinutes,
        "Kullanılabilir ekipman süresi",
      ),
    requiredEquipmentMinutes:
      requireNonNegativeNumber(
        input.requiredEquipmentMinutes,
        "Gerekli ekipman süresi",
      ),
    availableOrderCapacity:
      requireNonNegativeNumber(
        input.availableOrderCapacity,
        "Kullanılabilir sipariş kapasitesi",
      ),
    requiredOrderCapacity:
      requireNonNegativeNumber(
        input.requiredOrderCapacity,
        "Gerekli sipariş kapasitesi",
      ),
    availableLineCapacity:
      requireNonNegativeNumber(
        input.availableLineCapacity,
        "Kullanılabilir satır kapasitesi",
      ),
    requiredLineCapacity:
      requireNonNegativeNumber(
        input.requiredLineCapacity,
        "Gerekli satır kapasitesi",
      ),
    availableItemCapacity:
      requireNonNegativeNumber(
        input.availableItemCapacity,
        "Kullanılabilir ürün kapasitesi",
      ),
    requiredItemCapacity:
      requireNonNegativeNumber(
        input.requiredItemCapacity,
        "Gerekli ürün kapasitesi",
      ),
    ...optionalTextField(
      "waveId",
      input.waveId,
      "Dalga kimliği",
    ),
    ...optionalNumberField(
      "availableWeightCapacity",
      input.availableWeightCapacity,
      "Kullanılabilir ağırlık kapasitesi",
    ),
    ...optionalNumberField(
      "requiredWeightCapacity",
      input.requiredWeightCapacity,
      "Gerekli ağırlık kapasitesi",
    ),
    ...optionalNumberField(
      "availableVolumeCapacity",
      input.availableVolumeCapacity,
      "Kullanılabilir hacim kapasitesi",
    ),
    ...optionalNumberField(
      "requiredVolumeCapacity",
      input.requiredVolumeCapacity,
      "Gerekli hacim kapasitesi",
    ),
  };

  if (
    normalized.requiredWeightCapacity !==
      undefined &&
    normalized.availableWeightCapacity ===
      undefined
  ) {
    throw new InventoryValidationError(
      "Gerekli ağırlık kapasitesi girildiğinde kullanılabilir ağırlık kapasitesi de belirtilmelidir.",
    );
  }

  if (
    normalized.requiredVolumeCapacity !==
      undefined &&
    normalized.availableVolumeCapacity ===
      undefined
  ) {
    throw new InventoryValidationError(
      "Gerekli hacim kapasitesi girildiğinde kullanılabilir hacim kapasitesi de belirtilmelidir.",
    );
  }

  return normalized;
}
