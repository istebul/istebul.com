/**
 * Format kayıt sözleşmesi — Knowledge OutputFormatId ile hizalı.
 */

import type { OutputFormatId } from '../../knowledge/outputs/OutputDefinition';

export interface FormatDefinitionEntry {
  id: OutputFormatId;
  name: string;
  description: string;
  mimeType: string;
  fileExtension: string;
  version: string;
}
