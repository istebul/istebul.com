/**
 * Built-in structural validation rules (PR-101C).
 */

import type { ValidationContext } from '../ValidationContext';
import type { ValidationIssue } from '../ValidationIssue';
import type { ValidationRule } from '../ValidationRule';
import {
  isNonEmptyString,
  isNullOrUndefined,
  isPlainObject,
  issue
} from '../helpers';

export const importRequestRequiredFieldsRule: ValidationRule = {
  id: 'import-request-required-fields',
  name: 'ImportRequest zorunlu alanlar',
  description: 'id ve source alanlarının varlığını kontrol eder.',
  target: 'import-request',
  defaultSeverity: 'ERROR',
  validate(context: ValidationContext): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const req = context.request;
    if (isNullOrUndefined(req)) {
      return [
        issue(
          this.id,
          'REQUEST_MISSING',
          'ImportRequest tanımsız.',
          'CRITICAL',
          'request'
        )
      ];
    }
    if (!isNonEmptyString(req.id)) {
      issues.push(
        issue(
          this.id,
          'REQUIRED_FIELD',
          'ImportRequest.id zorunludur.',
          'ERROR',
          'request.id'
        )
      );
    }
    if (isNullOrUndefined(req.source)) {
      issues.push(
        issue(
          this.id,
          'REQUIRED_FIELD',
          'ImportRequest.source zorunludur.',
          'ERROR',
          'request.source'
        )
      );
    } else {
      if (!isNonEmptyString(req.source.type)) {
        issues.push(
          issue(
            this.id,
            'REQUIRED_FIELD',
            'ImportRequest.source.type zorunludur.',
            'ERROR',
            'request.source.type'
          )
        );
      }
      if (!isNonEmptyString(req.source.label)) {
        issues.push(
          issue(
            this.id,
            'REQUIRED_FIELD',
            'ImportRequest.source.label zorunludur.',
            'ERROR',
            'request.source.label'
          )
        );
      }
    }
    return issues;
  }
};

export const importContextRequiredFieldsRule: ValidationRule = {
  id: 'import-context-required-fields',
  name: 'ImportContext zorunlu alanlar',
  description: 'importId, source, locale, currentStage, status kontrolü.',
  target: 'import-context',
  defaultSeverity: 'ERROR',
  validate(context: ValidationContext): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const ctx = context.importContext;
    if (isNullOrUndefined(ctx)) {
      return [
        issue(
          this.id,
          'CONTEXT_MISSING',
          'ImportContext tanımsız.',
          'WARNING',
          'importContext',
          'Bağlam doğrulaması atlanabilir; istek yeterli olabilir.'
        )
      ];
    }
    if (!isNonEmptyString(ctx.importId)) {
      issues.push(
        issue(
          this.id,
          'REQUIRED_FIELD',
          'ImportContext.importId zorunludur.',
          'ERROR',
          'importContext.importId'
        )
      );
    }
    if (isNullOrUndefined(ctx.source) || !isNonEmptyString(ctx.source.type)) {
      issues.push(
        issue(
          this.id,
          'REQUIRED_FIELD',
          'ImportContext.source.type zorunludur.',
          'ERROR',
          'importContext.source.type'
        )
      );
    }
    if (ctx.locale !== 'tr' && ctx.locale !== 'en') {
      issues.push(
        issue(
          this.id,
          'INVALID_PRIMITIVE',
          'ImportContext.locale yalnızca tr veya en olabilir.',
          'ERROR',
          'importContext.locale'
        )
      );
    }
    if (!isNonEmptyString(ctx.currentStage)) {
      issues.push(
        issue(
          this.id,
          'REQUIRED_FIELD',
          'ImportContext.currentStage zorunludur.',
          'ERROR',
          'importContext.currentStage'
        )
      );
    }
    if (!isNonEmptyString(ctx.status)) {
      issues.push(
        issue(
          this.id,
          'REQUIRED_FIELD',
          'ImportContext.status zorunludur.',
          'ERROR',
          'importContext.status'
        )
      );
    }
    return issues;
  }
};

