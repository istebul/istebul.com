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

export interface ShippingRepository {
  findById(
    tenantId: string,
    shippingId: string,
  ): Promise<Shipping | null>;

  findByNumber(
    tenantId: string,
    shippingNumber: string,
  ): Promise<Shipping | null>;

  findByPackingId(
    tenantId: string,
    packingId: string,
  ): Promise<Shipping | null>;

  findByOrderId(
    tenantId: string,
    orderId: string,
  ): Promise<Shipping | null>;

  findByReference(
    tenantId: string,
    referenceType: string,
    referenceId: string,
  ): Promise<Shipping | null>;

  list(
    filter: ShippingListFilter,
  ): Promise<Shipping[]>;

  save(
    shipping: Shipping,
  ): Promise<Shipping>;

  saveItem(
    item: ShippingItem,
  ): Promise<ShippingItem>;

  savePackage(
    shippingPackage: ShippingPackage,
  ): Promise<ShippingPackage>;

  saveTask(
    task: ShippingTask,
  ): Promise<ShippingTask>;

  saveException(
    exception: ShippingException,
  ): Promise<ShippingException>;

  saveManifest(
    manifest: ShippingManifest,
  ): Promise<ShippingManifest>;

  saveAsn(
    asn: ShippingAsn,
  ): Promise<ShippingAsn>;

  saveTrackingEvent(
    event: ShippingTrackingEvent,
  ): Promise<ShippingTrackingEvent>;

  saveProofOfDelivery(
    proofOfDelivery: ShippingProofOfDelivery,
  ): Promise<ShippingProofOfDelivery>;

  saveSuggestion(
    suggestion: ShippingSuggestion,
  ): Promise<ShippingSuggestion>;

  saveCarrier(
    carrier: ShippingCarrier,
  ): Promise<ShippingCarrier>;

  saveServiceLevel(
    serviceLevel: ShippingServiceLevel,
  ): Promise<ShippingServiceLevel>;

  saveVehicle(
    vehicle: ShippingVehicle,
  ): Promise<ShippingVehicle>;

  saveDock(
    dock: ShippingDock,
  ): Promise<ShippingDock>;

  findCarrierById(
    tenantId: string,
    carrierId: string,
  ): Promise<ShippingCarrier | null>;

  findCarrierByCode(
    tenantId: string,
    code: string,
  ): Promise<ShippingCarrier | null>;

  listCarriers(
    tenantId: string,
    activeOnly?: boolean,
  ): Promise<ShippingCarrier[]>;

  findServiceLevelById(
    tenantId: string,
    serviceLevelId: string,
  ): Promise<ShippingServiceLevel | null>;

  findServiceLevelByCode(
    tenantId: string,
    carrierId: string,
    code: string,
  ): Promise<ShippingServiceLevel | null>;

  listServiceLevels(
    tenantId: string,
    carrierId?: string,
    activeOnly?: boolean,
  ): Promise<ShippingServiceLevel[]>;

  findVehicleById(
    tenantId: string,
    vehicleId: string,
  ): Promise<ShippingVehicle | null>;

  findVehicleByCode(
    tenantId: string,
    code: string,
  ): Promise<ShippingVehicle | null>;

  findVehicleByPlateNumber(
    tenantId: string,
    plateNumber: string,
  ): Promise<ShippingVehicle | null>;

  listVehicles(
    tenantId: string,
    activeOnly?: boolean,
  ): Promise<ShippingVehicle[]>;

  findDockById(
    tenantId: string,
    dockId: string,
  ): Promise<ShippingDock | null>;

  findDockByCode(
    tenantId: string,
    warehouseId: string,
    code: string,
  ): Promise<ShippingDock | null>;

  listDocks(
    tenantId: string,
    warehouseId?: string,
    activeOnly?: boolean,
  ): Promise<ShippingDock[]>;

  listPackages(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingPackage[]>;

  listTasks(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingTask[]>;

  listExceptions(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingException[]>;

  listManifests(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingManifest[]>;

  listAsns(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingAsn[]>;

  listTrackingEvents(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingTrackingEvent[]>;

  listProofsOfDelivery(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingProofOfDelivery[]>;

  listSuggestions(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingSuggestion[]>;
}
