/** Floor table — maps from existing `restaurant_tables`. */
export type TableStatus =
  | 'available'
  | 'occupied'
  | 'reserved'
  | 'blocked'
  | 'cleaning'
  | 'unknown';

export interface Table {
  id: string;
  restaurantId: string;
  name: string;
  diningRoomId?: string;
  salon?: string;
  capacity: number;
  minCapacity?: number;
  status: TableStatus;
  assignedWaiter?: string;
  notes?: string;
  quiet?: boolean;
  outdoor?: boolean;
  windowSeat?: boolean;
  accessible?: boolean;
  vip?: boolean;
  posX?: number;
  posY?: number;
  active?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export function createTable(
  partial: Partial<Table> & Pick<Table, 'id' | 'restaurantId' | 'name' | 'capacity'>,
): Table {
  return {
    status: 'available',
    active: true,
    tags: [],
    ...partial,
  };
}