export const readerOutputStructureRule: ValidationRule = {
  id: 'reader-output-structure',
  name: 'Reader çıktı yapısı',
  description: 'Reader output null olamaz; primitive dışı yapı beklenir.',
  target: 'reader-output',
  defaultSeverity: 'ERROR',
  validate(context: ValidationContext): readonly ValidationIssue[] {
    if (!('readerOutput' in context) && context.readerOutput === undefined) {
      // Alan hiç set edilmemişse INFO — opsiyonel girdi
      return [
        issue(
          this.id,
          'READER_OUTPUT_ABSENT',
          'Reader çıktısı sağlanmadı (opsiyonel).',
          'INFO',
          'readerOutput'
        )
      ];
    }
    if (context.readerOutput === null) {
      return [
        issue(
          this.id,
          'NULL_VALUE',
          'Reader çıktısı null olamaz.',
          'ERROR',
          'readerOutput'
        )
      ];
    }
    if (context.readerOutput === undefined) {
      return [
        issue(
          this.id,
          'READER_OUTPUT_ABSENT',
          'Reader çıktısı tanımsız.',
          'WARNING',
          'readerOutput'
        )
      ];
    }
    const t = typeof context.readerOutput;
    if (t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint') {
      return [
        issue(
          this.id,
          'INVALID_PRIMITIVE',
          'Reader çıktısı yapısal nesne veya dizi olmalıdır.',
          'ERROR',
          'readerOutput',
          `typeof=${t}`
        )
      ];
    }
    return [];
  }
};

export const businessDatasetStructureRule: ValidationRule = {
  id: 'business-dataset-structure',
  name: 'BusinessDataset yapı',
  description: 'id, metadata, version, source, entities, relations kontrolü.',
  target: 'business-dataset',
  defaultSeverity: 'ERROR',
  validate(context: ValidationContext): readonly ValidationIssue[] {
    const ds = context.dataset;
    if (isNullOrUndefined(ds)) {
      return [
        issue(
          this.id,
          'DATASET_MISSING',
          'BusinessDataset tanımsız.',
          'WARNING',
          'dataset',
          'Dataset henüz üretilmemiş olabilir.'
        )
      ];
    }
    const issues: ValidationIssue[] = [];
    if (!isNonEmptyString(ds.id)) {
      issues.push(
        issue(
          this.id,
          'REQUIRED_FIELD',
          'BusinessDataset.id zorunludur.',
          'ERROR',
          'dataset.id'
        )
      );
    }
    if (isNullOrUndefined(ds.metadata)) {
      issues.push(
        issue(
          this.id,
          'REQUIRED_FIELD',
          'BusinessDataset.metadata zorunludur.',
          'ERROR',
          'dataset.metadata'
        )
      );
    }
    if (isNullOrUndefined(ds.version)) {
      issues.push(
        issue(
          this.id,
          'REQUIRED_FIELD',
          'BusinessDataset.version zorunludur.',
          'ERROR',
          'dataset.version'
        )
      );
    } else if (!isNonEmptyString(ds.version.schemaVersion)) {
      issues.push(
        issue(
          this.id,
          'REQUIRED_FIELD',
          'BusinessDataset.version.schemaVersion zorunludur.',
          'ERROR',
          'dataset.version.schemaVersion'
        )
      );
    }
    if (isNullOrUndefined(ds.source) || !isNonEmptyString(ds.source.type)) {
      issues.push(
        issue(
          this.id,
          'REQUIRED_FIELD',
          'BusinessDataset.source.type zorunludur.',
          'ERROR',
          'dataset.source.type'
        )
      );
    }
    if (!Array.isArray(ds.entities)) {
      issues.push(
        issue(
          this.id,
          'INVALID_COLLECTION',
          'BusinessDataset.entities bir dizi olmalıdır.',
          'ERROR',
          'dataset.entities'
        )
      );
    } else if (ds.entities.length === 0) {
      issues.push(
        issue(
          this.id,
          'EMPTY_COLLECTION',
          'BusinessDataset.entities boş olmamalıdır.',
          'WARNING',
          'dataset.entities'
        )
      );
    }
    if (!Array.isArray(ds.relations)) {
      issues.push(
        issue(
          this.id,
          'INVALID_COLLECTION',
          'BusinessDataset.relations bir dizi olmalıdır.',
          'ERROR',
          'dataset.relations'
        )
      );
    }
    return issues;
  }
};

