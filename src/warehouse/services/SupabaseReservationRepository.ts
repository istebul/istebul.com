import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  InventoryReservation,
} from "../types/InventoryReservation";

import type {
  ReservationListFilter,
  ReservationRepository,
} from "./ReservationRepository";

const RESERVATION_TABLE =
  "warehouse_inventory_reservations";

const RESERVATION_SELECT = [
  "id",
  "account_id",
  "reservation_number",
  "warehouse_id",
  "location_id",
  "product_id",
  "sku_id",
  "lot_number",
  "serial_number",
  "quantity",
  "consumed_quantity",
  "unit",
  "status",
  "reference_type",
  "reference_id",
  "reference_number",
  "expires_at",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

interface ReservationRow {
  id: string;
  account_id: string;
  reservation_number: string;

  warehouse_id: string;
  location_id: string;
  product_id: string;
  sku_id: string | null;

  lot_number: string | null;
  serial_number: string | null;

  quantity: number | string;
  consumed_quantity: number | string;
  unit: string;

  status: InventoryReservation["status"];

  reference_type: string | null;
  reference_id: string | null;
  reference_number: string | null;

  expires_at: string | null;

  created_by: string;
  created_at: string;
  updated_at: string;
}

interface SupabaseErrorLike {
  message: string;
}

function mapReservationRow(
  row: ReservationRow,
): InventoryReservation {
  return {
    id: row.id,
    tenantId: row.account_id,
    reservationNumber:
      row.reservation_number,

    warehouseId:
      row.warehouse_id,
    locationId:
      row.location_id,
    productId:
      row.product_id,

    quantity:
      Number(row.quantity),
    consumedQuantity:
      Number(row.consumed_quantity),

    unit:
      row.unit,

    status:
      row.status,

    createdBy:
      row.created_by,
    createdAt:
      row.created_at,
    updatedAt:
      row.updated_at,

    ...(row.sku_id !== null
      ? {
          skuId:
            row.sku_id,
        }
      : {}),

    ...(row.lot_number !== null
      ? {
          lotNumber:
            row.lot_number,
        }
      : {}),

    ...(row.serial_number !== null
      ? {
          serialNumber:
            row.serial_number,
        }
      : {}),

    ...(row.reference_type !== null
      ? {
          referenceType:
            row.reference_type,
        }
      : {}),

    ...(row.reference_id !== null
      ? {
          referenceId:
            row.reference_id,
        }
      : {}),

    ...(row.reference_number !== null
      ? {
          referenceNumber:
            row.reference_number,
        }
      : {}),

    ...(row.expires_at !== null
      ? {
          expiresAt:
            row.expires_at,
        }
      : {}),
  };
}

export class SupabaseReservationRepository
  implements ReservationRepository
{
  private readonly client:
    SupabaseClient;

  constructor(
    client: SupabaseClient,
  ) {
    this.client =
      client;
  }

  async findById(
    tenantId: string,
    reservationId: string,
  ): Promise<InventoryReservation | null> {
    return this.findOne(
      tenantId,
      "id",
      reservationId,
      "Stok rezervasyonu okunamadı",
    );
  }

  async findByNumber(
    tenantId: string,
    reservationNumber: string,
  ): Promise<InventoryReservation | null> {
    return this.findOne(
      tenantId,
      "reservation_number",
      reservationNumber,
      "Stok rezervasyon numarası okunamadı",
    );
  }

  async list(
    filter: ReservationListFilter,
  ): Promise<InventoryReservation[]> {
    let query =
      this.client
        .from(
          RESERVATION_TABLE,
        )
        .select(
          RESERVATION_SELECT,
        )
        .eq(
          "account_id",
          filter.tenantId,
        );

    if (
      filter.warehouseId !==
      undefined
    ) {
      query =
        query.eq(
          "warehouse_id",
          filter.warehouseId,
        );
    }

    if (
      filter.locationId !==
      undefined
    ) {
      query =
        query.eq(
          "location_id",
          filter.locationId,
        );
    }

    if (
      filter.productId !==
      undefined
    ) {
      query =
        query.eq(
          "product_id",
          filter.productId,
        );
    }

    if (
      filter.skuId !==
      undefined
    ) {
      query =
        query.eq(
          "sku_id",
          filter.skuId,
        );
    }

    if (
      filter.lotNumber !==
      undefined
    ) {
      query =
        query.eq(
          "lot_number",
          filter.lotNumber,
        );
    }

    if (
      filter.serialNumber !==
      undefined
    ) {
      query =
        query.eq(
          "serial_number",
          filter.serialNumber,
        );
    }

    if (
      filter.referenceType !==
      undefined
    ) {
      query =
        query.eq(
          "reference_type",
          filter.referenceType,
        );
    }

    if (
      filter.referenceId !==
      undefined
    ) {
      query =
        query.eq(
          "reference_id",
          filter.referenceId,
        );
    }

    if (
      filter.status !==
      undefined
    ) {
      query =
        query.eq(
          "status",
          filter.status,
        );
    }

    if (
      filter.activeOnly ===
      true
    ) {
      query =
        query.in(
          "status",
          [
            "active",
            "partially_consumed",
          ],
        );
    }

    const {
      data,
      error,
    } =
      await query.order(
        "created_at",
        {
          ascending: true,
        },
      );

    if (error) {
      this.throwError(
        "Stok rezervasyonları listelenemedi",
        error,
      );
    }

    return (
      (data ?? []) as unknown as ReservationRow[]
    ).map(
      mapReservationRow,
    );
  }

  async save(
    _reservation:
      InventoryReservation,
  ): Promise<InventoryReservation> {
    return this.rejectDirectWrite();
  }

  async getReservedQuantity(
    filter: ReservationListFilter,
  ): Promise<number> {
    const reservations =
      await this.list({
        ...filter,
        activeOnly: true,
      });

    return reservations.reduce(
      (
        total,
        reservation,
      ) =>
        total +
        (
          reservation.quantity -
          reservation.consumedQuantity
        ),
      0,
    );
  }

  private async findOne(
    tenantId: string,
    column: string,
    value: string,
    errorLabel: string,
  ): Promise<InventoryReservation | null> {
    const {
      data,
      error,
    } =
      await this.client
        .from(
          RESERVATION_TABLE,
        )
        .select(
          RESERVATION_SELECT,
        )
        .eq(
          "account_id",
          tenantId,
        )
        .eq(
          column,
          value,
        )
        .maybeSingle();

    if (error) {
      this.throwError(
        errorLabel,
        error,
      );
    }

    if (!data) {
      return null;
    }

    return mapReservationRow(
      data as unknown as ReservationRow,
    );
  }

  private async rejectDirectWrite<T>():
    Promise<T> {
    throw new Error(
      "Doğrudan stok rezervasyonu yazma kapalıdır. Güvenli WarehouseIQ reservation write RPC kullanılmalıdır.",
    );
  }

  private throwError(
    label: string,
    error: SupabaseErrorLike,
  ): never {
    throw new Error(
      label +
        ": " +
        error.message,
    );
  }
}
