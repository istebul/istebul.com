import type {
  CreateShippingInput,
} from "../types/Shipping";
import type {
  CreateShippingAddressInput,
  ShippingAddress,
} from "../types/ShippingAddress";
import type {
  CreateShippingAsnInput,
} from "../types/ShippingAsn";
import type {
  CreateShippingCarrierInput,
} from "../types/ShippingCarrier";
import type {
  CreateShippingDockInput,
} from "../types/ShippingDock";
import type {
  ConfirmShippingItemLoadInput,
  CreateShippingItemInput,
} from "../types/ShippingItem";
import type {
  CreateShippingManifestInput,
} from "../types/ShippingManifest";
import type {
  CreateShippingPackageInput,
} from "../types/ShippingPackage";
import type {
  CreateShippingProofOfDeliveryInput,
} from "../types/ShippingProofOfDelivery";
import type {
  CreateShippingServiceLevelInput,
} from "../types/ShippingServiceLevel";
import type {
  CreateShippingTaskInput,
} from "../types/ShippingTask";
import type {
  CreateShippingTrackingEventInput,
} from "../types/ShippingTracking";
import type {
  CreateShippingVehicleInput,
} from "../types/ShippingVehicle";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";

function requireText(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new InventoryValidationError(
      `${fieldName} boş bırakılamaz.`,
    );
  }

  return normalized;
}

function normalizeOptionalText(
  value?: string,
): string | undefined {
  const normalized = value?.trim();

  return normalized
    ? normalized
    : undefined;
}

function validatePositiveNumber(
  value: number,
  fieldName: string,
): number {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new InventoryValidationError(
      `${fieldName} sıfırdan büyük olmalıdır.`,
    );
  }

  return value;
}

function validateNonNegativeNumber(
  value: number,
  fieldName: string,
): number {
  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new InventoryValidationError(
      `${fieldName} negatif olamaz.`,
    );
  }

  return value;
}

function validateIntegerRange(
  value: number,
  fieldName: string,
  minimum: number,
  maximum: number,
): number {
  if (
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new InventoryValidationError(
      `${fieldName} ${minimum} ile ${maximum} arasında tam sayı olmalıdır.`,
    );
  }

  return value;
}

function normalizeIsoDate(
  value: string,
  fieldName: string,
): string {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    throw new InventoryValidationError(
      `${fieldName} geçerli bir tarih olmalıdır.`,
    );
  }

  return new Date(timestamp).toISOString();
}

function normalizeCountryCode(
  value: string,
): string {
  const normalized =
    requireText(
      value,
      "Ülke kodu",
    ).toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new InventoryValidationError(
      "Ülke kodu iki harfli ISO ülke kodu olmalıdır.",
    );
  }

  return normalized;
}

function normalizeEmail(
  value?: string,
): string | undefined {
  const normalized =
    normalizeOptionalText(value);

  if (
    normalized !== undefined &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalized,
    )
  ) {
    throw new InventoryValidationError(
      "E-posta adresi geçerli biçimde olmalıdır.",
    );
  }

  return normalized;
}

function normalizePhone(
  value?: string,
): string | undefined {
  const normalized =
    normalizeOptionalText(value);

  if (
    normalized !== undefined &&
    !/^\+?[0-9()\s-]{7,25}$/.test(
      normalized,
    )
  ) {
    throw new InventoryValidationError(
      "Telefon numarası geçerli biçimde olmalıdır.",
    );
  }

  return normalized;
}

function normalizeUrl(
  value?: string,
  fieldName = "İnternet adresi",
): string | undefined {
  const normalized =
    normalizeOptionalText(value);

  if (normalized === undefined) {
    return undefined;
  }

  try {
    const parsed = new URL(normalized);

    if (
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:"
    ) {
      throw new Error();
    }
  } catch {
    throw new InventoryValidationError(
      `${fieldName} geçerli bir HTTP veya HTTPS adresi olmalıdır.`,
    );
  }

  return normalized;
}

function validateLatitude(
  value: number,
): number {
  if (
    !Number.isFinite(value) ||
    value < -90 ||
    value > 90
  ) {
    throw new InventoryValidationError(
      "Enlem -90 ile 90 arasında olmalıdır.",
    );
  }

  return value;
}

function validateLongitude(
  value: number,
): number {
  if (
    !Number.isFinite(value) ||
    value < -180 ||
    value > 180
  ) {
    throw new InventoryValidationError(
      "Boylam -180 ile 180 arasında olmalıdır.",
    );
  }

  return value;
}

function normalizeTime(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(
      normalized,
    )
  ) {
    throw new InventoryValidationError(
      `${fieldName} SS:DD biçiminde olmalıdır.`,
    );
  }

  return normalized;
}

function normalizePlateNumber(
  value: string,
): string {
  const normalized =
    requireText(
      value,
      "Araç plakası",
    )
      .toLocaleUpperCase("tr-TR")
      .replace(/\s+/g, " ");

  if (
    normalized.length < 4 ||
    normalized.length > 20
  ) {
    throw new InventoryValidationError(
      "Araç plakası 4 ile 20 karakter arasında olmalıdır.",
    );
  }

  return normalized;
}

