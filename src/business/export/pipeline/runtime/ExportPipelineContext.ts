/**
 * İSTEBUL Business Export Engine — runtime pipeline context.
 */

import type { BusinessValidationResult } from '../../../dataset/models/BusinessValidationResult';
import type { OutputFormatId } from '../../../knowledge/outputs/OutputDefinition';
import type { ExportContext } from '../../models/ExportContext';
import type { ExportFormat } from '../../models/ExportFormat';
import type { ExportRequest } from '../../models/ExportRequest';
import type { ExportResult } from '../../models/ExportResult';
import type { ExportStatus } from '../../models/ExportStatus';
import type { ExportSummary } from '../../models/ExportSummary';
import type { ExportStageExecution } from './ExportStageExecution';

/**
 * Runtime-only iskelet ExportModel.
 * Foundation katmanında ExportModel yoktur; validation başarılıysa bag'e yazılır.
 * Renderer / format / dosya üretimi sonraki PR'lardadır.
 */
export interface ExportModel {
  /** Model kimliği */
  id: string;
  /** Kaynak istek kimliği */
  requestId: string;
  /** Dil */
  locale: 'tr' | 'en';
  /** Hedef formatlar */
  formatIds: readonly OutputFormatId[];
  /** Kaynak DocumentModel kimliği */
  documentModelId?: string;
  /** Kaynak DashboardModel kimliği */
  dashboardModelId?: string;
  /** Report DNA kimliği */
  reportDnaId?: string;
  /** Şablon kimliği */
  templateId?: string;
  /** Hedef kimliği */
  targetId?: string;
  /** Durum */
  status: ExportStatus;
  /** Oluşturulma (ISO 8601) */
  createdAt: string;
  /** Şema sürümü */
  version: string;
}

/**
 * Export Pipeline ara veri çantası — yalnızca Export Engine anahtarları.
 * Global bag oluşturmaz; Dashboard / Report / Decision bag'leri paylaşılmaz.
 *
 * Önerilen anahtarlar: validation, exportModel, render, format, summary
 */
export interface ExportPipelineBag {
  /** Export Validation sonucu */
  validation?: BusinessValidationResult;
  /** Validation sonrası iskelet ExportModel */
  exportModel?: ExportModel;
  /** Renderer placeholder alanı */
  render?: Readonly<Record<string, unknown>>;
  /** Format çözümleme placeholder */
  format?: readonly ExportFormat[];
  /** Export özeti placeholder */
  summary?: ExportSummary;
  /** Nihai ExportResult */
  exportResult?: ExportResult;
  /** Diğer ara değerler */
  [key: string]: unknown;
}

export interface ExportPipelineContext {
  /** Kaynak istek */
  request: ExportRequest;
  /** Foundation ExportContext */
  exportContext: ExportContext;
  /** Tamamlanan aşama kayıtları */
  stageExecutions: ExportStageExecution[];
  /** Export-özel ara veri */
  bag: ExportPipelineBag;
  /** Pipeline başlangıcı (ISO 8601) */
  startedAt: string;
  /** Monotonik başlangıç işareti (ms) */
  startedMark: number;
}
