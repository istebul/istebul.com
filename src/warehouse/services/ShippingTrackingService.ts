import type {
  Shipping,
} from "../types/Shipping";
import type {
  ShippingPackage,
} from "../types/ShippingPackage";
import type {
  CreateShippingTrackingEventInput,
  ShippingTrackingEvent,
  ShippingTrackingEventType,
} from "../types/ShippingTracking";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  ShippingRepository,
} from "./ShippingRepository";
import {
  validateCreateShippingTrackingEvent,
} from "./ShippingValidator";

export interface ShippingTrackingServiceDependencies {
  repository: ShippingRepository;
  createId?: () => string;
  now?: () => string;
}

export interface CreateCarrierTrackingEventInput {
  tenantId: string;
  shippingId: string;
  externalEventCode: string;
  message?: string;
  shippingPackageId?: string;
  trackingNumber?: string;
  locationName?: string;
  city?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  occurredAt?: string;
}

export interface ShippingTrackingSummary {
  readonly shippingId: string;
  readonly currentStatus: Shipping["status"];
  readonly trackingNumber?: string;
  readonly lastEvent?: ShippingTrackingEvent;
  readonly events: readonly ShippingTrackingEvent[];
}

const EXTERNAL_EVENT_CODE_MAP: Readonly<
  Record<string, ShippingTrackingEventType>
> = {
  created: "shipment_created",
  shipment_created: "shipment_created",
  released: "released",
  ready: "loading_ready",
  loading_ready: "loading_ready",
  loading_started: "loading_started",
  package_loaded: "package_loaded",
  vehicle_loaded: "vehicle_loaded",
  dispatched: "dispatched",
  shipped: "dispatched",
  carrier_received: "carrier_received",
  picked_up: "carrier_received",
  in_transit: "in_transit",
  transit: "in_transit",
  transfer_center: "transfer_center",
  hub: "transfer_center",
  out_for_delivery: "out_for_delivery",
  delivery_attempted: "delivery_attempted",
  delivered: "delivered",
  delivery_failed: "delivery_failed",
  failed: "delivery_failed",
  returned: "returned",
  return_to_sender: "returned",
  exception: "exception",
};

const DEFAULT_TRACKING_MESSAGES: Readonly<
  Record<ShippingTrackingEventType, string>
> = {
  shipment_created: "Sevkiyat oluşturuldu.",
  released: "Sevkiyat operasyona açıldı.",
  loading_ready: "Sevkiyat yüklemeye hazır.",
  loading_started: "Yükleme başladı.",
  package_loaded: "Paket araca yüklendi.",
  vehicle_loaded: "Araç yüklemesi tamamlandı.",
  dispatched: "Araç çıkışı yapıldı.",
  carrier_received: "Taşıyıcı sevkiyatı teslim aldı.",
  in_transit: "Sevkiyat taşımada.",
  transfer_center: "Sevkiyat transfer merkezinde.",
  out_for_delivery: "Sevkiyat dağıtıma çıktı.",
  delivery_attempted: "Teslimat denemesi yapıldı.",
  delivered: "Sevkiyat teslim edildi.",
  delivery_failed: "Teslimat başarısız oldu.",
  returned: "Sevkiyat iade edildi.",
  exception: "Sevkiyat istisnası oluştu.",
};

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

function normalizeExternalCode(
  value: string,
): string {
  return requireText(
    value,
    "Taşıyıcı olay kodu",
  )
    .toLocaleLowerCase("tr-TR")
    .replace(/[\s.-]+/g, "_");
}

export class ShippingTrackingService {
  private readonly repository:
    ShippingRepository;

  private readonly createId:
    () => string;

  private readonly now:
    () => string;