function normalizeCode(
  value: string,
  fieldName: string,
): string {
  const normalized =
    requireText(
      value,
      fieldName,
    )
      .toLocaleUpperCase("tr-TR")
      .replace(/\s+/g, "-");

  if (
    !/^[A-ZÇĞİÖŞÜ0-9._-]+$/u.test(
      normalized,
    )
  ) {
    throw new InventoryValidationError(
      `${fieldName} yalnızca harf, rakam, nokta, alt çizgi ve kısa çizgi içerebilir.`,
    );
  }

  return normalized;
}

export function validateShippingAddress(
  input: CreateShippingAddressInput,
): CreateShippingAddressInput {
  const companyName =
    normalizeOptionalText(
      input.companyName,
    );

  const contactName =
    normalizeOptionalText(
      input.contactName,
    );

  const phone =
    normalizePhone(input.phone);

  const email =
    normalizeEmail(input.email);

  const district =
    normalizeOptionalText(
      input.district,
    );

  const postalCode =
    normalizeOptionalText(
      input.postalCode,
    );

  const addressLine2 =
    normalizeOptionalText(
      input.addressLine2,
    );

  const deliveryInstructions =
    normalizeOptionalText(
      input.deliveryInstructions,
    );

  const latitude =
    input.latitude !== undefined
      ? validateLatitude(input.latitude)
      : undefined;

  const longitude =
    input.longitude !== undefined
      ? validateLongitude(
          input.longitude,
        )
      : undefined;

  if (
    (latitude === undefined) !==
    (longitude === undefined)
  ) {
    throw new InventoryValidationError(
      "Enlem ve boylam birlikte verilmelidir.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    type: input.type,
    name: requireText(
      input.name,
      "Adres adı",
    ),
    countryCode:
      normalizeCountryCode(
        input.countryCode,
      ),
    country: requireText(
      input.country,
      "Ülke",
    ),
    city: requireText(
      input.city,
      "Şehir",
    ),
    addressLine1: requireText(
      input.addressLine1,
      "Adres satırı",
    ),
    residential:
      input.residential ?? false,
    ...(companyName !== undefined
      ? { companyName }
      : {}),
    ...(contactName !== undefined
      ? { contactName }
      : {}),
    ...(phone !== undefined
      ? { phone }
      : {}),
    ...(email !== undefined
      ? { email }
      : {}),
    ...(district !== undefined
      ? { district }
      : {}),
    ...(postalCode !== undefined
      ? { postalCode }
      : {}),
    ...(addressLine2 !== undefined
      ? { addressLine2 }
      : {}),
    ...(latitude !== undefined
      ? { latitude }
      : {}),
    ...(longitude !== undefined
      ? { longitude }
      : {}),
    ...(deliveryInstructions !==
    undefined
      ? { deliveryInstructions }
      : {}),
  };
}

export function validateCreateShipping(
  input: CreateShippingInput,
): CreateShippingInput {
  const packingId =
    normalizeOptionalText(
      input.packingId,
    );

  const orderId =
    normalizeOptionalText(
      input.orderId,
    );

  const orderNumber =
    normalizeOptionalText(
      input.orderNumber,
    );

  const referenceType =
    normalizeOptionalText(
      input.referenceType,
    );

  const referenceId =
    normalizeOptionalText(
      input.referenceId,
    );

  const referenceNumber =
    normalizeOptionalText(
      input.referenceNumber,
    );

  const carrierId =
    normalizeOptionalText(
      input.carrierId,
    );

  const serviceLevelId =
    normalizeOptionalText(
      input.serviceLevelId,
    );

  const vehicleId =
    normalizeOptionalText(
      input.vehicleId,
    );

  const dockId =
    normalizeOptionalText(
      input.dockId,
    );

  const driverId =
    normalizeOptionalText(
      input.driverId,
    );

  const driverName =
    normalizeOptionalText(
      input.driverName,
    );

  const driverPhone =
    normalizePhone(
      input.driverPhone,
    );

  const notes =
    normalizeOptionalText(
      input.notes,
    );

  const priority =
    validateIntegerRange(
      input.priority ?? 50,
      "Sevkiyat önceliği",
      1,
      100,
    );

  const plannedAt =
    input.plannedAt !== undefined
      ? normalizeIsoDate(
          input.plannedAt,
          "Planlanan sevkiyat tarihi",
        )
      : undefined;

  const expectedDeliveryAt =
    input.expectedDeliveryAt !==
    undefined
      ? normalizeIsoDate(
          input.expectedDeliveryAt,
          "Beklenen teslimat tarihi",
        )
      : undefined;

  if (
    plannedAt !== undefined &&
    expectedDeliveryAt !== undefined &&
    Date.parse(expectedDeliveryAt) <
      Date.parse(plannedAt)
  ) {
    throw new InventoryValidationError(
      "Beklenen teslimat tarihi planlanan sevkiyat tarihinden önce olamaz.",
    );
  }

  if (
    (referenceType === undefined) !==
    (referenceId === undefined)
  ) {
    throw new InventoryValidationError(
      "Referans türü ve referans kimliği birlikte verilmelidir.",
    );
  }

  const shipFromAddress =
    validateShippingAddress({
      ...input.shipFromAddress,
      tenantId: input.tenantId,
      type: "ship_from",
    });

  const shipToAddress =
    validateShippingAddress({
      ...input.shipToAddress,
      tenantId: input.tenantId,
      type: "ship_to",
    });

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    shippingLocationId:
      requireText(
        input.shippingLocationId,
        "Sevkiyat lokasyonu",
      ),
    strategy: input.strategy,
    shipFromAddress:
      shipFromAddress as ShippingAddress,
    shipToAddress:
      shipToAddress as ShippingAddress,
    priority,
    temperatureControlled:
      input.temperatureControlled ??
      false,
    hazardousMaterial:
      input.hazardousMaterial ??
      false,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(packingId !== undefined
      ? { packingId }
      : {}),
    ...(orderId !== undefined
      ? { orderId }
      : {}),
    ...(orderNumber !== undefined
      ? { orderNumber }
      : {}),
    ...(referenceType !== undefined
      ? { referenceType }
      : {}),
    ...(referenceId !== undefined
      ? { referenceId }
      : {}),
    ...(referenceNumber !== undefined
      ? { referenceNumber }
      : {}),
    ...(carrierId !== undefined
      ? { carrierId }
      : {}),
    ...(serviceLevelId !== undefined
      ? { serviceLevelId }
      : {}),
    ...(vehicleId !== undefined
      ? { vehicleId }
      : {}),
    ...(dockId !== undefined
      ? { dockId }
      : {}),
    ...(driverId !== undefined
      ? { driverId }
      : {}),
    ...(driverName !== undefined
      ? { driverName }
      : {}),
    ...(driverPhone !== undefined
      ? { driverPhone }
      : {}),
    ...(plannedAt !== undefined
      ? { plannedAt }
      : {}),
    ...(expectedDeliveryAt !==
    undefined
      ? { expectedDeliveryAt }
      : {}),
    ...(notes !== undefined
      ? { notes }
      : {}),
  };
}

