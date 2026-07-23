import type { KnowledgeService } from '../../restaurant-knowledge/services/KnowledgeService.ts';
import type { RestaurantSnapshot } from '../../restaurant-knowledge/types/snapshot.ts';
import {
  findTablesForParty,
  listAvailableTables,
} from '../../restaurant-knowledge/queries/tables.ts';
import { listOpenReservations } from '../../restaurant-knowledge/queries/reservation.ts';
import type { ActionPayload } from '../types.ts';

export interface KnowledgeValidationResult {
  ok: boolean;
  errors: string[];
  snapshot?: RestaurantSnapshot;
  warnings: string[];
}

/**
 * Pre-action Knowledge Graph validation.
 * Example: occupied / unavailable table → reject.
 */
export class KnowledgeActionValidator {
  private readonly knowledge: KnowledgeService;

  constructor(knowledge: KnowledgeService) {
    this.knowledge = knowledge;
  }

  async loadSnapshot(
    restaurantId: string,
    date?: string,
  ): Promise<RestaurantSnapshot> {
    return this.knowledge.getSnapshotData(restaurantId, { date });
  }

  async validateReservationDraft(
    payload: ActionPayload,
  ): Promise<KnowledgeValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!payload.restaurantId) errors.push('restaurantId gerekli');
    if (!payload.date) errors.push('tarih gerekli');
    if (!payload.time) errors.push('saat gerekli');
    if (!payload.partySize || payload.partySize < 1) {
      errors.push('kişi sayısı gerekli');
    }

    let snapshot: RestaurantSnapshot | undefined;
    try {
      snapshot = await this.loadSnapshot(payload.restaurantId, payload.date);
    } catch (err) {
      errors.push(
        err instanceof Error ? err.message : 'Knowledge snapshot yüklenemedi',
      );
      return { ok: false, errors, warnings };
    }

    if (payload.partySize) {
      const fit = findTablesForParty(snapshot, payload.partySize);
      if (!fit.length) {
        errors.push(`${payload.partySize} kişilik uygun masa yok`);
      }
    }

    if (payload.tableId) {
      const tableCheck = this.validateTableAssignment(snapshot, payload);
      errors.push(...tableCheck.errors);
      warnings.push(...tableCheck.warnings);
    }

    const hours = snapshot.businessHours || [];
    if (hours.length && hours.every((h) => h.closed)) {
      warnings.push('Restoran saatleri kapalı görünüyor');
    }

    return { ok: errors.length === 0, errors, warnings, snapshot };
  }

  validateTableAssignment(
    snapshot: RestaurantSnapshot,
    payload: ActionPayload,
  ): KnowledgeValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const tableId = payload.tableId;
    if (!tableId) {
      return { ok: false, errors: ['tableId gerekli'], warnings, snapshot };
    }

    const table = snapshot.tables.find((t) => t.id === tableId);
    if (!table) {
      return {
        ok: false,
        errors: [`Masa bulunamadı: ${tableId}`],
        warnings,
        snapshot,
      };
    }
    if (table.active === false) {
      errors.push(`Masa pasif: ${table.name || tableId}`);
    }
    if (table.status !== 'available') {
      errors.push(
        `Masa müsait değil (${table.status}): ${table.name || tableId}`,
      );
    }

    const available = listAvailableTables(snapshot).some((t) => t.id === tableId);
    if (!available && !errors.length) {
      errors.push(`Masa listesinde müsait değil: ${table.name || tableId}`);
    }

    if (payload.partySize && table.capacity < payload.partySize) {
      errors.push(
        `Masa kapasitesi yetersiz (${table.capacity} < ${payload.partySize})`,
      );
    }

    if (payload.date) {
      const conflict = listOpenReservations(snapshot, payload.date).find(
        (r) =>
          r.id !== payload.reservationId &&
          (r.tableIds || []).includes(tableId),
      );
      if (conflict) {
        errors.push(
          `Masa dolu — çakışan rezervasyon: ${conflict.id} (${conflict.time})`,
        );
      }
    }

    return { ok: errors.length === 0, errors, warnings, snapshot };
  }

  async validateTableAction(
    payload: ActionPayload,
  ): Promise<KnowledgeValidationResult> {
    try {
      const snapshot = await this.loadSnapshot(payload.restaurantId, payload.date);
      return this.validateTableAssignment(snapshot, payload);
    } catch (err) {
      return {
        ok: false,
        errors: [
          err instanceof Error ? err.message : 'Knowledge snapshot yüklenemedi',
        ],
        warnings: [],
      };
    }
  }
}
