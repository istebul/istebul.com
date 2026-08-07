import type {
  OperationsExceptionFilter,
  OperationsProcessVolume,
} from "../types/OperationsExceptionAnalytics";

/**
 * Operasyon süreç hacimlerini kalıcı veri kaynağından okur.
 *
 * warehouseId verilmediğinde firma-geneli (warehouse_id IS NULL)
 * kayıtları döndürür. Böylece firma-geneli özet satırları ile
 * depo bazlı satırlar aynı analizde çift sayılmaz.
 */
export interface OperationsProcessVolumeRepository {
  list(
    filter: OperationsExceptionFilter,
  ): Promise<OperationsProcessVolume[]>;
}