export function validateCreateShippingItem(
  input: CreateShippingItemInput,
): CreateShippingItemInput {
  const packingId =
    normalizeOptionalText(
      input.packingId,
    );

  const packingItemId =
    normalizeOptionalText(
      input.packingItemId,
    );

  const orderId =
    normalizeOptionalText(
      input.orderId,
    );

  const orderItemId =
    normalizeOptionalText(
      input.orderItemId,
    );

  const skuId =
    normalizeOptionalText(
      input.skuId,
    );

  const notes =
    normalizeOptionalText(
      input.notes,
    );

  const unitWeight =
    input.unitWeight !== undefined
      ? validateNonNegativeNumber(
          input.unitWeight,
          "Birim ağırlık",
        )
      : undefined;

  const unitVolume =
    input.unitVolume !== undefined
      ? validateNonNegativeNumber(
          input.unitVolume,
          "Birim hacim",
        )
      : undefined;

  if (
    unitWeight !== undefined &&
    input.weightUnit === undefined
  ) {
    throw new InventoryValidationError(
      "Birim ağırlık verildiğinde ağırlık birimi de belirtilmelidir.",
    );
  }

  if (
    unitVolume !== undefined &&
    input.volumeUnit === undefined
  ) {
    throw new InventoryValidationError(
      "Birim hacim verildiğinde hacim birimi de belirtilmelidir.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    shippingId: requireText(
      input.shippingId,
      "Sevkiyat kimliği",
    ),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    productId: requireText(
      input.productId,
      "Ürün kimliği",
    ),
    requestedQuantity:
      validatePositiveNumber(
        input.requestedQuantity,
        "Sevk edilecek miktar",
      ),
    unit: requireText(
      input.unit,
      "Ölçü birimi",
    ),
    temperatureControlled:
      input.temperatureControlled ??
      false,
    hazardousMaterial:
      input.hazardousMaterial ??
      false,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(packingId !== undefined
      ? { packingId }
      : {}),
    ...(packingItemId !== undefined
      ? { packingItemId }
      : {}),
    ...(orderId !== undefined
      ? { orderId }
      : {}),
    ...(orderItemId !== undefined
      ? { orderItemId }
      : {}),
    ...(skuId !== undefined
      ? { skuId }
      : {}),
    ...(input.tracking !== undefined
      ? { tracking: input.tracking }
      : {}),
    ...(unitWeight !== undefined
      ? { unitWeight }
      : {}),
    ...(unitVolume !== undefined
      ? { unitVolume }
      : {}),
    ...(input.weightUnit !== undefined
      ? {
          weightUnit:
            input.weightUnit,
        }
      : {}),
    ...(input.volumeUnit !== undefined
      ? {
          volumeUnit:
            input.volumeUnit,
        }
      : {}),
    ...(notes !== undefined
      ? { notes }
      : {}),
  };
}

