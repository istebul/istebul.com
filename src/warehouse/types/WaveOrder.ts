export const WAVE_ORDER_STATUSES = [
  "pending",
  "eligible",
  "allocated",
  "released",
  "in_progress",
  "partially_completed",
  "completed",
  "exception",
  "removed",
] as const;

export type WaveOrderStatus =
  (typeof WAVE_ORDER_STATUSES)[number];

export interface WaveOrder {
  readonly id: string;
  readonly tenantId: string;
  readonly waveId: string;
  readonly orderId: string;
  readonly orderNumber: string;
  readonly warehouseId: string;
  readonly customerId?: string;
  readonly routeId?: string;
  readonly carrierId?: string;
  readonly serviceLevel?: string;
  readonly temperatureZone?: string;
  readonly shippingMethod?: string;
  readonly destinationCountry?: string;
  readonly destinationCity?: string;
  readonly priority: number;
  readonly lineCount: number;
  readonly itemQuantity: number;
  readonly totalWeight?: number;
  readonly totalVolume?: number;
  readonly cutoffAt?: string;
  readonly promisedAt?: string;
  readonly status: WaveOrderStatus;
  readonly allocatedAt?: string;
  readonly releasedAt?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateWaveOrderInput {
  tenantId: string;
  waveId: string;
  orderId: string;
  orderNumber: string;
  warehouseId: string;
  priority?: number;
  lineCount: number;
  itemQuantity: number;
  customerId?: string;
  routeId?: string;
  carrierId?: string;
  serviceLevel?: string;
  temperatureZone?: string;
  shippingMethod?: string;
  destinationCountry?: string;
  destinationCity?: string;
  totalWeight?: number;
  totalVolume?: number;
  cutoffAt?: string;
  promisedAt?: string;
  notes?: string;
}
