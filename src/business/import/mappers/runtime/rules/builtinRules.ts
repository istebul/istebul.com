/**
 * Built-in semantic mapping rules (PR-101G).
 */

import type { BusinessEntityTypeId } from '../../../../dataset/entities/BusinessEntityType';
import { BUSINESS_FIELD_CATALOG } from '../fieldCatalog';
import { normalizeSemanticKey, roundConfidence } from '../helpers';
import type { SemanticCandidate } from '../SemanticCandidate';
import type { SemanticContext } from '../SemanticContext';
import type { BusinessFieldDefinition, SemanticRule } from '../SemanticRule';

function hintBoost(
  entityType: BusinessEntityTypeId,
  context: SemanticContext
): number {
  if (!context.entityHints?.includes(entityType)) {
    return 0;
  }
  return 0.08;
}

function catalogWithNormalizedAliases(): Array<
  BusinessFieldDefinition & { normalizedAliases: string[] }
> {
  return BUSINESS_FIELD_CATALOG.map((field) => ({
    ...field,
    normalizedAliases: field.aliases.map((a) => normalizeSemanticKey(a))
  }));
}

const CATALOG = catalogWithNormalizedAliases();

/**
 * Tam eşleşme: normalize kolon === fieldId veya alias.
 */
export const exactMatchRule: SemanticRule = {
  id: 'exact-field-match',
  name: 'Tam alan eşleşmesi',
  description: 'Case-insensitive / Türkçe normalize tam eşleşme.',
  match(sourceKey, normalizedKey, context): readonly SemanticCandidate[] {
    const out: SemanticCandidate[] = [];
    for (const field of CATALOG) {
      const exactField = normalizedKey === normalizeSemanticKey(field.fieldId);
      const exactAlias = field.normalizedAliases.includes(normalizedKey);
      if (!exactField && !exactAlias) {
        continue;
      }
      const base = exactField ? 0.98 : 0.95;
      out.push({
        sourceKey,
        businessField: field.fieldId,
        entityType: field.entityType,
        confidence: roundConfidence(base + hintBoost(field.entityType, context)),
        reason: exactField
          ? `Tam alan adı eşleşmesi: ${field.fieldId}`
          : `Tam alias eşleşmesi: ${field.fieldId}`,
        ruleId: this.id
      });
    }
    return out;
  }
};

/**
 * Alias / kısmi içerik eşleşmesi.
 */
export const aliasContainsRule: SemanticRule = {
  id: 'alias-contains-match',
  name: 'Alias / içerik eşleşmesi',
  description: 'Normalize anahtar alias içerir veya alias anahtarı içerir.',
  match(sourceKey, normalizedKey, context): readonly SemanticCandidate[] {
    const out: SemanticCandidate[] = [];
    for (const field of CATALOG) {
      for (const alias of field.normalizedAliases) {
        if (normalizedKey === alias) {
          // exact rule kapsar
          continue;
        }
        const contains =
          normalizedKey.includes(alias) || alias.includes(normalizedKey);
        if (!contains || alias.length < 2 || normalizedKey.length < 2) {
          continue;
        }
        const longer = Math.max(normalizedKey.length, alias.length);
        const shorter = Math.min(normalizedKey.length, alias.length);
        const ratio = shorter / longer;
        if (ratio < 0.4) {
          continue;
        }
        out.push({
          sourceKey,
          businessField: field.fieldId,
          entityType: field.entityType,
          confidence: roundConfidence(
            0.55 + ratio * 0.3 + hintBoost(field.entityType, context)
          ),
          reason: `Alias içerik eşleşmesi: ${alias} → ${field.fieldId}`,
          ruleId: this.id
        });
        break;
      }
    }
    return out;
  }
};

/**
 * Schema Detection candidateFields zenginleştirmesi.
 */
export const schemaCandidateBridgeRule: SemanticRule = {
  id: 'schema-candidate-bridge',
  name: 'Schema Detection aday köprüsü',
  description: 'DetectedColumn.candidateFields → semantic aday.',
  match(sourceKey, _normalizedKey, context): readonly SemanticCandidate[] {
    const col = context.detectedColumns?.find((c) => c.name === sourceKey);
    if (!col?.candidateFields?.length) {
      return [];
    }
    const out: SemanticCandidate[] = [];
    for (const cf of col.candidateFields) {
      const field = CATALOG.find((f) => f.fieldId === cf.fieldKey);
      const entityType = field?.entityType ?? context.entityHints?.[0] ?? 'urun';
      out.push({
        sourceKey,
        businessField: cf.fieldKey,
        entityType,
        confidence: roundConfidence(
          Math.min(0.93, (cf.confidence ?? 0.6) + hintBoost(entityType, context))
        ),
        reason: cf.reason ?? `Schema Detection adayı: ${cf.fieldKey}`,
        ruleId: this.id
      });
    }
    return out;
  }
};

/**
 * Entity hint ile alan önceliği — zayıf genel aday.
 */
export const entityHintSoftRule: SemanticRule = {
  id: 'entity-hint-soft',
  name: 'Entity hint yumuşak eşleşme',
  description: 'Hint edilen entity’nin name alanına düşük güvenli aday.',
  match(sourceKey, normalizedKey, context): readonly SemanticCandidate[] {
    if (!context.entityHints?.length) {
      return [];
    }
    if (!/(ad|name|title|baslik)/.test(normalizedKey)) {
      return [];
    }
    const entityType = context.entityHints[0]!;
    return [
      {
        sourceKey,
        businessField: 'name',
        entityType,
        confidence: roundConfidence(0.42),
        reason: `Entity hint soft match → ${entityType}.name`,
        ruleId: this.id
      }
    ];
  }
};

export const BUILTIN_SEMANTIC_RULES: readonly SemanticRule[] = Object.freeze([
  exactMatchRule,
  aliasContainsRule,
  schemaCandidateBridgeRule,
  entityHintSoftRule
]);