export function validateConfirmShippingItemLoad(
  input: ConfirmShippingItemLoadInput,
): ConfirmShippingItemLoadInput {
  const quantity =
    validateNonNegativeNumber(
      input.quantity,
      "Yüklenen miktar",
    );

  const damagedQuantity =
    validateNonNegativeNumber(
      input.damagedQuantity ?? 0,
      "Hasarlı miktar",
    );

  const missingQuantity =
    validateNonNegativeNumber(
      input.missingQuantity ?? 0,
      "Eksik miktar",
    );

  if (
    quantity === 0 &&
    damagedQuantity === 0 &&
    missingQuantity === 0
  ) {
    throw new InventoryValidationError(
      "Yüklenen, hasarlı veya eksik miktarlardan en az biri sıfırdan büyük olmalıdır.",
    );
  }

  const shippingPackageId =
    normalizeOptionalText(
      input.shippingPackageId,
    );

  const notes =
    normalizeOptionalText(
      input.notes,
    );

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    shippingId: requireText(
      input.shippingId,
      "Sevkiyat kimliği",
    ),
    shippingItemId:
      requireText(
        input.shippingItemId,
        "Sevkiyat satırı",
      ),
    quantity,
    damagedQuantity,
    missingQuantity,
    loadedBy: requireText(
      input.loadedBy,
      "Yüklemeyi yapan kullanıcı",
    ),
    ...(shippingPackageId !==
    undefined
      ? { shippingPackageId }
      : {}),
    ...(notes !== undefined
      ? { notes }
      : {}),
  };
}

export function validateShippingLoadTotals(
  remainingQuantity: number,
  input: ConfirmShippingItemLoadInput,
): void {
  const totalProcessed =
    input.quantity +
    (input.damagedQuantity ?? 0) +
    (input.missingQuantity ?? 0);

  if (
    totalProcessed >
    remainingQuantity
  ) {
    throw new InventoryValidationError(
      `Yüklenen, hasarlı ve eksik toplam miktar kalan miktarı aşamaz. Kalan miktar: ${remainingQuantity}`,
    );
  }
}

export function validateCreateShippingPackage(
  input: CreateShippingPackageInput,
): CreateShippingPackageInput {
  const sscc =
    normalizeOptionalText(input.sscc);

  const trackingNumber =
    normalizeOptionalText(
      input.trackingNumber,
    );

  const palletId =
    normalizeOptionalText(
      input.palletId,
    );

  const parentPackageId =
    normalizeOptionalText(
      input.parentPackageId,
    );

  const notes =
    normalizeOptionalText(
      input.notes,
    );

  if (
    sscc !== undefined &&
    !/^\d{18}$/.test(sscc)
  ) {
    throw new InventoryValidationError(
      "SSCC tam olarak 18 rakam olmalıdır.",
    );
  }

  const weight =
    input.weight !== undefined
      ? validateNonNegativeNumber(
          input.weight,
          "Paket ağırlığı",
        )
      : undefined;

  const volume =
    input.volume !== undefined
      ? validateNonNegativeNumber(
          input.volume,
          "Paket hacmi",
        )
      : undefined;

  if (
    weight !== undefined &&
    input.weightUnit === undefined
  ) {
    throw new InventoryValidationError(
      "Paket ağırlığı verildiğinde ağırlık birimi de belirtilmelidir.",
    );
  }

  if (
    volume !== undefined &&
    input.volumeUnit === undefined
  ) {
    throw new InventoryValidationError(
      "Paket hacmi verildiğinde hacim birimi de belirtilmelidir.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    shippingId: requireText(
      input.shippingId,
      "Sevkiyat kimliği",
    ),
    packingId: requireText(
      input.packingId,
      "Paketleme kimliği",
    ),
    packingPackageId:
      requireText(
        input.packingPackageId,
        "Paketleme paket kimliği",
      ),
    packageNumber: requireText(
      input.packageNumber,
      "Paket numarası",
    ),
    loadingSequence:
      validateIntegerRange(
        input.loadingSequence ?? 1,
        "Yükleme sırası",
        1,
        1_000_000,
      ),
    ...(sscc !== undefined
      ? { sscc }
      : {}),
    ...(trackingNumber !== undefined
      ? { trackingNumber }
      : {}),
    ...(weight !== undefined
      ? { weight }
      : {}),
    ...(volume !== undefined
      ? { volume }
      : {}),
    ...(input.weightUnit !== undefined
      ? {
          weightUnit:
            input.weightUnit,
        }
      : {}),
    ...(input.volumeUnit !== undefined
      ? {
          volumeUnit:
            input.volumeUnit,
        }
      : {}),
    ...(palletId !== undefined
      ? { palletId }
      : {}),
    ...(parentPackageId !== undefined
      ? { parentPackageId }
      : {}),
    ...(notes !== undefined
      ? { notes }
      : {}),
  };
}

