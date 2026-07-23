import type { DiningRoom } from '../entities/dining-room.ts';
import type { Table } from '../entities/table.ts';
import type { RestaurantSnapshot } from '../types/snapshot.ts';
import type { TableCandidate } from '../types/resolve.ts';

export function listTables(snapshot: RestaurantSnapshot): Table[] {
  return snapshot.tables.filter((t) => t.active !== false);
}

export function listAvailableTables(snapshot: RestaurantSnapshot): Table[] {
  return listTables(snapshot).filter((t) => t.status === 'available');
}

export function findTablesForParty(
  snapshot: RestaurantSnapshot,
  partySize: number,
): Table[] {
  return listAvailableTables(snapshot).filter((t) => t.capacity >= partySize);
}

export function findDiningRoom(
  snapshot: RestaurantSnapshot,
  diningRoomIdOrSalon: string,
): DiningRoom | undefined {
  const key = diningRoomIdOrSalon.toLowerCase();
  return snapshot.diningRooms
    .map((n) => n.room)
    .find(
      (r) =>
        r.id.toLowerCase() === key ||
        (r.salonKey || '').toLowerCase() === key ||
        r.name.toLowerCase() === key,
    );
}

export function scoreTableCandidates(
  snapshot: RestaurantSnapshot,
  opts: {
    partySize?: number;
    quietPreferred?: boolean;
    outdoorPreferred?: boolean;
    indoorPreferred?: boolean;
    windowPreferred?: boolean;
    accessiblePreferred?: boolean;
    vipPreferred?: boolean;
    salon?: string;
    limit?: number;
  } = {},
): TableCandidate[] {
  const limit = opts.limit ?? 5;
  const roomsById = new Map(snapshot.diningRooms.map((n) => [n.room.id, n.room]));
  const roomsBySalon = new Map(
    snapshot.diningRooms
      .filter((n) => n.room.salonKey)
      .map((n) => [(n.room.salonKey || '').toLowerCase(), n.room]),
  );

  const scored: TableCandidate[] = [];
  for (const table of listTables(snapshot)) {
    if (table.status !== 'available') continue;
    const reasons: string[] = [];
    let score = 0;

    if (opts.partySize !== undefined) {
      if (table.capacity < opts.partySize) continue;
      const waste = table.capacity - opts.partySize;
      score += Math.max(0, 40 - waste * 8);
      reasons.push(`${table.capacity} kişilik kapasite`);
    } else {
      score += 10;
    }

    if (opts.quietPreferred) {
      if (table.quiet || table.tags?.includes('sessiz')) {
        score += 25;
        reasons.push('sessiz masa');
      } else {
        score -= 10;
      }
    }
    if (opts.outdoorPreferred) {
      if (table.outdoor) {
        score += 20;
        reasons.push('açık alan');
      } else score -= 5;
    }
    if (opts.indoorPreferred && table.outdoor) {
      score -= 15;
    }
    if (opts.windowPreferred && table.windowSeat) {
      score += 10;
      reasons.push('pencere kenarı');
    }
    if (opts.accessiblePreferred && table.accessible) {
      score += 15;
      reasons.push('erişilebilir');
    }
    if (opts.vipPreferred && table.vip) {
      score += 15;
      reasons.push('VIP');
    }
    if (opts.salon) {
      const salonKey = opts.salon.toLowerCase();
      if ((table.salon || '').toLowerCase() === salonKey) {
        score += 15;
        reasons.push(`salon: ${table.salon}`);
      } else {
        score -= 20;
      }
    }

    const diningRoom =
      (table.diningRoomId && roomsById.get(table.diningRoomId)) ||
      (table.salon && roomsBySalon.get(table.salon.toLowerCase())) ||
      undefined;

    if (opts.quietPreferred && diningRoom?.ambiance?.includes('quiet')) {
      score += 8;
      reasons.push('sakin salon');
    }

    scored.push({ table, diningRoom, score, reasons });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
