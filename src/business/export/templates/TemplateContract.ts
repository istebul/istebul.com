/**
 * Export şablon kayıt sözleşmesi.
 */

import type { OutputFormatId } from '../../knowledge/outputs/OutputDefinition';

export interface TemplateDefinitionEntry {
  id: string;
  name: string;
  description: string;
  formatId: OutputFormatId;
  reportDnaId?: string;
  version: string;
}
