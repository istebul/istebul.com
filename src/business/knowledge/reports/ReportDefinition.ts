/**
 * İSTEBUL Business — Report DNA tip sözleşmeleri.
 *
 * Report DNA: bir raporun kimlik, veri, KPI, prompt, çıktı ve
 * dashboard önerilerini tek tanımda toplayan şema.
 *
 * Bu dosya yalnızca tipler içerir. İş mantığı yoktur.
 */

import type { BusinessCategoryId } from '../categories/CategoryDefinition';
import type { OutputFormatId } from '../outputs/OutputDefinition';
import type { PromptKey } from '../prompts/PromptDefinition';

/**
 * Rapor yaşam durumu.
 *
 * | Teknik | Türkçe |
 * |--------|--------|
 * | taslak | Taslak |
 * | aktif | Aktif |
 */
export type ReportStatus = 'taslak' | 'aktif';

/** Rapor durumu için görünen Türkçe etiketler. */
export const REPORT_STATUS_LABELS: Readonly<Record<ReportStatus, string>> =
  Object.freeze({
    taslak: 'Taslak',
    aktif: 'Aktif'
  });

/**
 * Raporun ihtiyaç duyduğu veri tipi anahtarları.
 * Örnek: envanter-listesi, finans-hareketleri, personel-kayitlari.
 */
export type RequiredDataTypeId = string;

/**
 * Desteklenen girdi dosya türleri.
 */
export type SupportedFileType =
  | 'csv'
  | 'xlsx'
  | 'xls'
  | 'json'
  | 'pdf'
  | 'docx'
  | 'txt';

/**
 * Dashboard widget önerisi — henüz render edilmez; yalnızca tanım.
 */
export interface DashboardWidgetSuggestion {
  /** Widget kimliği */
  id: string;
  /** Widget başlığı (Türkçe) */
  title: string;
  /**
   * Widget türü önerisi.
   * Örnek: kpi-card, line-chart, bar-chart, table, heatmap.
   */
  widgetType: string;
  /** Bağlı KPI kimlikleri (opsiyonel) */
  kpiIds?: readonly string[];
}

/**
 * Report DNA — tek bir raporun tam tanımı.
 *
 * Alan sözlüğü (TR):
 * - id → Kimlik
 * - name → Ad
 * - description → Açıklama
 * - category → Kategori
 * - sector → Sektör
 * - icon → İkon
 * - requiredDataTypes → Gerekli veri tipleri
 * - supportedFileTypes → Desteklenen dosya türleri
 * - kpiIds → KPI listesi
 * - aiPromptKey → AI Prompt anahtarı
 * - dashboardWidgets → Dashboard widget önerileri
 * - outputs → Çıktılar
 * - tags → Etiketler
 * - version → Sürüm
 * - status → Durum (Taslak / Aktif)
 */
export interface ReportDefinition {
  /** Kimlik — kararlı teknik anahtar */
  id: string;
  /** Ad — kullanıcıya görünen Türkçe rapor adı */
  name: string;
  /** Açıklama — raporun amacı */
  description: string;
  /** Kategori — fonksiyonel / sektörel kategori kimliği */
  category: BusinessCategoryId;
  /**
   * Sektör — raporun birincil sektör bağlamı.
   * Genel raporlarda kategori ile aynı veya `yonetim` olabilir.
   */
  sector: BusinessCategoryId;
  /** İkon — tasarım sistemi ikon anahtarı */
  icon: string;
  /** Gerekli veri tipleri — analiz için beklenen veri anahtarları */
  requiredDataTypes: readonly RequiredDataTypeId[];
  /** Desteklenen dosya türleri — yükleme / içe aktarma */
  supportedFileTypes: readonly SupportedFileType[];
  /** KPI listesi — bu raporda kullanılacak KPI kimlikleri */
  kpiIds: readonly string[];
  /** AI Prompt anahtarı — PromptRegistry içindeki anahtar */
  aiPromptKey: PromptKey;
  /** Dashboard widget önerileri — gelecek dashboard üretimine girdi */
  dashboardWidgets: readonly DashboardWidgetSuggestion[];
  /** Çıktılar — PDF, Word, PowerPoint, Dashboard vb. */
  outputs: readonly OutputFormatId[];
  /** Etiketler — arama ve filtreleme */
  tags: readonly string[];
  /** Sürüm — semver benzeri tanım sürümü */
  version: string;
  /** Durum — Taslak / Aktif */
  status: ReportStatus;
}
