/**
 * Doküman profil kayıt girişi.
 */

export interface DocumentProfileDefinition {
  id: string;
  name: string;
  description: string;
  reportDnaId: string;
  defaultLayoutId: string;
  defaultThemeId: string;
  version: string;
}
