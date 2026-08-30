const SHIPPING_API =
  "/api/warehouse/shipping";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STRATEGIES = Object.freeze([
  "single_shipment",
  "multi_order",
  "consolidated",
  "direct_delivery",
  "cross_dock",
  "parcel",
  "less_than_truckload",
  "full_truckload",
  "milk_run",
  "route_optimized",
  "carrier_optimized",
  "cost_optimized",
  "service_level_optimized",
  "temperature_controlled",
  "hazardous_material"
]);

function uuid(
  value,
  label
) {
  const normalized =
    String(value || "")
      .trim()
      .toLowerCase();

  if (!UUID.test(normalized)) {
    throw new Error(
      `${label} geçerli bir UUID olmalıdır.`
    );
  }

  return normalized;
}

function timestamp(
  value,
  label
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value !== "string" ||
    !Number.isFinite(
      Date.parse(value)
    )
  ) {
    throw new Error(
      `${label} geçersizdir.`
    );
  }

  return value.trim();
}

export function buildShippingCreateFromPackingPayload(
  input
) {
  let priority = null;

  if (
    input?.priority !== undefined &&
    input?.priority !== null &&
    input?.priority !== ""
  ) {
    priority =
      Number(input.priority);

    if (
      !Number.isInteger(priority) ||
      priority < 1 ||
      priority > 100
    ) {
      throw new Error(
        "Sevkiyat önceliği 1 ile 100 arasında olmalıdır."
      );
    }
  }

  const strategy =
    String(
      input?.strategy ||
      "single_shipment"
    )
      .trim()
      .toLowerCase();

  if (!STRATEGIES.includes(strategy)) {
    throw new Error(
      "Sevkiyat stratejisi geçersizdir."
    );
  }

  const plannedAt =
    timestamp(
      input?.plannedAt,
      "Planlanan sevkiyat zamanı"
    );

  const expectedDeliveryAt =
    timestamp(
      input?.expectedDeliveryAt,
      "Beklenen teslimat zamanı"
    );

  let notes = null;

  if (
    input?.notes !== undefined &&
    input?.notes !== null &&
    input?.notes !== ""
  ) {
    if (
      typeof input.notes !== "string"
    ) {
      throw new Error(
        "Sevkiyat notu geçersizdir."
      );
    }

    notes =
      input.notes.trim();

    if (notes.length > 4000) {
      throw new Error(
        "Sevkiyat notu çok uzundur."
      );
    }

    notes ||= null;
  }

  return Object.freeze({
    packingId:
      uuid(
        input?.packingId,
        "Paketleme kimliği"
      ),

    shippingLocationId:
      uuid(
        input?.shippingLocationId,
        "Sevkiyat lokasyonu"
      ),

    strategy,

    ...(priority !== null
      ? { priority }
      : {}),

    ...(plannedAt
      ? { plannedAt }
      : {}),

    ...(expectedDeliveryAt
      ? { expectedDeliveryAt }
      : {}),

    ...(notes
      ? { notes }
      : {})
  });
}

export async function createShippingFromPacking(
  input
) {
  const accessToken =
    String(
      input?.accessToken ||
      ""
    ).trim();

  if (!accessToken) {
    throw new Error(
      "WarehouseIQ oturumu geçersiz veya süresi dolmuş."
    );
  }

  const accountId =
    uuid(
      input?.accountId,
      "Firma kimliği"
    );

  const generatedRequestId =
    input?.requestId ??
    globalThis.crypto
      ?.randomUUID?.();

  const requestId =
    uuid(
      generatedRequestId,
      "İstek kimliği"
    );

  const payload =
    buildShippingCreateFromPackingPayload(
      input
    );

  const fetchImpl =
    input?.fetchImpl ??
    fetch;

  const response =
    await fetchImpl(
      SHIPPING_API,
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",

          "Idempotency-Key":
            requestId
        },

        cache: "no-store",

        body:
          JSON.stringify({
            accountId,
            action:
              "create_from_packing",
            payload
          })
      }
    );

  let body = null;

  try {
    body =
      await response.json();
  } catch {
    body = null;
  }

  if (
    !response.ok ||
    body?.ok !== true
  ) {
    throw new Error(
      body?.error?.message ||
      body?.message ||
      "Sevkiyat oluşturulamadı."
    );
  }

  if (
    String(
      body.requestId || ""
    )
      .trim()
      .toLowerCase() !==
    requestId
  ) {
    throw new Error(
      "Sevkiyat servisi beklenmeyen istek kimliği döndürdü."
    );
  }

  if (
    body?.data?.action !==
      "create_from_packing"
  ) {
    throw new Error(
      "Sevkiyat servisi geçerli sonuç döndürmedi."
    );
  }

  return Object.freeze({
    requestId,
    data:
      body.data
  });
}