export function validateCreateShippingCarrier(
  input: CreateShippingCarrierInput,
): CreateShippingCarrierInput {
  const taxNumber =
    normalizeOptionalText(
      input.taxNumber,
    );

  const contactName =
    normalizeOptionalText(
      input.contactName,
    );

  const phone =
    normalizePhone(input.phone);

  const email =
    normalizeEmail(input.email);

  const website =
    normalizeUrl(
      input.website,
      "Taşıyıcı internet adresi",
    );

  const accountNumber =
    normalizeOptionalText(
      input.accountNumber,
    );

  const integrationCode =
    normalizeOptionalText(
      input.integrationCode,
    );

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    code: normalizeCode(
      input.code,
      "Taşıyıcı kodu",
    ),
    name: requireText(
      input.name,
      "Taşıyıcı adı",
    ),
    type: input.type,
    apiEnabled:
      input.apiEnabled ?? false,
    trackingSupported:
      input.trackingSupported ??
      false,
    manifestSupported:
      input.manifestSupported ??
      false,
    asnSupported:
      input.asnSupported ?? false,
    temperatureControlled:
      input.temperatureControlled ??
      false,
    hazardousMaterialAllowed:
      input.hazardousMaterialAllowed ??
      false,
    international:
      input.international ?? false,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(taxNumber !== undefined
      ? { taxNumber }
      : {}),
    ...(contactName !== undefined
      ? { contactName }
      : {}),
    ...(phone !== undefined
      ? { phone }
      : {}),
    ...(email !== undefined
      ? { email }
      : {}),
    ...(website !== undefined
      ? { website }
      : {}),
    ...(accountNumber !== undefined
      ? { accountNumber }
      : {}),
    ...(integrationCode !== undefined
      ? { integrationCode }
      : {}),
  };
}

export function validateCreateShippingServiceLevel(
  input: CreateShippingServiceLevelInput,
): CreateShippingServiceLevelInput {
  const description =
    normalizeOptionalText(
      input.description,
    );

  const cutoffTime =
    input.cutoffTime !== undefined
      ? normalizeTime(
          input.cutoffTime,
          "Sipariş kesim saati",
        )
      : undefined;

  const minimumDeliveryHours =
    input.minimumDeliveryHours !==
    undefined
      ? validateNonNegativeNumber(
          input.minimumDeliveryHours,
          "Minimum teslimat süresi",
        )
      : undefined;

  const maximumDeliveryHours =
    input.maximumDeliveryHours !==
    undefined
      ? validatePositiveNumber(
          input.maximumDeliveryHours,
          "Maksimum teslimat süresi",
        )
      : undefined;

  if (
    minimumDeliveryHours !== undefined &&
    maximumDeliveryHours !== undefined &&
    minimumDeliveryHours >
      maximumDeliveryHours
  ) {
    throw new InventoryValidationError(
      "Minimum teslimat süresi maksimum teslimat süresinden büyük olamaz.",
    );
  }

  const maximumWeight =
    input.maximumWeight !== undefined
      ? validatePositiveNumber(
          input.maximumWeight,
          "Maksimum taşıma ağırlığı",
        )
      : undefined;

  const maximumVolume =
    input.maximumVolume !== undefined
      ? validatePositiveNumber(
          input.maximumVolume,
          "Maksimum taşıma hacmi",
        )
      : undefined;

  if (
    maximumWeight !== undefined &&
    input.weightUnit === undefined
  ) {
    throw new InventoryValidationError(
      "Maksimum ağırlık verildiğinde ağırlık birimi de belirtilmelidir.",
    );
  }

  if (
    maximumVolume !== undefined &&
    input.volumeUnit === undefined
  ) {
    throw new InventoryValidationError(
      "Maksimum hacim verildiğinde hacim birimi de belirtilmelidir.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    carrierId: requireText(
      input.carrierId,
      "Taşıyıcı kimliği",
    ),
    code: normalizeCode(
      input.code,
      "Servis seviyesi kodu",
    ),
    name: requireText(
      input.name,
      "Servis seviyesi adı",
    ),
    type: input.type,
    temperatureControlled:
      input.temperatureControlled ??
      false,
    hazardousMaterialAllowed:
      input.hazardousMaterialAllowed ??
      false,
    international:
      input.international ?? false,
    trackingSupported:
      input.trackingSupported ??
      false,
    proofOfDeliveryRequired:
      input.proofOfDeliveryRequired ??
      false,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(description !== undefined
      ? { description }
      : {}),
    ...(minimumDeliveryHours !==
    undefined
      ? { minimumDeliveryHours }
      : {}),
    ...(maximumDeliveryHours !==
    undefined
      ? { maximumDeliveryHours }
      : {}),
    ...(cutoffTime !== undefined
      ? { cutoffTime }
      : {}),
    ...(maximumWeight !== undefined
      ? { maximumWeight }
      : {}),
    ...(maximumVolume !== undefined
      ? { maximumVolume }
      : {}),
    ...(input.weightUnit !== undefined
      ? {
          weightUnit:
            input.weightUnit,
        }
      : {}),
    ...(input.volumeUnit !== undefined
      ? {
          volumeUnit:
            input.volumeUnit,
        }
      : {}),
  };
}

