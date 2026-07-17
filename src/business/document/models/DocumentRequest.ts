/**
 * İSTEBUL Business Document Engine — doküman isteği.
 */

import type { OutputFormatId } from '../../knowledge/outputs/OutputDefinition';

/**
 * Document Engine girdisi — ReportModel’e referans.
 */
export interface DocumentRequest {
  /** İstek kimliği */
  id: string;
  /** Kaynak rapor model kimliği */
  reportModelId: string;
  /** Knowledge Report DNA kimliği */
  reportDnaId: string;
  /** Hedef çıktı formatları — dosya üretimi sonraki PR (Export Engine) */
  targetFormats?: readonly OutputFormatId[];
  /** Yerleşim kimliği — LayoutRegistry */
  layoutId?: string;
  /** Tema kimliği — ThemeRegistry */
  themeId?: string;
  /** Dil */
  locale?: 'tr' | 'en';
}
