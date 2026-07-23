/**
 * Built-in normalization rules (PR-101H).
 */

import type { FieldNormalizationState, NormalizationRule } from '../NormalizationRule';
import type { NormalizationWarning } from '../NormalizationResult';
import {
  inferPrimitiveType,
  isEmptyString,
  parseBoolean,
  parseDateIso,
  parseNumber,
  pushApplied
} from '../helpers';

function warn(
  state: FieldNormalizationState,
  code: string,
  message: string,
  ruleId: string
): NormalizationWarning {
  const w: NormalizationWarning = {
    code,
    message,
    ruleId,
    sourceKey: state.sourceKey,
    path: state.fieldName
  };
  state.warnings.push(w);
  return w;
}

export const mapFieldNameRule: NormalizationRule = {
  id: 'map-field-name',
  name: 'Alan adı eşlemesi',
  description: 'Semantic mapping ile business field adına dönüştürür.',
  apply(state, context): FieldNormalizationState {
    const mappings =
      context.mappings ?? context.semanticResult?.mappings ?? [];
    const map = mappings.find((m) => m.sourceKey === state.sourceKey);
    if (!map) {
      if (state.fieldName === state.sourceKey) {
        return state;
      }
      return state;
    }
    pushApplied(state, this.id);
    return {
      ...state,
      fieldName: map.targetColumnId,
      entityType: map.entityType
    };
  }
};

export const normalizeNullUndefinedRule: NormalizationRule = {
  id: 'normalize-null-undefined',
  name: 'Null / undefined',
  description: 'undefined → null; opsiyonel boş string → null.',
  apply(state, context): FieldNormalizationState {
    let next = { ...state, warnings: [...state.warnings], appliedRuleIds: [...state.appliedRuleIds] };
    if (next.value === undefined) {
      pushApplied(next, this.id);
      next = {
        ...next,
        value: null,
        primitiveType: 'null',
        typeTransformed: true
      };
    }
    if (
      context.emptyStringAsNull !== false &&
      isEmptyString(next.value)
    ) {
      pushApplied(next, this.id);
      next = {
        ...next,
        value: null,
        primitiveType: 'null',
        typeTransformed: true
      };
    }
    if (next.value === null && next.primitiveType !== 'null') {
      pushApplied(next, this.id);
      next = { ...next, primitiveType: 'null' };
    }
    return next;
  }
};

export const trimWhitespaceRule: NormalizationRule = {
  id: 'trim-whitespace',
  name: 'Whitespace trim',
  description: 'String değerlerde baş/son boşluk temizliği.',
  apply(state, context): FieldNormalizationState {
    if (context.trimWhitespace === false) {
      return state;
    }
    if (typeof state.value !== 'string') {
      return state;
    }
    const trimmed = state.value.trim();
    if (trimmed === state.value) {
      return state;
    }
    const next = {
      ...state,
      warnings: [...state.warnings],
      appliedRuleIds: [...state.appliedRuleIds],
      value: trimmed
    };
    pushApplied(next, this.id);
    if (trimmed !== state.value) {
      warn(next, 'TRIMMED', 'Değer trim edildi.', this.id);
    }
    return next;
  }
};

export const coerceNumberRule: NormalizationRule = {
  id: 'coerce-number',
  name: 'Sayı dönüşümü',
  description: 'String sayıları number tipine çevirir.',
  apply(state, context): FieldNormalizationState {
    if (context.coerceTypes === false) {
      return state;
    }
    if (state.value === null || Array.isArray(state.value)) {
      return state;
    }
    if (typeof state.value === 'number') {
      return { ...state, primitiveType: 'number' };
    }
    if (typeof state.value !== 'string') {
      return state;
    }
    const inferred = inferPrimitiveType(state.value);
    if (inferred !== 'number' && !/^-?\d/.test(state.value.trim())) {
      return state;
    }
    const parsed = parseNumber(state.value);
    if (parsed === null) {
      warn(
        { ...state, warnings: [...state.warnings] },
        'NUMBER_PARSE_FAILED',
        `Sayıya çevrilemedi: ${state.value}`,
        this.id
      );
      return state;
    }
    const next = {
      ...state,
      warnings: [...state.warnings],
      appliedRuleIds: [...state.appliedRuleIds],
      value: parsed,
      primitiveType: 'number' as const,
      typeTransformed: true
    };
    pushApplied(next, this.id);
    return next;
  }
};