export function validateCreateShippingVehicle(
  input: CreateShippingVehicleInput,
): CreateShippingVehicleInput {
  const carrierId =
    normalizeOptionalText(
      input.carrierId,
    );

  const trailerPlateNumber =
    input.trailerPlateNumber !== undefined
      ? normalizePlateNumber(
          input.trailerPlateNumber,
        )
      : undefined;

  const maximumWeight =
    input.maximumWeight !== undefined
      ? validatePositiveNumber(
          input.maximumWeight,
          "Araç maksimum ağırlığı",
        )
      : undefined;

  const maximumVolume =
    input.maximumVolume !== undefined
      ? validatePositiveNumber(
          input.maximumVolume,
          "Araç maksimum hacmi",
        )
      : undefined;

  const palletCapacity =
    input.palletCapacity !== undefined
      ? validateIntegerRange(
          input.palletCapacity,
          "Palet kapasitesi",
          1,
          100_000,
        )
      : undefined;

  const packageCapacity =
    input.packageCapacity !== undefined
      ? validateIntegerRange(
          input.packageCapacity,
          "Paket kapasitesi",
          1,
          1_000_000,
        )
      : undefined;

  const minimumTemperature =
    input.minimumTemperature;

  const maximumTemperature =
    input.maximumTemperature;

  if (
    minimumTemperature !== undefined &&
    !Number.isFinite(
      minimumTemperature,
    )
  ) {
    throw new InventoryValidationError(
      "Minimum araç sıcaklığı geçerli sayı olmalıdır.",
    );
  }

  if (
    maximumTemperature !== undefined &&
    !Number.isFinite(
      maximumTemperature,
    )
  ) {
    throw new InventoryValidationError(
      "Maksimum araç sıcaklığı geçerli sayı olmalıdır.",
    );
  }

  if (
    minimumTemperature !== undefined &&
    maximumTemperature !== undefined &&
    minimumTemperature >
      maximumTemperature
  ) {
    throw new InventoryValidationError(
      "Minimum araç sıcaklığı maksimum araç sıcaklığından büyük olamaz.",
    );
  }

  if (
    input.temperatureControlled !== true &&
    (
      minimumTemperature !== undefined ||
      maximumTemperature !== undefined
    )
  ) {
    throw new InventoryValidationError(
      "Sıcaklık aralığı yalnızca sıcaklık kontrollü araçlarda tanımlanabilir.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    code: normalizeCode(
      input.code,
      "Araç kodu",
    ),
    plateNumber:
      normalizePlateNumber(
        input.plateNumber,
      ),
    type: input.type,
    temperatureControlled:
      input.temperatureControlled ??
      false,
    hazardousMaterialAllowed:
      input.hazardousMaterialAllowed ??
      false,
    gpsEnabled:
      input.gpsEnabled ?? false,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(carrierId !== undefined
      ? { carrierId }
      : {}),
    ...(trailerPlateNumber !== undefined
      ? { trailerPlateNumber }
      : {}),
    ...(maximumWeight !== undefined
      ? { maximumWeight }
      : {}),
    ...(maximumVolume !== undefined
      ? { maximumVolume }
      : {}),
    ...(input.weightUnit !== undefined
      ? {
          weightUnit:
            input.weightUnit,
        }
      : {}),
    ...(input.volumeUnit !== undefined
      ? {
          volumeUnit:
            input.volumeUnit,
        }
      : {}),
    ...(palletCapacity !== undefined
      ? { palletCapacity }
      : {}),
    ...(packageCapacity !== undefined
      ? { packageCapacity }
      : {}),
    ...(minimumTemperature !== undefined
      ? { minimumTemperature }
      : {}),
    ...(maximumTemperature !== undefined
      ? { maximumTemperature }
      : {}),
  };
}

export function validateCreateShippingDock(
  input: CreateShippingDockInput,
): CreateShippingDockInput {
  const maximumVehicleHeight =
    input.maximumVehicleHeight !==
    undefined
      ? validatePositiveNumber(
          input.maximumVehicleHeight,
          "Maksimum araç yüksekliği",
        )
      : undefined;

  const maximumVehicleWeight =
    input.maximumVehicleWeight !==
    undefined
      ? validatePositiveNumber(
          input.maximumVehicleWeight,
          "Maksimum araç ağırlığı",
        )
      : undefined;

  const vehicleTypes = [
    ...new Set(
      (input.vehicleTypes ?? [])
        .map((value) =>
          value.trim(),
        )
        .filter(Boolean),
    ),
  ];

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    locationId: requireText(
      input.locationId,
      "Rampa lokasyonu",
    ),
    code: normalizeCode(
      input.code,
      "Rampa kodu",
    ),
    name: requireText(
      input.name,
      "Rampa adı",
    ),
    vehicleTypes,
    temperatureControlled:
      input.temperatureControlled ??
      false,
    hazardousMaterialAllowed:
      input.hazardousMaterialAllowed ??
      false,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(maximumVehicleHeight !==
    undefined
      ? { maximumVehicleHeight }
      : {}),
    ...(maximumVehicleWeight !==
    undefined
      ? { maximumVehicleWeight }
      : {}),
  };
}

