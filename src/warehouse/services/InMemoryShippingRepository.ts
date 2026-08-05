import type {
  Shipping,
  ShippingListFilter,
} from "../types/Shipping";
import type {
  ShippingAsn,
} from "../types/ShippingAsn";
import type {
  ShippingCarrier,
} from "../types/ShippingCarrier";
import type {
  ShippingDock,
} from "../types/ShippingDock";
import type {
  ShippingException,
} from "../types/ShippingException";
import type {
  ShippingItem,
} from "../types/ShippingItem";
import type {
  ShippingManifest,
} from "../types/ShippingManifest";
import type {
  ShippingPackage,
} from "../types/ShippingPackage";
import type {
  ShippingProofOfDelivery,
} from "../types/ShippingProofOfDelivery";
import type {
  ShippingServiceLevel,
} from "../types/ShippingServiceLevel";
import type {
  ShippingSuggestion,
} from "../types/ShippingSuggestion";
import type {
  ShippingTask,
} from "../types/ShippingTask";
import type {
  ShippingTrackingEvent,
} from "../types/ShippingTracking";
import type {
  ShippingVehicle,
} from "../types/ShippingVehicle";
import type {
  ShippingRepository,
} from "./ShippingRepository";

export class InMemoryShippingRepository
  implements ShippingRepository
{
  private readonly shippings =
    new Map<string, Shipping>();

  private readonly packages =
    new Map<string, ShippingPackage>();

  private readonly tasks =
    new Map<string, ShippingTask>();

  private readonly exceptions =
    new Map<string, ShippingException>();

  private readonly manifests =
    new Map<string, ShippingManifest>();

  private readonly asns =
    new Map<string, ShippingAsn>();

  private readonly trackingEvents =
    new Map<string, ShippingTrackingEvent>();

  private readonly proofsOfDelivery =
    new Map<string, ShippingProofOfDelivery>();

  private readonly suggestions =
    new Map<string, ShippingSuggestion>();

  private readonly carriers =
    new Map<string, ShippingCarrier>();

  private readonly serviceLevels =
    new Map<string, ShippingServiceLevel>();

  private readonly vehicles =
    new Map<string, ShippingVehicle>();

  private readonly docks =
    new Map<string, ShippingDock>();

  async findById(
    tenantId: string,
    shippingId: string,
  ): Promise<Shipping | null> {
    const shipping =
      this.shippings.get(shippingId);

    if (
      !shipping ||
      shipping.tenantId !== tenantId
    ) {
      return null;
    }

    return structuredClone(shipping);
  }

  async findByNumber(
    tenantId: string,
    shippingNumber: string,
  ): Promise<Shipping | null> {
    for (
      const shipping
      of this.shippings.values()
    ) {
      if (
        shipping.tenantId === tenantId &&
        shipping.shippingNumber ===
          shippingNumber
      ) {
        return structuredClone(shipping);
      }
    }

    return null;
  }

  async findByPackingId(
    tenantId: string,
    packingId: string,
  ): Promise<Shipping | null> {
    for (
      const shipping
      of this.shippings.values()
    ) {
      if (
        shipping.tenantId === tenantId &&
        shipping.packingId === packingId
      ) {
        return structuredClone(shipping);
      }
    }

    return null;
  }

  async findByOrderId(
    tenantId: string,
    orderId: string,
  ): Promise<Shipping | null> {
    for (
      const shipping
      of this.shippings.values()
    ) {
      if (
        shipping.tenantId === tenantId &&
        shipping.orderId === orderId
      ) {
        return structuredClone(shipping);
      }
    }

    return null;
  }

  async findByReference(
    tenantId: string,
    referenceType: string,
    referenceId: string,
  ): Promise<Shipping | null> {
    for (
      const shipping
      of this.shippings.values()
    ) {
      if (
        shipping.tenantId === tenantId &&
        shipping.referenceType ===
          referenceType &&
        shipping.referenceId ===
          referenceId
      ) {
        return structuredClone(shipping);
      }
    }

    return null;
  }

  async list(
    filter: ShippingListFilter,
  ): Promise<Shipping[]> {
    const search = filter.search
      ?.trim()
      .toLocaleLowerCase("tr-TR");

    return [...this.shippings.values()]
      .filter(
        (shipping) =>
          shipping.tenantId ===
          filter.tenantId,
      )
      .filter(
        (shipping) =>
          filter.warehouseId ===
            undefined ||
          shipping.warehouseId ===
            filter.warehouseId,
      )
      .filter(
        (shipping) =>
          filter.shippingLocationId ===
            undefined ||
          shipping.shippingLocationId ===
            filter.shippingLocationId,
      )
      .filter(
        (shipping) =>
          filter.strategy === undefined ||
          shipping.strategy ===
            filter.strategy,
      )
      .filter(
        (shipping) =>
          filter.status === undefined ||
          shipping.status ===
            filter.status,
      )
      .filter(
        (shipping) =>
          filter.packingId === undefined ||
          shipping.packingId ===
            filter.packingId,
      )
      .filter(
        (shipping) =>
          filter.orderId === undefined ||
          shipping.orderId ===
            filter.orderId,
      )
      .filter(
        (shipping) =>
          filter.carrierId === undefined ||
          shipping.carrierId ===
            filter.carrierId,
      )
      .filter(
        (shipping) =>
          filter.serviceLevelId ===
            undefined ||
          shipping.serviceLevelId ===
            filter.serviceLevelId,
      )
      .filter(
        (shipping) =>
          filter.vehicleId === undefined ||
          shipping.vehicleId ===
            filter.vehicleId,
      )
      .filter(
        (shipping) =>
          filter.dockId === undefined ||
          shipping.dockId ===
            filter.dockId,
      )
      .filter(
        (shipping) =>
          filter.referenceType ===
            undefined ||
          shipping.referenceType ===
            filter.referenceType,
      )
      .filter(
        (shipping) =>
          filter.referenceId ===
            undefined ||
          shipping.referenceId ===
            filter.referenceId,
      )
      .filter((shipping) => {
        if (!search) {
          return true;
        }

        return (
          shipping.shippingNumber
            .toLocaleLowerCase("tr-TR")
            .includes(search) ||
          shipping.orderNumber
            ?.toLocaleLowerCase("tr-TR")
            .includes(search) === true ||
          shipping.referenceNumber
            ?.toLocaleLowerCase("tr-TR")
            .includes(search) === true ||
          shipping.trackingNumber
            ?.toLocaleLowerCase("tr-TR")
            .includes(search) === true ||
          shipping.driverName
            ?.toLocaleLowerCase("tr-TR")
            .includes(search) === true
        );
      })
      .sort((left, right) =>
        right.createdAt.localeCompare(
          left.createdAt,
        ),
      )
      .map((shipping) =>
        structuredClone(shipping),
      );
  }

  async save(
    shipping: Shipping,
  ): Promise<Shipping> {
    const stored =
      structuredClone(shipping);

    this.shippings.set(
      stored.id,
      stored,
    );

    return structuredClone(stored);
  }

  async saveItem(
    item: ShippingItem,
  ): Promise<ShippingItem> {
    const shipping =
      this.shippings.get(item.shippingId);

    if (
      !shipping ||
      shipping.tenantId !== item.tenantId
    ) {
      throw new Error(
        "Sevkiyat kaydı bulunamadı.",
      );
    }

    const items =
      shipping.items.filter(
        (current) =>
          current.id !== item.id,
      );

    items.push(structuredClone(item));

    items.sort(
      (left, right) =>
        left.lineNumber -
        right.lineNumber,
    );

    this.shippings.set(
      shipping.id,
      {
        ...shipping,
        items,
        updatedAt: item.updatedAt,
      },
    );

    return structuredClone(item);
  }

  async savePackage(
    shippingPackage: ShippingPackage,
  ): Promise<ShippingPackage> {
    const shipping =
      this.shippings.get(
        shippingPackage.shippingId,
      );

    if (
      !shipping ||
      shipping.tenantId !==
        shippingPackage.tenantId
    ) {
      throw new Error(
        "Sevkiyat kaydı bulunamadı.",
      );
    }

    const stored =
      structuredClone(shippingPackage);

    this.packages.set(
      stored.id,
      stored,
    );

    const packages =
      shipping.packages.filter(
        (current) =>
          current.id !== stored.id,
      );

    packages.push(
      structuredClone(stored),
    );

    packages.sort(
      (left, right) =>
        left.loadingSequence -
        right.loadingSequence,
    );

    this.shippings.set(
      shipping.id,
      {
        ...shipping,
        packages,
        updatedAt: stored.updatedAt,
      },
    );

    return structuredClone(stored);
  }

  async saveTask(
    task: ShippingTask,
  ): Promise<ShippingTask> {
    this.assertShippingExists(
      task.tenantId,
      task.shippingId,
    );

    const stored =
      structuredClone(task);

    this.tasks.set(
      stored.id,
      stored,
    );

    return structuredClone(stored);
  }

  async saveException(
    exception: ShippingException,
  ): Promise<ShippingException> {
    const shipping =
      this.assertShippingExists(
        exception.tenantId,
        exception.shippingId,
      );

    const stored =
      structuredClone(exception);

    this.exceptions.set(
      stored.id,
      stored,
    );

    const exceptions =
      shipping.exceptions.filter(
        (current) =>
          current.id !== stored.id,
      );

    exceptions.push(
      structuredClone(stored),
    );

    exceptions.sort(
      (left, right) =>
        left.createdAt.localeCompare(
          right.createdAt,
        ),
    );

    this.shippings.set(
      shipping.id,
      {
        ...shipping,
        exceptions,
      },
    );

    return structuredClone(stored);
  }

  async saveManifest(
    manifest: ShippingManifest,
  ): Promise<ShippingManifest> {
    this.assertShippingExists(
      manifest.tenantId,
      manifest.shippingId,
    );

    const stored =
      structuredClone(manifest);

    this.manifests.set(
      stored.id,
      stored,
    );

    return structuredClone(stored);
  }

  async saveAsn(
    asn: ShippingAsn,
  ): Promise<ShippingAsn> {
    this.assertShippingExists(
      asn.tenantId,
      asn.shippingId,
    );

    const stored =
      structuredClone(asn);

    this.asns.set(
      stored.id,
      stored,
    );

    return structuredClone(stored);
  }

  async saveTrackingEvent(
    event: ShippingTrackingEvent,
  ): Promise<ShippingTrackingEvent> {
    this.assertShippingExists(
      event.tenantId,
      event.shippingId,
    );

    const stored =
      structuredClone(event);

    this.trackingEvents.set(
      stored.id,
      stored,
    );

    return structuredClone(stored);
  }

  async saveProofOfDelivery(
    proofOfDelivery:
      ShippingProofOfDelivery,
  ): Promise<ShippingProofOfDelivery> {
    this.assertShippingExists(
      proofOfDelivery.tenantId,
      proofOfDelivery.shippingId,
    );

    const stored =
      structuredClone(proofOfDelivery);

    this.proofsOfDelivery.set(
      stored.id,
      stored,
    );

    return structuredClone(stored);
  }

  async saveSuggestion(
    suggestion: ShippingSuggestion,
  ): Promise<ShippingSuggestion> {
    this.assertShippingExists(
      suggestion.tenantId,
      suggestion.shippingId,
    );

    const stored =
      structuredClone(suggestion);

    this.suggestions.set(
      stored.id,
      stored,
    );

    return structuredClone(stored);
  }

  async saveCarrier(
    carrier: ShippingCarrier,
  ): Promise<ShippingCarrier> {
    const stored =
      structuredClone(carrier);

    this.carriers.set(
      stored.id,
      stored,
    );

    return structuredClone(stored);
  }

  async saveServiceLevel(
    serviceLevel: ShippingServiceLevel,
  ): Promise<ShippingServiceLevel> {
    const carrier =
      this.carriers.get(
        serviceLevel.carrierId,
      );

    if (
      !carrier ||
      carrier.tenantId !==
        serviceLevel.tenantId
    ) {
      throw new Error(
        "Taşıyıcı kaydı bulunamadı.",
      );
    }

    const stored =
      structuredClone(serviceLevel);

    this.serviceLevels.set(
      stored.id,
      stored,
    );

    const serviceLevels =
      carrier.serviceLevels.filter(
        (current) =>
          current.id !== stored.id,
      );

    serviceLevels.push(
      structuredClone(stored),
    );

    serviceLevels.sort(
      (left, right) =>
        left.code.localeCompare(
          right.code,
          "tr",
          { numeric: true },
        ),
    );

    this.carriers.set(
      carrier.id,
      {
        ...carrier,
        serviceLevels,
        updatedAt: stored.updatedAt,
      },
    );

    return structuredClone(stored);
  }

  async saveVehicle(
    vehicle: ShippingVehicle,
  ): Promise<ShippingVehicle> {
    const stored =
      structuredClone(vehicle);

    this.vehicles.set(
      stored.id,
      stored,
    );

    return structuredClone(stored);
  }

  async saveDock(
    dock: ShippingDock,
  ): Promise<ShippingDock> {
    const stored =
      structuredClone(dock);

    this.docks.set(
      stored.id,
      stored,
    );

    return structuredClone(stored);
  }

  async findCarrierById(
    tenantId: string,
    carrierId: string,
  ): Promise<ShippingCarrier | null> {
    const carrier =
      this.carriers.get(carrierId);

    if (
      !carrier ||
      carrier.tenantId !== tenantId
    ) {
      return null;
    }

    return structuredClone(carrier);
  }

  async findCarrierByCode(
    tenantId: string,
    code: string,
  ): Promise<ShippingCarrier | null> {
    for (
      const carrier
      of this.carriers.values()
    ) {
      if (
        carrier.tenantId === tenantId &&
        carrier.code === code
      ) {
        return structuredClone(carrier);
      }
    }

    return null;
  }

  async listCarriers(
    tenantId: string,
    activeOnly = false,
  ): Promise<ShippingCarrier[]> {
    return [...this.carriers.values()]
      .filter(
        (carrier) =>
          carrier.tenantId === tenantId,
      )
      .filter(
        (carrier) =>
          !activeOnly ||
          carrier.active,
      )
      .sort((left, right) =>
        left.code.localeCompare(
          right.code,
          "tr",
          { numeric: true },
        ),
      )
      .map((carrier) =>
        structuredClone(carrier),
      );
  }

  async findServiceLevelById(
    tenantId: string,
    serviceLevelId: string,
  ): Promise<ShippingServiceLevel | null> {
    const serviceLevel =
      this.serviceLevels.get(
        serviceLevelId,
      );

    if (
      !serviceLevel ||
      serviceLevel.tenantId !== tenantId
    ) {
      return null;
    }

    return structuredClone(
      serviceLevel,
    );
  }

  async findServiceLevelByCode(
    tenantId: string,
    carrierId: string,
    code: string,
  ): Promise<ShippingServiceLevel | null> {
    for (
      const serviceLevel
      of this.serviceLevels.values()
    ) {
      if (
        serviceLevel.tenantId ===
          tenantId &&
        serviceLevel.carrierId ===
          carrierId &&
        serviceLevel.code === code
      ) {
        return structuredClone(
          serviceLevel,
        );
      }
    }

    return null;
  }

  async listServiceLevels(
    tenantId: string,
    carrierId?: string,
    activeOnly = false,
  ): Promise<ShippingServiceLevel[]> {
    return [...this.serviceLevels.values()]
      .filter(
        (serviceLevel) =>
          serviceLevel.tenantId ===
          tenantId,
      )
      .filter(
        (serviceLevel) =>
          carrierId === undefined ||
          serviceLevel.carrierId ===
            carrierId,
      )
      .filter(
        (serviceLevel) =>
          !activeOnly ||
          serviceLevel.active,
      )
      .sort((left, right) =>
        left.code.localeCompare(
          right.code,
          "tr",
          { numeric: true },
        ),
      )
      .map((serviceLevel) =>
        structuredClone(serviceLevel),
      );
  }

  async findVehicleById(
    tenantId: string,
    vehicleId: string,
  ): Promise<ShippingVehicle | null> {
    const vehicle =
      this.vehicles.get(vehicleId);

    if (
      !vehicle ||
      vehicle.tenantId !== tenantId
    ) {
      return null;
    }

    return structuredClone(vehicle);
  }

  async findVehicleByCode(
    tenantId: string,
    code: string,
  ): Promise<ShippingVehicle | null> {
    for (
      const vehicle
      of this.vehicles.values()
    ) {
      if (
        vehicle.tenantId === tenantId &&
        vehicle.code === code
      ) {
        return structuredClone(vehicle);
      }
    }

    return null;
  }

  async findVehicleByPlateNumber(
    tenantId: string,
    plateNumber: string,
  ): Promise<ShippingVehicle | null> {
    for (
      const vehicle
      of this.vehicles.values()
    ) {
      if (
        vehicle.tenantId === tenantId &&
        vehicle.plateNumber ===
          plateNumber
      ) {
        return structuredClone(vehicle);
      }
    }

    return null;
  }

  async listVehicles(
    tenantId: string,
    activeOnly = false,
  ): Promise<ShippingVehicle[]> {
    return [...this.vehicles.values()]
      .filter(
        (vehicle) =>
          vehicle.tenantId === tenantId,
      )
      .filter(
        (vehicle) =>
          !activeOnly ||
          vehicle.active,
      )
      .sort((left, right) =>
        left.code.localeCompare(
          right.code,
          "tr",
          { numeric: true },
        ),
      )
      .map((vehicle) =>
        structuredClone(vehicle),
      );
  }

  async findDockById(
    tenantId: string,
    dockId: string,
  ): Promise<ShippingDock | null> {
    const dock =
      this.docks.get(dockId);

    if (
      !dock ||
      dock.tenantId !== tenantId
    ) {
      return null;
    }

    return structuredClone(dock);
  }

  async findDockByCode(
    tenantId: string,
    warehouseId: string,
    code: string,
  ): Promise<ShippingDock | null> {
    for (
      const dock
      of this.docks.values()
    ) {
      if (
        dock.tenantId === tenantId &&
        dock.warehouseId ===
          warehouseId &&
        dock.code === code
      ) {
        return structuredClone(dock);
      }
    }

    return null;
  }

  async listDocks(
    tenantId: string,
    warehouseId?: string,
    activeOnly = false,
  ): Promise<ShippingDock[]> {
    return [...this.docks.values()]
      .filter(
        (dock) =>
          dock.tenantId === tenantId,
      )
      .filter(
        (dock) =>
          warehouseId === undefined ||
          dock.warehouseId ===
            warehouseId,
      )
      .filter(
        (dock) =>
          !activeOnly ||
          dock.active,
      )
      .sort((left, right) =>
        left.code.localeCompare(
          right.code,
          "tr",
          { numeric: true },
        ),
      )
      .map((dock) =>
        structuredClone(dock),
      );
  }

  async listPackages(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingPackage[]> {
    return [...this.packages.values()]
      .filter(
        (shippingPackage) =>
          shippingPackage.tenantId ===
            tenantId &&
          shippingPackage.shippingId ===
            shippingId,
      )
      .sort(
        (left, right) =>
          left.loadingSequence -
          right.loadingSequence,
      )
      .map((shippingPackage) =>
        structuredClone(shippingPackage),
      );
  }

  async listTasks(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingTask[]> {
    return [...this.tasks.values()]
      .filter(
        (task) =>
          task.tenantId === tenantId &&
          task.shippingId === shippingId,
      )
      .sort(
        (left, right) =>
          left.sequence -
          right.sequence,
      )
      .map((task) =>
        structuredClone(task),
      );
  }

  async listExceptions(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingException[]> {
    return [...this.exceptions.values()]
      .filter(
        (exception) =>
          exception.tenantId ===
            tenantId &&
          exception.shippingId ===
            shippingId,
      )
      .sort((left, right) =>
        left.createdAt.localeCompare(
          right.createdAt,
        ),
      )
      .map((exception) =>
        structuredClone(exception),
      );
  }

  async listManifests(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingManifest[]> {
    return [...this.manifests.values()]
      .filter(
        (manifest) =>
          manifest.tenantId === tenantId &&
          manifest.shippingId ===
            shippingId,
      )
      .sort((left, right) =>
        left.createdAt.localeCompare(
          right.createdAt,
        ),
      )
      .map((manifest) =>
        structuredClone(manifest),
      );
  }

  async listAsns(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingAsn[]> {
    return [...this.asns.values()]
      .filter(
        (asn) =>
          asn.tenantId === tenantId &&
          asn.shippingId === shippingId,
      )
      .sort((left, right) =>
        left.createdAt.localeCompare(
          right.createdAt,
        ),
      )
      .map((asn) =>
        structuredClone(asn),
      );
  }

  async listTrackingEvents(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingTrackingEvent[]> {
    return [
      ...this.trackingEvents.values(),
    ]
      .filter(
        (event) =>
          event.tenantId === tenantId &&
          event.shippingId === shippingId,
      )
      .sort((left, right) =>
        left.occurredAt.localeCompare(
          right.occurredAt,
        ),
      )
      .map((event) =>
        structuredClone(event),
      );
  }

  async listProofsOfDelivery(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingProofOfDelivery[]> {
    return [
      ...this.proofsOfDelivery.values(),
    ]
      .filter(
        (proof) =>
          proof.tenantId === tenantId &&
          proof.shippingId === shippingId,
      )
      .sort((left, right) =>
        left.deliveredAt.localeCompare(
          right.deliveredAt,
        ),
      )
      .map((proof) =>
        structuredClone(proof),
      );
  }

  async listSuggestions(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingSuggestion[]> {
    return [...this.suggestions.values()]
      .filter(
        (suggestion) =>
          suggestion.tenantId ===
            tenantId &&
          suggestion.shippingId ===
            shippingId,
      )
      .sort(
        (left, right) =>
          right.score.totalScore -
          left.score.totalScore,
      )
      .map((suggestion) =>
        structuredClone(suggestion),
      );
  }

  private assertShippingExists(
    tenantId: string,
    shippingId: string,
  ): Shipping {
    const shipping =
      this.shippings.get(shippingId);

    if (
      !shipping ||
      shipping.tenantId !== tenantId
    ) {
      throw new Error(
        "Sevkiyat kaydı bulunamadı.",
      );
    }

    return shipping;
  }
}
