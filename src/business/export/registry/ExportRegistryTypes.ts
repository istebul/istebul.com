/**
 * Export profil kayıt girişi.
 */

export interface ExportProfileDefinition {
  id: string;
  name: string;
  description: string;
  reportDnaId?: string;
  defaultFormatIds: readonly string[];
  defaultTemplateId?: string;
  version: string;
}