export function validateCreateShippingTask(
  input: CreateShippingTaskInput,
): CreateShippingTaskInput {
  const shippingItemId =
    normalizeOptionalText(
      input.shippingItemId,
    );

  const shippingPackageId =
    normalizeOptionalText(
      input.shippingPackageId,
    );

  const dockId =
    normalizeOptionalText(
      input.dockId,
    );

  const vehicleId =
    normalizeOptionalText(
      input.vehicleId,
    );

  const assignedUserId =
    normalizeOptionalText(
      input.assignedUserId,
    );

  const assignedEquipmentId =
    normalizeOptionalText(
      input.assignedEquipmentId,
    );

  const plannedAt =
    input.plannedAt !== undefined
      ? normalizeIsoDate(
          input.plannedAt,
          "Planlanan görev tarihi",
        )
      : undefined;

  const notes =
    normalizeOptionalText(
      input.notes,
    );

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    shippingId: requireText(
      input.shippingId,
      "Sevkiyat kimliği",
    ),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    shippingLocationId:
      requireText(
        input.shippingLocationId,
        "Sevkiyat lokasyonu",
      ),
    type: input.type,
    priority:
      validateIntegerRange(
        input.priority ?? 50,
        "Görev önceliği",
        1,
        100,
      ),
    sequence:
      validateIntegerRange(
        input.sequence ?? 1,
        "Görev sırası",
        1,
        1_000_000,
      ),
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(shippingItemId !== undefined
      ? { shippingItemId }
      : {}),
    ...(shippingPackageId !==
    undefined
      ? { shippingPackageId }
      : {}),
    ...(dockId !== undefined
      ? { dockId }
      : {}),
    ...(vehicleId !== undefined
      ? { vehicleId }
      : {}),
    ...(assignedUserId !== undefined
      ? { assignedUserId }
      : {}),
    ...(assignedEquipmentId !==
    undefined
      ? { assignedEquipmentId }
      : {}),
    ...(plannedAt !== undefined
      ? { plannedAt }
      : {}),
    ...(notes !== undefined
      ? { notes }
      : {}),
  };
}

export function validateCreateShippingManifest(
  input: CreateShippingManifestInput,
): CreateShippingManifestInput {
  const carrierId =
    normalizeOptionalText(
      input.carrierId,
    );

  const serviceLevelId =
    normalizeOptionalText(
      input.serviceLevelId,
    );

  const vehicleId =
    normalizeOptionalText(
      input.vehicleId,
    );

  const notes =
    normalizeOptionalText(
      input.notes,
    );

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    shippingId: requireText(
      input.shippingId,
      "Sevkiyat kimliği",
    ),
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(carrierId !== undefined
      ? { carrierId }
      : {}),
    ...(serviceLevelId !== undefined
      ? { serviceLevelId }
      : {}),
    ...(vehicleId !== undefined
      ? { vehicleId }
      : {}),
    ...(notes !== undefined
      ? { notes }
      : {}),
  };
}

export function validateCreateShippingAsn(
  input: CreateShippingAsnInput,
): CreateShippingAsnInput {
  const senderCode =
    normalizeOptionalText(
      input.senderCode,
    );

  const receiverCode =
    normalizeOptionalText(
      input.receiverCode,
    );

  const notes =
    normalizeOptionalText(
      input.notes,
    );

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    shippingId: requireText(
      input.shippingId,
      "Sevkiyat kimliği",
    ),
    format: input.format ?? "json",
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(senderCode !== undefined
      ? { senderCode }
      : {}),
    ...(receiverCode !== undefined
      ? { receiverCode }
      : {}),
    ...(notes !== undefined
      ? { notes }
      : {}),
  };
}

