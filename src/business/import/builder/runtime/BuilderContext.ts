/**
 * İSTEBUL Business Import Engine — BuilderContext (PR-101I).
 */

import type { BusinessEntityTypeId } from '../../../dataset/entities/BusinessEntityType';
import type { ImportContext } from '../../types/ImportContext';
import type { ImportRequest } from '../../types/ImportRequest';
import type { NormalizationResult } from '../../normalizers/runtime/NormalizationResult';
import type { ValidationResultRuntime } from '../../validators/runtime/ValidationResultRuntime';

/**
 * Dataset builder giriş bağlamı.
 */
export interface BuilderContext {
  /** Normalizer çıktısı */
  normalizationResult: NormalizationResult;
  /** İçe aktarma isteği */
  request: ImportRequest;
  /** Opsiyonel doğrulama sonucu */
  validationResult?: ValidationResultRuntime;
  /** Opsiyonel foundation import bağlamı */
  importContext?: ImportContext;
  /** Dataset kimliği — yoksa `ds-{request.id}` */
  datasetId?: string;
  /** Başlık — yoksa kaynak etiketi */
  title?: string;
  /** Açıklama */
  description?: string;
  /** Dil */
  locale?: 'tr' | 'en';
  /** İçerik revizyonu */
  revision?: string;
  /** Varsayılan entity tipi */
  defaultEntityType?: BusinessEntityTypeId;
  /** Metadata etiketleri */
  tags?: readonly string[];
}

export interface CreateBuilderContextInput {
  normalizationResult: NormalizationResult;
  request: ImportRequest;
  validationResult?: ValidationResultRuntime;
  importContext?: ImportContext;
  datasetId?: string;
  title?: string;
  description?: string;
  locale?: 'tr' | 'en';
  revision?: string;
  defaultEntityType?: BusinessEntityTypeId;
  tags?: readonly string[];
}

/**
 * BuilderContext fabrikası.
 */
export function createBuilderContext(
  input: CreateBuilderContextInput
): BuilderContext {
  return {
    normalizationResult: input.normalizationResult,
    request: input.request,
    validationResult: input.validationResult,
    importContext: input.importContext,
    datasetId: input.datasetId,
    title: input.title,
    description: input.description,
    locale: input.locale,
    revision: input.revision,
    defaultEntityType: input.defaultEntityType,
    tags: input.tags
  };
}