export const metadataRequiredFieldsRule: ValidationRule = {
  id: 'metadata-required-fields',
  name: 'Metadata zorunlu alanlar',
  description: 'BusinessMetadata id, title, locale, createdAt kontrolü.',
  target: 'metadata',
  defaultSeverity: 'ERROR',
  validate(context: ValidationContext): readonly ValidationIssue[] {
    const meta = context.metadata ?? context.dataset?.metadata;
    if (isNullOrUndefined(meta)) {
      return [
        issue(
          this.id,
          'METADATA_MISSING',
          'Metadata tanımsız.',
          'WARNING',
          'metadata'
        )
      ];
    }
    const issues: ValidationIssue[] = [];
    if (!isNonEmptyString(meta.id)) {
      issues.push(
        issue(
          this.id,
          'REQUIRED_FIELD',
          'Metadata.id zorunludur.',
          'ERROR',
          'metadata.id'
        )
      );
    }
    if (!isNonEmptyString(meta.title)) {
      issues.push(
        issue(
          this.id,
          'REQUIRED_FIELD',
          'Metadata.title zorunludur.',
          'ERROR',
          'metadata.title'
        )
      );
    }
    if (meta.locale !== 'tr' && meta.locale !== 'en') {
      issues.push(
        issue(
          this.id,
          'INVALID_PRIMITIVE',
          'Metadata.locale yalnızca tr veya en olabilir.',
          'ERROR',
          'metadata.locale'
        )
      );
    }
    if (!isNonEmptyString(meta.createdAt)) {
      issues.push(
        issue(
          this.id,
          'REQUIRED_FIELD',
          'Metadata.createdAt zorunludur.',
          'ERROR',
          'metadata.createdAt'
        )
      );
    }
    if (
      context.dataset &&
      isNonEmptyString(context.dataset.id) &&
      isNonEmptyString(meta.id) &&
      context.dataset.id !== meta.id
    ) {
      issues.push(
        issue(
          this.id,
          'METADATA_ID_MISMATCH',
          'Metadata.id ile BusinessDataset.id uyuşmuyor.',
          'ERROR',
          'metadata.id'
        )
      );
    }
    return issues;
  }
};

export const nullSafetyRule: ValidationRule = {
  id: 'null-safety-core-refs',
  name: 'Null güvenlik',
  description: 'Kritik referansların null olmadığını kontrol eder.',
  target: 'generic',
  defaultSeverity: 'CRITICAL',
  validate(context: ValidationContext): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (context.request === null) {
      issues.push(
        issue(
          this.id,
          'NULL_VALUE',
          'request null olamaz.',
          'CRITICAL',
          'request'
        )
      );
    }
    if (context.dataset === null) {
      issues.push(
        issue(
          this.id,
          'NULL_VALUE',
          'dataset null olamaz (tanımsız olabilir).',
          'CRITICAL',
          'dataset'
        )
      );
    }
    if (context.metadata === null) {
      issues.push(
        issue(
          this.id,
          'NULL_VALUE',
          'metadata null olamaz.',
          'CRITICAL',
          'metadata'
        )
      );
    }
    return issues;
  }
};