export const coerceBooleanRule: NormalizationRule = {
  id: 'coerce-boolean',
  name: 'Boolean dönüşümü',
  description: 'String/boolean değerleri normalize eder.',
  apply(state, context): FieldNormalizationState {
    if (context.coerceTypes === false) {
      return state;
    }
    if (typeof state.value === 'boolean') {
      return { ...state, primitiveType: 'boolean' };
    }
    if (typeof state.value !== 'string') {
      return state;
    }
    const inferred = inferPrimitiveType(state.value);
    if (inferred !== 'boolean') {
      return state;
    }
    const parsed = parseBoolean(state.value);
    if (parsed === null) {
      return state;
    }
    const next = {
      ...state,
      warnings: [...state.warnings],
      appliedRuleIds: [...state.appliedRuleIds],
      value: parsed,
      primitiveType: 'boolean' as const,
      typeTransformed: true
    };
    pushApplied(next, this.id);
    return next;
  }
};

export const coerceDateRule: NormalizationRule = {
  id: 'coerce-date',
  name: 'Tarih dönüşümü',
  description: 'String/Date değerlerini ISO tarihe çevirir.',
  apply(state, context): FieldNormalizationState {
    if (context.coerceTypes === false) {
      return state;
    }
    if (state.value instanceof Date) {
      const iso = state.value.toISOString();
      const next = {
        ...state,
        warnings: [...state.warnings],
        appliedRuleIds: [...state.appliedRuleIds],
        value: iso,
        primitiveType: 'date' as const,
        dateIso: iso,
        typeTransformed: true
      };
      pushApplied(next, this.id);
      return next;
    }
    if (typeof state.value !== 'string') {
      return state;
    }
    const iso = parseDateIso(state.value);
    if (!iso) {
      if (inferPrimitiveType(state.value) === 'date') {
        warn(
          { ...state, warnings: [...state.warnings] },
          'DATE_PARSE_FAILED',
          `Tarihe çevrilemedi: ${state.value}`,
          this.id
        );
      }
      return state;
    }
    const next = {
      ...state,
      warnings: [...state.warnings],
      appliedRuleIds: [...state.appliedRuleIds],
      value: iso,
      primitiveType: 'date' as const,
      dateIso: iso,
      typeTransformed: true
    };
    pushApplied(next, this.id);
    return next;
  }
};

export const coerceStringRule: NormalizationRule = {
  id: 'coerce-string',
  name: 'String dönüşümü',
  description: 'Kalan değerleri string olarak normalize eder.',
  apply(state, context): FieldNormalizationState {
    if (context.coerceTypes === false) {
      return state;
    }
    if (
      state.value === null ||
      typeof state.value === 'string' ||
      typeof state.value === 'number' ||
      typeof state.value === 'boolean' ||
      state.primitiveType === 'date' ||
      state.primitiveType === 'collection'
    ) {
      if (typeof state.value === 'number' || typeof state.value === 'boolean') {
        const next = {
          ...state,
          warnings: [...state.warnings],
          appliedRuleIds: [...state.appliedRuleIds],
          primitiveType: state.primitiveType
        };
        return next;
      }
      return state;
    }
    const next = {
      ...state,
      warnings: [...state.warnings],
      appliedRuleIds: [...state.appliedRuleIds],
      value: String(state.value),
      primitiveType: 'string' as const,
      typeTransformed: true
    };
    pushApplied(next, this.id);
    return next;
  }
};

export const normalizeCollectionRule: NormalizationRule = {
  id: 'normalize-collection',
  name: 'Koleksiyon',
  description: 'Dizi değerleri collection tipinde işaretler.',
  apply(state): FieldNormalizationState {
    if (!Array.isArray(state.value) && !Array.isArray(state.rawValue)) {
      return state;
    }
    const arr = Array.isArray(state.value)
      ? state.value
      : Array.isArray(state.rawValue)
        ? state.rawValue
        : [];
    const next = {
      ...state,
      warnings: [...state.warnings],
      appliedRuleIds: [...state.appliedRuleIds],
      value: Object.freeze([...arr]),
      primitiveType: 'collection' as const,
      typeTransformed: state.primitiveType !== 'collection'
    };
    pushApplied(next, this.id);
    return next;
  }
};

export const BUILTIN_NORMALIZATION_RULES: readonly NormalizationRule[] =
  Object.freeze([
    mapFieldNameRule,
    normalizeNullUndefinedRule,
    trimWhitespaceRule,
    normalizeCollectionRule,
    coerceNumberRule,
    coerceBooleanRule,
    coerceDateRule,
    coerceStringRule
  ]);