  constructor(
    dependencies:
      ShippingTrackingServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

    this.createId =
      dependencies.createId ??
      (() => crypto.randomUUID());

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());
  }

  async createEvent(
    input: CreateShippingTrackingEventInput,
  ): Promise<ShippingTrackingEvent> {
    const normalized =
      validateCreateShippingTrackingEvent(
        input,
      );

    const shipping =
      await this.getShipping(
        normalized.tenantId,
        normalized.shippingId,
      );

    if (
      shipping.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "İptal edilmiş sevkiyat için takip olayı oluşturulamaz.",
      );
    }

    const occurredAt =
      normalized.occurredAt ??
      this.now();

    const events =
      await this.repository
        .listTrackingEvents(
          shipping.tenantId,
          shipping.id,
        );

    const duplicate =
      events.find(
        (event) =>
          event.type ===
            normalized.type &&
          event.shippingPackageId ===
            normalized
              .shippingPackageId &&
          event.externalEventCode ===
            normalized
              .externalEventCode &&
          event.occurredAt ===
            occurredAt,
      );

    if (duplicate) {
      throw new InventoryValidationError(
        "Aynı sevkiyat takip olayı daha önce kaydedilmiş.",
      );
    }

    let shippingPackage:
      ShippingPackage | undefined;

    if (
      normalized.shippingPackageId !==
      undefined
    ) {
      shippingPackage =
        await this.getPackage(
          shipping.tenantId,
          shipping.id,
          normalized.shippingPackageId,
        );
    }

    const event =
      await this.repository
        .saveTrackingEvent({
          id: this.createId(),
          tenantId:
            shipping.tenantId,
          shippingId:
            shipping.id,
          type: normalized.type,
          message:
            normalized.message,
          source:
            normalized.source ??
            "system",
          occurredAt,
          createdAt: this.now(),
          ...(normalized
            .shippingPackageId !==
          undefined
            ? {
                shippingPackageId:
                  normalized
                    .shippingPackageId,
              }
            : {}),
          ...(normalized
            .trackingNumber !==
          undefined
            ? {
                trackingNumber:
                  normalized
                    .trackingNumber,
              }
            : {}),
          ...(normalized.locationName !==
          undefined
            ? {
                locationName:
                  normalized.locationName,
              }
            : {}),
          ...(normalized.city !==
          undefined
            ? {
                city:
                  normalized.city,
              }
            : {}),
          ...(normalized.countryCode !==
          undefined
            ? {
                countryCode:
                  normalized.countryCode,
              }
            : {}),
          ...(normalized.latitude !==
          undefined
            ? {
                latitude:
                  normalized.latitude,
              }
            : {}),
          ...(normalized.longitude !==
          undefined
            ? {
                longitude:
                  normalized.longitude,
              }
            : {}),
          ...(normalized
            .externalEventCode !==
          undefined
            ? {
                externalEventCode:
                  normalized
                    .externalEventCode,
              }
            : {}),
        });

    if (shippingPackage !== undefined) {
      await this.updatePackageFromEvent(
        shippingPackage,
        event,
      );
    }

    await this.updateShippingFromEvent(
      shipping,
      event,
    );

    return event;
  }

  async createCarrierEvent(
    input: CreateCarrierTrackingEventInput,
  ): Promise<ShippingTrackingEvent> {
    const externalEventCode =
      normalizeExternalCode(
        input.externalEventCode,
      );

    const type =
      EXTERNAL_EVENT_CODE_MAP[
        externalEventCode
      ];

    if (type === undefined) {
      throw new InventoryValidationError(
        `Taşıyıcı olay kodu desteklenmiyor: ${input.externalEventCode}`,
      );
    }

    const message =
      input.message?.trim() ||
      DEFAULT_TRACKING_MESSAGES[type];

    return this.createEvent({
      tenantId: input.tenantId,
      shippingId: input.shippingId,
      type,
      message,
      source: "carrier",
      externalEventCode,
      ...(input.shippingPackageId !==
      undefined
        ? {
            shippingPackageId:
              input.shippingPackageId,
          }
        : {}),
      ...(input.trackingNumber !==
      undefined
        ? {
            trackingNumber:
              input.trackingNumber,
          }
        : {}),
      ...(input.locationName !==
      undefined
        ? {
            locationName:
              input.locationName,
          }
        : {}),
      ...(input.city !== undefined
        ? { city: input.city }
        : {}),
      ...(input.countryCode !==
      undefined
        ? {
            countryCode:
              input.countryCode,
          }
        : {}),
      ...(input.latitude !== undefined
        ? {
            latitude:
              input.latitude,
          }
        : {}),
      ...(input.longitude !== undefined
        ? {
            longitude:
              input.longitude,
          }
        : {}),
      ...(input.occurredAt !== undefined
        ? {
            occurredAt:
              input.occurredAt,
          }
        : {}),
    });
  }

  async getSummary(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingTrackingSummary> {
    const shipping =
      await this.getShipping(
        tenantId,
        shippingId,
      );

    const events =
      await this.repository
        .listTrackingEvents(
          shipping.tenantId,
          shipping.id,
        );

    const lastEvent =
      events.at(-1);

    return {
      shippingId: shipping.id,
      currentStatus:
        shipping.status,
      events,
      ...(shipping.trackingNumber !==
      undefined
        ? {
            trackingNumber:
              shipping.trackingNumber,
          }
        : {}),
      ...(lastEvent !== undefined
        ? { lastEvent }
        : {}),
    };
  }

  async list(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingTrackingEvent[]> {
    const shipping =
      await this.getShipping(
        tenantId,
        shippingId,
      );

    return this.repository
      .listTrackingEvents(
        shipping.tenantId,
        shipping.id,
      );
  }

  mapExternalEventCode(
    externalEventCode: string,
  ): ShippingTrackingEventType {
    const normalized =
      normalizeExternalCode(
        externalEventCode,
      );

    const type =
      EXTERNAL_EVENT_CODE_MAP[
        normalized
      ];

    if (type === undefined) {
      throw new InventoryValidationError(
        `Taşıyıcı olay kodu desteklenmiyor: ${externalEventCode}`,
      );
    }

    return type;
  }

  private async getShipping(
    tenantId: string,
    shippingId: string,
  ): Promise<Shipping> {
    const normalizedTenantId =
      requireText(
        tenantId,
        "Firma kimliği",
      );

    const normalizedShippingId =
      requireText(
        shippingId,
        "Sevkiyat kimliği",
      );

    const shipping =
      await this.repository.findById(
        normalizedTenantId,
        normalizedShippingId,
      );

    if (!shipping) {
      throw new InventoryValidationError(
        `Sevkiyat kaydı bulunamadı: ${shippingId}`,
      );
    }

    return shipping;
  }

  private async getPackage(
    tenantId: string,
    shippingId: string,
    shippingPackageId: string,
  ): Promise<ShippingPackage> {
    const packages =
      await this.repository
        .listPackages(
          tenantId,
          shippingId,
        );

    const shippingPackage =
      packages.find(
        (current) =>
          current.id ===
          shippingPackageId,
      );

    if (!shippingPackage) {
      throw new InventoryValidationError(
        `Sevkiyat paketi bulunamadı: ${shippingPackageId}`,
      );
    }

    return shippingPackage;
  }

  private async updateShippingFromEvent(
    shipping: Shipping,
    event: ShippingTrackingEvent,
  ): Promise<void> {
    const timestamp =
      event.occurredAt;

    switch (event.type) {
      case "shipment_created":
        return;

      case "released":
        await this.repository.save({
          ...shipping,
          status: "released",
          releasedAt:
            shipping.releasedAt ??
            timestamp,
          updatedAt: this.now(),
        });
        return;

      case "loading_ready":
        await this.repository.save({
          ...shipping,
          status: "loading_ready",
          loadingReadyAt:
            shipping.loadingReadyAt ??
            timestamp,
          updatedAt: this.now(),
        });
        return;

      case "loading_started":
      case "package_loaded":
        await this.repository.save({
          ...shipping,
          status: "loading",
          loadingStartedAt:
            shipping.loadingStartedAt ??
            timestamp,
          updatedAt: this.now(),
        });
        return;

      case "vehicle_loaded":
        await this.repository.save({
          ...shipping,
          status: "loaded",
          loadedAt:
            shipping.loadedAt ??
            timestamp,
          updatedAt: this.now(),
        });
        return;

      case "dispatched":
      case "carrier_received":
        await this.repository.save({
          ...shipping,
          status: "dispatched",
          dispatchedAt:
            shipping.dispatchedAt ??
            timestamp,
          updatedAt: this.now(),
          ...(event.trackingNumber !==
          undefined
            ? {
                trackingNumber:
                  event.trackingNumber,
              }
            : {}),
        });
        return;

      case "in_transit":
      case "transfer_center":
      case "out_for_delivery":
      case "delivery_attempted":
        await this.repository.save({
          ...shipping,
          status: "in_transit",
          inTransitAt:
            shipping.inTransitAt ??
            timestamp,
          updatedAt: this.now(),
          ...(event.trackingNumber !==
          undefined
            ? {
                trackingNumber:
                  event.trackingNumber,
              }
            : {}),
        });
        return;

      case "delivered":
        await this.repository.save({
          ...shipping,
          status: "delivered",
          deliveredAt: timestamp,
          actualDeliveryAt: timestamp,
          updatedAt: this.now(),
          ...(event.trackingNumber !==
          undefined
            ? {
                trackingNumber:
                  event.trackingNumber,
              }
            : {}),
        });
        return;

      case "delivery_failed":
        await this.repository.save({
          ...shipping,
          status: "delivery_failed",
          deliveryFailureReason:
            event.message,
          updatedAt: this.now(),
        });
        return;

      case "returned":
        await this.repository.save({
          ...shipping,
          status: "returned",
          updatedAt: this.now(),
        });
        return;

      case "exception":
        return;
    }
  }

  private async updatePackageFromEvent(
    shippingPackage: ShippingPackage,
    event: ShippingTrackingEvent,
  ): Promise<void> {
    const timestamp =
      event.occurredAt;

    switch (event.type) {
      case "loading_ready":
        await this.repository
          .savePackage({
            ...shippingPackage,
            status: "loading_ready",
            updatedAt: this.now(),
          });
        return;

      case "loading_started":
        await this.repository
          .savePackage({
            ...shippingPackage,
            status: "loading",
            updatedAt: this.now(),
          });
        return;

      case "package_loaded":
      case "vehicle_loaded":
        await this.repository
          .savePackage({
            ...shippingPackage,
            status: "loaded",
            loadedAt:
              shippingPackage.loadedAt ??
              timestamp,
            updatedAt: this.now(),
          });
        return;

      case "dispatched":
      case "carrier_received":
        await this.repository
          .savePackage({
            ...shippingPackage,
            status: "dispatched",
            dispatchedAt:
              shippingPackage
                .dispatchedAt ??
              timestamp,
            updatedAt: this.now(),
            ...(event.trackingNumber !==
            undefined
              ? {
                  trackingNumber:
                    event
                      .trackingNumber,
                }
              : {}),
          });
        return;

      case "in_transit":
      case "transfer_center":
      case "out_for_delivery":
      case "delivery_attempted":
        await this.repository
          .savePackage({
            ...shippingPackage,
            status: "in_transit",
            updatedAt: this.now(),
            ...(event.trackingNumber !==
            undefined
              ? {
                  trackingNumber:
                    event
                      .trackingNumber,
                }
              : {}),
          });
        return;

      case "delivered":
        await this.repository
          .savePackage({
            ...shippingPackage,
            status: "delivered",
            deliveredAt: timestamp,
            updatedAt: this.now(),
          });
        return;

      case "delivery_failed":
        await this.repository
          .savePackage({
            ...shippingPackage,
            status: "delivery_failed",
            updatedAt: this.now(),
          });
        return;

      case "returned":
        await this.repository
          .savePackage({
            ...shippingPackage,
            status: "returned",
            returnedAt: timestamp,
            updatedAt: this.now(),
          });
        return;

      case "shipment_created":
      case "released":
      case "exception":
        return;
    }
  }
}