export const entityHintsCollectionRule: ValidationRule = {
  id: 'entity-hints-collection',
  name: 'Entity hints koleksiyon',
  description: 'entityHints varsa dizi ve eleman tipleri kontrol edilir.',
  target: 'import-request',
  defaultSeverity: 'ERROR',
  validate(context: ValidationContext): readonly ValidationIssue[] {
    const hints = context.request?.entityHints;
    if (hints === undefined) {
      return [];
    }
    if (hints === null) {
      return [
        issue(
          this.id,
          'NULL_VALUE',
          'entityHints null olamaz.',
          'ERROR',
          'request.entityHints'
        )
      ];
    }
    if (!Array.isArray(hints)) {
      return [
        issue(
          this.id,
          'INVALID_COLLECTION',
          'entityHints bir dizi olmalıdır.',
          'ERROR',
          'request.entityHints'
        )
      ];
    }
    if (hints.length === 0) {
      return [
        issue(
          this.id,
          'EMPTY_COLLECTION',
          'entityHints boş dizi; yok sayılması tercih edilir.',
          'INFO',
          'request.entityHints'
        )
      ];
    }
    const issues: ValidationIssue[] = [];
    hints.forEach((hint, index) => {
      if (!isNonEmptyString(hint)) {
        issues.push(
          issue(
            this.id,
            'INVALID_PRIMITIVE',
            `entityHints[${index}] boş olmayan string olmalıdır.`,
            'ERROR',
            `request.entityHints[${index}]`
          )
        );
      }
    });
    return issues;
  }
};

export const readerOutputCollectionRule: ValidationRule = {
  id: 'reader-output-collection',
  name: 'Reader çıktı koleksiyon',
  description: 'Dizi çıktılarda boş koleksiyon uyarısı.',
  target: 'reader-output',
  defaultSeverity: 'WARNING',
  validate(context: ValidationContext): readonly ValidationIssue[] {
    const out = context.readerOutput;
    if (!Array.isArray(out)) {
      return [];
    }
    if (out.length === 0) {
      return [
        issue(
          this.id,
          'EMPTY_COLLECTION',
          'Reader çıktı dizisi boş.',
          'WARNING',
          'readerOutput'
        )
      ];
    }
    return [];
  }
};

export const datasetEntityShapeRule: ValidationRule = {
  id: 'dataset-entity-shape',
  name: 'Entity şekil kontrolü',
  description: 'Her entity için id ve entityType string kontrolü.',
  target: 'business-dataset',
  defaultSeverity: 'ERROR',
  validate(context: ValidationContext): readonly ValidationIssue[] {
    const entities = context.dataset?.entities;
    if (!Array.isArray(entities)) {
      return [];
    }
    const issues: ValidationIssue[] = [];
    entities.forEach((entity, index) => {
      if (!isPlainObject(entity as unknown as Record<string, unknown>) && typeof entity !== 'object') {
        issues.push(
          issue(
            this.id,
            'INVALID_PRIMITIVE',
            `entities[${index}] nesne olmalıdır.`,
            'ERROR',
            `dataset.entities[${index}]`
          )
        );
        return;
      }
      if (!isNonEmptyString(entity.id)) {
        issues.push(
          issue(
            this.id,
            'REQUIRED_FIELD',
            `entities[${index}].id zorunludur.`,
            'ERROR',
            `dataset.entities[${index}].id`
          )
        );
      }
      if (!isNonEmptyString(entity.entityType)) {
        issues.push(
          issue(
            this.id,
            'REQUIRED_FIELD',
            `entities[${index}].entityType zorunludur.`,
            'ERROR',
            `dataset.entities[${index}].entityType`
          )
        );
      }
      if (entity.columns !== undefined && !Array.isArray(entity.columns)) {
        issues.push(
          issue(
            this.id,
            'INVALID_COLLECTION',
            `entities[${index}].columns dizi olmalıdır.`,
            'ERROR',
            `dataset.entities[${index}].columns`
          )
        );
      }
      if (entity.rows !== undefined && !Array.isArray(entity.rows)) {
        issues.push(
          issue(
            this.id,
            'INVALID_COLLECTION',
            `entities[${index}].rows dizi olmalıdır.`,
            'ERROR',
            `dataset.entities[${index}].rows`
          )
        );
      }
    });
    return issues;
  }
};

/** Varsayılan kural seti */
export const BUILTIN_VALIDATION_RULES: readonly ValidationRule[] = Object.freeze([
  importRequestRequiredFieldsRule,
  importContextRequiredFieldsRule,
  readerOutputStructureRule,
  readerOutputCollectionRule,
  businessDatasetStructureRule,
  datasetEntityShapeRule,
  metadataRequiredFieldsRule,
  nullSafetyRule,
  entityHintsCollectionRule
]);