const EXCEPTION_TYPES = Object.freeze([
  "package_missing",
  "package_excess",
  "package_damaged",
  "package_not_ready",
  "package_label_missing",
  "package_sscc_mismatch",
  "weight_mismatch",
  "volume_exceeded",
  "vehicle_capacity_exceeded",
  "vehicle_not_available",
  "driver_not_available",
  "carrier_not_available",
  "carrier_service_unavailable",
  "dock_not_available",
  "dock_assignment_conflict",
  "loading_sequence_error",
  "manifest_mismatch",
  "asn_generation_failed",
  "tracking_number_missing",
  "temperature_mismatch",
  "hazardous_material_mismatch",
  "address_invalid",
  "dispatch_blocked",
  "delivery_failed",
  "proof_of_delivery_missing"
]);

const PHONE_RE = /^\+?[0-9()\s-]{7,25}$/;
const URL_RE = /^https?:\/\/\S+$/i;

function optionalUuid(value, label) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return uuid(value, label);
}

function requiredText(value, label, maxLength) {
  const text = String(value ?? "").trim();

  if (!text) {
    throw new Error(`${label} boş bırakılamaz.`);
  }

  if (maxLength && text.length > maxLength) {
    throw new Error(`${label} çok uzundur.`);
  }

  return text;
}

function optionalText(value, label, maxLength) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`${label} geçersizdir.`);
  }

  const text = value.trim();

  if (maxLength && text.length > maxLength) {
    throw new Error(`${label} çok uzundur.`);
  }

  return text || null;
}

function optionalUrl(value, label) {
  const text = optionalText(value, label);

  if (text && !URL_RE.test(text)) {
    throw new Error(`${label} geçerli bir HTTP veya HTTPS adresi olmalıdır.`);
  }

  return text;
}

