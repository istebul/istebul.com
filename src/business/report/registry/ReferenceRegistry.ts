/**
 * Referans şablon kayıt sistemi — henüz içerik yok.
 */

import type { ReportReferenceKind } from '../models/ReportReference';

export interface ReferenceTemplateDefinition {
  code: string;
  kind: ReportReferenceKind;
  label: string;
  description: string;
  version: string;
}

const REFERENCES: ReferenceTemplateDefinition[] = [];

export const REFERENCE_REGISTRY: readonly ReferenceTemplateDefinition[] =
  Object.freeze(REFERENCES);

export function listReferenceTemplates(): readonly ReferenceTemplateDefinition[] {
  return REFERENCE_REGISTRY;
}

export function getReferenceTemplateByCode(
  code: string
): ReferenceTemplateDefinition | undefined {
  return REFERENCE_REGISTRY.find((entry) => entry.code === code);
}

export const REFERENCE_REGISTRY_COUNT = REFERENCE_REGISTRY.length;

export default REFERENCE_REGISTRY;