export function validateCreateShippingTrackingEvent(
  input: CreateShippingTrackingEventInput,
): CreateShippingTrackingEventInput {
  const shippingPackageId =
    normalizeOptionalText(
      input.shippingPackageId,
    );

  const trackingNumber =
    normalizeOptionalText(
      input.trackingNumber,
    );

  const locationName =
    normalizeOptionalText(
      input.locationName,
    );

  const city =
    normalizeOptionalText(
      input.city,
    );

  const countryCode =
    input.countryCode !== undefined
      ? normalizeCountryCode(
          input.countryCode,
        )
      : undefined;

  const externalEventCode =
    normalizeOptionalText(
      input.externalEventCode,
    );

  const latitude =
    input.latitude !== undefined
      ? validateLatitude(input.latitude)
      : undefined;

  const longitude =
    input.longitude !== undefined
      ? validateLongitude(
          input.longitude,
        )
      : undefined;

  if (
    (latitude === undefined) !==
    (longitude === undefined)
  ) {
    throw new InventoryValidationError(
      "Takip olayı için enlem ve boylam birlikte verilmelidir.",
    );
  }

  const occurredAt =
    input.occurredAt !== undefined
      ? normalizeIsoDate(
          input.occurredAt,
          "Takip olayı tarihi",
        )
      : undefined;

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    shippingId: requireText(
      input.shippingId,
      "Sevkiyat kimliği",
    ),
    type: input.type,
    message: requireText(
      input.message,
      "Takip olayı mesajı",
    ),
    source: input.source ?? "system",
    ...(shippingPackageId !==
    undefined
      ? { shippingPackageId }
      : {}),
    ...(trackingNumber !== undefined
      ? { trackingNumber }
      : {}),
    ...(locationName !== undefined
      ? { locationName }
      : {}),
    ...(city !== undefined
      ? { city }
      : {}),
    ...(countryCode !== undefined
      ? { countryCode }
      : {}),
    ...(latitude !== undefined
      ? { latitude }
      : {}),
    ...(longitude !== undefined
      ? { longitude }
      : {}),
    ...(externalEventCode !== undefined
      ? { externalEventCode }
      : {}),
    ...(occurredAt !== undefined
      ? { occurredAt }
      : {}),
  };
}

export function validateCreateShippingProofOfDelivery(
  input: CreateShippingProofOfDeliveryInput,
): CreateShippingProofOfDeliveryInput {
  const recipientIdentityNumber =
    normalizeOptionalText(
      input.recipientIdentityNumber,
    );

  const recipientPhone =
    normalizePhone(
      input.recipientPhone,
    );

  const signatureUrl =
    normalizeUrl(
      input.signatureUrl,
      "İmza dosyası adresi",
    );

  const photoUrls = (
    input.photoUrls ?? []
  ).map((url, index) => {
    const normalized =
      normalizeUrl(
        url,
        `${index + 1}. teslimat fotoğrafı adresi`,
      );

    if (normalized === undefined) {
      throw new InventoryValidationError(
        "Teslimat fotoğrafı adresi boş bırakılamaz.",
      );
    }

    return normalized;
  });

  const documentUrls = (
    input.documentUrls ?? []
  ).map((url, index) => {
    const normalized =
      normalizeUrl(
        url,
        `${index + 1}. teslimat belgesi adresi`,
      );

    if (normalized === undefined) {
      throw new InventoryValidationError(
        "Teslimat belgesi adresi boş bırakılamaz.",
      );
    }

    return normalized;
  });

  const latitude =
    input.latitude !== undefined
      ? validateLatitude(input.latitude)
      : undefined;

  const longitude =
    input.longitude !== undefined
      ? validateLongitude(
          input.longitude,
        )
      : undefined;

  if (
    (latitude === undefined) !==
    (longitude === undefined)
  ) {
    throw new InventoryValidationError(
      "Teslimat kanıtı için enlem ve boylam birlikte verilmelidir.",
    );
  }

  const deliveryAddress =
    normalizeOptionalText(
      input.deliveryAddress,
    );

  const deliveredAt =
    input.deliveredAt !== undefined
      ? normalizeIsoDate(
          input.deliveredAt,
          "Teslim tarihi",
        )
      : undefined;

  const notes =
    normalizeOptionalText(
      input.notes,
    );

  if (
    signatureUrl === undefined &&
    photoUrls.length === 0 &&
    documentUrls.length === 0
  ) {
    throw new InventoryValidationError(
      "Teslimat kanıtı için imza, fotoğraf veya belge bilgilerinden en az biri gereklidir.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    shippingId: requireText(
      input.shippingId,
      "Sevkiyat kimliği",
    ),
    recipientName:
      requireText(
        input.recipientName,
        "Teslim alan kişi",
      ),
    photoUrls,
    documentUrls,
    capturedBy: requireText(
      input.capturedBy,
      "Teslimat kanıtını kaydeden kullanıcı",
    ),
    ...(recipientIdentityNumber !==
    undefined
      ? { recipientIdentityNumber }
      : {}),
    ...(recipientPhone !== undefined
      ? { recipientPhone }
      : {}),
    ...(signatureUrl !== undefined
      ? { signatureUrl }
      : {}),
    ...(latitude !== undefined
      ? { latitude }
      : {}),
    ...(longitude !== undefined
      ? { longitude }
      : {}),
    ...(deliveryAddress !== undefined
      ? { deliveryAddress }
      : {}),
    ...(deliveredAt !== undefined
      ? { deliveredAt }
      : {}),
    ...(notes !== undefined
      ? { notes }
      : {}),
  };
}