function optionalUrlList(value, label) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${label} bir liste olmalıdır.`);
  }

  return value.map((item, index) => {
    const text = String(item ?? "").trim();

    if (!text) {
      throw new Error(`${index + 1}. ${label} boş bırakılamaz.`);
    }

    if (!URL_RE.test(text)) {
      throw new Error(
        `${index + 1}. ${label} geçerli bir HTTP veya HTTPS adresi olmalıdır.`
      );
    }

    return text;
  });
}

function resolveAuth(input) {
  const accessToken = String(input?.accessToken || "").trim();

  if (!accessToken) {
    throw new Error("WarehouseIQ oturumu geçersiz veya süresi dolmuş.");
  }

  const accountId = uuid(input?.accountId, "Firma kimliği");

  const generatedRequestId =
    input?.requestId ?? globalThis.crypto?.randomUUID?.();

  const requestId = uuid(generatedRequestId, "İstek kimliği");

  return { accessToken, accountId, requestId };
}

async function postShippingAction({
  action,
  accessToken,
  accountId,
  requestId,
  payload,
  fetchImpl
}) {
  const impl = fetchImpl ?? fetch;

  const response = await impl(SHIPPING_API, {
    method: "POST",

    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Idempotency-Key": requestId
    },

    cache: "no-store",

    body: JSON.stringify({
      accountId,
      action,
      payload
    })
  });

  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || body?.ok !== true) {
    throw new Error(
      body?.error?.message ||
        body?.message ||
        "Sevkiyat işlemi tamamlanamadı."
    );
  }

  if (
    String(body.requestId || "")
      .trim()
      .toLowerCase() !== requestId
  ) {
    throw new Error(
      "Sevkiyat servisi beklenmeyen istek kimliği döndürdü."
    );
  }

  if (body?.data?.action !== action) {
    throw new Error("Sevkiyat servisi geçerli sonuç döndürmedi.");
  }

  return Object.freeze({ requestId, data: body.data });
}

// ---------- send_asn ----------

export function buildShippingSendAsnPayload(input) {
  return Object.freeze({
    shippingId: uuid(input?.shippingId, "Sevkiyat kimliği"),
    asnId: uuid(input?.asnId, "ASN kimliği")
  });
}

export async function sendShippingAsn(input) {
  const { accessToken, accountId, requestId } = resolveAuth(input);
  const payload = buildShippingSendAsnPayload(input);

  return postShippingAction({
    action: "send_asn",
    accessToken,
    accountId,
    requestId,
    payload,
    fetchImpl: input?.fetchImpl
  });
}

// ---------- acknowledge_asn ----------

export function buildShippingAcknowledgeAsnPayload(input) {
  return Object.freeze({
    shippingId: uuid(input?.shippingId, "Sevkiyat kimliği"),
    asnId: uuid(input?.asnId, "ASN kimliği")
  });
}

export async function acknowledgeShippingAsn(input) {
  const { accessToken, accountId, requestId } = resolveAuth(input);
  const payload = buildShippingAcknowledgeAsnPayload(input);

  return postShippingAction({
    action: "acknowledge_asn",
    accessToken,
    accountId,
    requestId,
    payload,
    fetchImpl: input?.fetchImpl
  });
}

// ---------- reject_asn ----------

export function buildShippingRejectAsnPayload(input) {
  return Object.freeze({
    shippingId: uuid(input?.shippingId, "Sevkiyat kimliği"),
    asnId: uuid(input?.asnId, "ASN kimliği"),
    rejectionReason: requiredText(
      input?.rejectionReason,
      "ASN ret nedeni"
    )
  });
}

export async function rejectShippingAsn(input) {
  const { accessToken, accountId, requestId } = resolveAuth(input);
  const payload = buildShippingRejectAsnPayload(input);

  return postShippingAction({
    action: "reject_asn",
    accessToken,
    accountId,
    requestId,
    payload,
    fetchImpl: input?.fetchImpl
  });
}

// ---------- cancel_asn ----------

export function buildShippingCancelAsnPayload(input) {
  return Object.freeze({
    shippingId: uuid(input?.shippingId, "Sevkiyat kimliği"),
    asnId: uuid(input?.asnId, "ASN kimliği"),
    ...(optionalText(input?.cancellationReason, "İptal nedeni")
      ? { cancellationReason: optionalText(input?.cancellationReason, "İptal nedeni") }
      : {})
  });
}

export async function cancelShippingAsn(input) {
  const { accessToken, accountId, requestId } = resolveAuth(input);
  const payload = buildShippingCancelAsnPayload(input);

  return postShippingAction({
    action: "cancel_asn",
    accessToken,
    accountId,
    requestId,
    payload,
    fetchImpl: input?.fetchImpl
  });
}

// ---------- dispatch ----------

export function buildShippingDispatchPayload(input) {
  const trackingNumber = optionalText(
    input?.trackingNumber,
    "Takip numarası"
  );

  return Object.freeze({
    shippingId: uuid(input?.shippingId, "Sevkiyat kimliği"),
    dispatchedBy: requiredText(
      input?.dispatchedBy,
      "Araç çıkışını yapan kullanıcı"
    ),
    ...(trackingNumber ? { trackingNumber } : {})
  });
}

export async function dispatchShipping(input) {
  const { accessToken, accountId, requestId } = resolveAuth(input);
  const payload = buildShippingDispatchPayload(input);

  return postShippingAction({
    action: "dispatch",
    accessToken,
    accountId,
    requestId,
    payload,
    fetchImpl: input?.fetchImpl
  });
}

// ---------- record_proof_of_delivery ----------

export function buildShippingProofOfDeliveryPayload(input) {
  const recipientPhone = optionalText(
    input?.recipientPhone,
    "Telefon numarası"
  );

  if (recipientPhone && !PHONE_RE.test(recipientPhone)) {
    throw new Error("Telefon numarası geçerli biçimde olmalıdır.");
  }

  const signatureUrl = optionalUrl(
    input?.signatureUrl,
    "İmza dosyası adresi"
  );

  const photoUrls = optionalUrlList(
    input?.photoUrls,
    "teslimat fotoğrafı adresi"
  );

  const documentUrls = optionalUrlList(
    input?.documentUrls,
    "teslimat belgesi adresi"
  );

  const hasLatitude =
    input?.latitude !== undefined && input?.latitude !== null && input?.latitude !== "";
  const hasLongitude =
    input?.longitude !== undefined && input?.longitude !== null && input?.longitude !== "";

  if (hasLatitude !== hasLongitude) {
    throw new Error(
      "Teslimat kanıtı için enlem ve boylam birlikte verilmelidir."
    );
  }

  let latitude = null;
  let longitude = null;

  if (hasLatitude) {
    latitude = Number(input.latitude);
    longitude = Number(input.longitude);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new Error("Enlem -90 ile 90 arasında olmalıdır.");
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new Error("Boylam -180 ile 180 arasında olmalıdır.");
    }
  }

  if (
    !signatureUrl &&
    photoUrls.length === 0 &&
    documentUrls.length === 0
  ) {
    throw new Error(
      "Teslimat kanıtı için imza, fotoğraf veya belge bilgilerinden en az biri gereklidir."
    );
  }

  const deliveredAt = timestamp(input?.deliveredAt, "Teslimat zamanı");
  const deliveryAddress = optionalText(
    input?.deliveryAddress,
    "Teslimat adresi"
  );
  const notes = optionalText(input?.notes, "Not", 4000);

  return Object.freeze({
    shippingId: uuid(input?.shippingId, "Sevkiyat kimliği"),
    recipientName: requiredText(input?.recipientName, "Teslim alan kişi"),
    capturedBy: requiredText(
      input?.capturedBy,
      "Teslimat kanıtını kaydeden kullanıcı"
    ),
    ...(optionalText(input?.recipientIdentityNumber, "Kimlik numarası")
      ? { recipientIdentityNumber: optionalText(input?.recipientIdentityNumber, "Kimlik numarası") }
      : {}),
    ...(recipientPhone ? { recipientPhone } : {}),
    ...(signatureUrl ? { signatureUrl } : {}),
    photoUrls,
    documentUrls,
    ...(hasLatitude ? { latitude, longitude } : {}),
    ...(deliveryAddress ? { deliveryAddress } : {}),
    ...(deliveredAt ? { deliveredAt } : {}),
    ...(notes ? { notes } : {})
  });
}

export async function recordShippingProofOfDelivery(input) {
  const { accessToken, accountId, requestId } = resolveAuth(input);
  const payload = buildShippingProofOfDeliveryPayload(input);

  return postShippingAction({
    action: "record_proof_of_delivery",
    accessToken,
    accountId,
    requestId,
    payload,
    fetchImpl: input?.fetchImpl
  });
}

// ---------- create_exception ----------

export function buildShippingCreateExceptionPayload(input) {
  const type = String(input?.type || "").trim().toLowerCase();

  if (!EXCEPTION_TYPES.includes(type)) {
    throw new Error("Sevkiyat istisnası türü geçersizdir.");
  }

  return Object.freeze({
    shippingId: uuid(input?.shippingId, "Sevkiyat kimliği"),
    type,
    message: requiredText(input?.message, "Sevkiyat istisnası açıklaması"),
    shippingItemId: optionalUuid(input?.shippingItemId, "Sevkiyat satırı kimliği"),
    shippingPackageId: optionalUuid(input?.shippingPackageId, "Sevkiyat paketi kimliği"),
    taskId: optionalUuid(input?.taskId, "Görev kimliği"),
    manifestId: optionalUuid(input?.manifestId, "Manifest kimliği"),
    dockId: optionalUuid(input?.dockId, "Rampa kimliği"),
    vehicleId: optionalUuid(input?.vehicleId, "Araç kimliği"),
    carrierId: optionalUuid(input?.carrierId, "Taşıyıcı kimliği")
  });
}

export async function createShippingException(input) {
  const { accessToken, accountId, requestId } = resolveAuth(input);
  const payload = buildShippingCreateExceptionPayload(input);

  return postShippingAction({
    action: "create_exception",
    accessToken,
    accountId,
    requestId,
    payload,
    fetchImpl: input?.fetchImpl
  });
}

// ---------- resolve_exception ----------

export function buildShippingResolveExceptionPayload(input) {
  return Object.freeze({
    shippingId: uuid(input?.shippingId, "Sevkiyat kimliği"),
    exceptionId: uuid(input?.exceptionId, "Sevkiyat istisnası kimliği"),
    resolvedBy: requiredText(input?.resolvedBy, "İstisnayı çözen kullanıcı"),
    resolutionNotes: requiredText(input?.resolutionNotes, "Çözüm açıklaması")
  });
}

export async function resolveShippingException(input) {
  const { accessToken, accountId, requestId } = resolveAuth(input);
  const payload = buildShippingResolveExceptionPayload(input);

  return postShippingAction({
    action: "resolve_exception",
    accessToken,
    accountId,
    requestId,
    payload,
    fetchImpl: input?.fetchImpl
  });
}

const MANIFEST_ASN_FORMATS = Object.freeze([
  "json",
  "xml",
  "edi",
  "edifact",
  "custom"
]);

// ---------- start_loading ----------

export function buildShippingStartLoadingPayload(input) {
  return Object.freeze({
    shippingId: uuid(input?.shippingId, "Sevkiyat kimliği")
  });
}

export async function startShippingLoading(input) {
  const { accessToken, accountId, requestId } = resolveAuth(input);
  const payload = buildShippingStartLoadingPayload(input);

  return postShippingAction({
    action: "start_loading",
    accessToken,
    accountId,
    requestId,
    payload,
    fetchImpl: input?.fetchImpl
  });
}

// ---------- confirm_item_load ----------

export function buildShippingConfirmItemLoadPayload(input) {
  const quantity = Number(input?.quantity);

  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error("Yüklenen miktar geçerli ve negatif olmayan bir sayı olmalıdır.");
  }

  const damagedQuantity = Number(input?.damagedQuantity ?? 0);
  const missingQuantity = Number(input?.missingQuantity ?? 0);

  if (!Number.isFinite(damagedQuantity) || damagedQuantity < 0) {
    throw new Error("Hasarlı miktar geçerli ve negatif olmayan bir sayı olmalıdır.");
  }

  if (!Number.isFinite(missingQuantity) || missingQuantity < 0) {
    throw new Error("Eksik miktar geçerli ve negatif olmayan bir sayı olmalıdır.");
  }

  if (quantity === 0 && damagedQuantity === 0 && missingQuantity === 0) {
    throw new Error(
      "Yüklenen, hasarlı veya eksik miktarlardan en az biri sıfırdan büyük olmalıdır."
    );
  }

  const notes = optionalText(input?.notes, "Not", 4000);
  const shippingPackageId = optionalUuid(
    input?.shippingPackageId,
    "Sevkiyat paketi kimliği"
  );

  return Object.freeze({
    shippingId: uuid(input?.shippingId, "Sevkiyat kimliği"),
    shippingItemId: uuid(input?.shippingItemId, "Sevkiyat satırı kimliği"),
    ...(shippingPackageId ? { shippingPackageId } : {}),
    quantity,
    ...(damagedQuantity ? { damagedQuantity } : {}),
    ...(missingQuantity ? { missingQuantity } : {}),
    loadedBy: requiredText(input?.loadedBy, "Yüklemeyi yapan kullanıcı"),
    ...(notes ? { notes } : {})
  });
}

export async function confirmShippingItemLoad(input) {
  const { accessToken, accountId, requestId } = resolveAuth(input);
  const payload = buildShippingConfirmItemLoadPayload(input);

  return postShippingAction({
    action: "confirm_item_load",
    accessToken,
    accountId,
    requestId,
    payload,
    fetchImpl: input?.fetchImpl
  });
}

// ---------- load_package ----------

export function buildShippingLoadPackagePayload(input) {
  return Object.freeze({
    shippingId: uuid(input?.shippingId, "Sevkiyat kimliği"),
    shippingPackageId: uuid(input?.shippingPackageId, "Sevkiyat paketi kimliği"),
    loadedBy: requiredText(input?.loadedBy, "Yüklemeyi yapan kullanıcı")
  });
}

export async function loadShippingPackageOnVehicle(input) {
  const { accessToken, accountId, requestId } = resolveAuth(input);
  const payload = buildShippingLoadPackagePayload(input);

  return postShippingAction({
    action: "load_package",
    accessToken,
    accountId,
    requestId,
    payload,
    fetchImpl: input?.fetchImpl
  });
}

// ---------- complete_loading ----------

export function buildShippingCompleteLoadingPayload(input) {
  return Object.freeze({
    shippingId: uuid(input?.shippingId, "Sevkiyat kimliği")
  });
}

export async function completeShippingLoading(input) {
  const { accessToken, accountId, requestId } = resolveAuth(input);
  const payload = buildShippingCompleteLoadingPayload(input);

  return postShippingAction({
    action: "complete_loading",
    accessToken,
    accountId,
    requestId,
    payload,
    fetchImpl: input?.fetchImpl
  });
}

// ---------- create_manifest ----------

export function buildShippingCreateManifestPayload(input) {
  const notes = optionalText(input?.notes, "Not", 4000);

  return Object.freeze({
    shippingId: uuid(input?.shippingId, "Sevkiyat kimliği"),
    ...(notes ? { notes } : {})
  });
}

export async function createShippingManifest(input) {
  const { accessToken, accountId, requestId } = resolveAuth(input);
  const payload = buildShippingCreateManifestPayload(input);

  return postShippingAction({
    action: "create_manifest",
    accessToken,
    accountId,
    requestId,
    payload,
    fetchImpl: input?.fetchImpl
  });
}

// ---------- generate_manifest ----------

export function buildShippingGenerateManifestPayload(input) {
  return Object.freeze({
    shippingId: uuid(input?.shippingId, "Sevkiyat kimliği"),
    manifestId: uuid(input?.manifestId, "Manifest kimliği"),
    generatedBy: requiredText(input?.generatedBy, "Manifesti oluşturan kullanıcı")
  });
}

export async function generateShippingManifest(input) {
  const { accessToken, accountId, requestId } = resolveAuth(input);
  const payload = buildShippingGenerateManifestPayload(input);

  return postShippingAction({
    action: "generate_manifest",
    accessToken,
    accountId,
    requestId,
    payload,
    fetchImpl: input?.fetchImpl
  });
}

// ---------- approve_manifest ----------

export function buildShippingApproveManifestPayload(input) {
  return Object.freeze({
    shippingId: uuid(input?.shippingId, "Sevkiyat kimliği"),
    manifestId: uuid(input?.manifestId, "Manifest kimliği"),
    approvedBy: requiredText(input?.approvedBy, "Manifesti onaylayan kullanıcı")
  });
}

export async function approveShippingManifest(input) {
  const { accessToken, accountId, requestId } = resolveAuth(input);
  const payload = buildShippingApproveManifestPayload(input);

  return postShippingAction({
    action: "approve_manifest",
    accessToken,
    accountId,
    requestId,
    payload,
    fetchImpl: input?.fetchImpl
  });
}

// ---------- submit_manifest ----------

export function buildShippingSubmitManifestPayload(input) {
  return Object.freeze({
    shippingId: uuid(input?.shippingId, "Sevkiyat kimliği"),
    manifestId: uuid(input?.manifestId, "Manifest kimliği")
  });
}

export async function submitShippingManifest(input) {
  const { accessToken, accountId, requestId } = resolveAuth(input);
  const payload = buildShippingSubmitManifestPayload(input);

  return postShippingAction({
    action: "submit_manifest",
    accessToken,
    accountId,
    requestId,
    payload,
    fetchImpl: input?.fetchImpl
  });
}

// ---------- create_asn ----------

export function buildShippingCreateAsnPayload(input) {
  const format = String(input?.format || "json").trim().toLowerCase();

  if (!MANIFEST_ASN_FORMATS.includes(format)) {
    throw new Error("ASN biçimi geçersizdir.");
  }

  const senderCode = optionalText(input?.senderCode, "Gönderici kodu");
  const receiverCode = optionalText(input?.receiverCode, "Alıcı kodu");
  const notes = optionalText(input?.notes, "Not", 4000);

  return Object.freeze({
    shippingId: uuid(input?.shippingId, "Sevkiyat kimliği"),
    format,
    ...(senderCode ? { senderCode } : {}),
    ...(receiverCode ? { receiverCode } : {}),
    ...(notes ? { notes } : {})
  });
}

export async function createShippingAsn(input) {
  const { accessToken, accountId, requestId } = resolveAuth(input);
  const payload = buildShippingCreateAsnPayload(input);

  return postShippingAction({
    action: "create_asn",
    accessToken,
    accountId,
    requestId,
    payload,
    fetchImpl: input?.fetchImpl
  });
}

// ---------- generate_asn ----------

export function buildShippingGenerateAsnPayload(input) {
  return Object.freeze({
    shippingId: uuid(input?.shippingId, "Sevkiyat kimliği"),
    asnId: uuid(input?.asnId, "ASN kimliği"),
    generatedBy: requiredText(input?.generatedBy, "ASN oluşturan kullanıcı")
  });
}

export async function generateShippingAsn(input) {
  const { accessToken, accountId, requestId } = resolveAuth(input);
  const payload = buildShippingGenerateAsnPayload(input);

  return postShippingAction({
    action: "generate_asn",
    accessToken,
    accountId,
    requestId,
    payload,
    fetchImpl: input?.fetchImpl
  });
}
