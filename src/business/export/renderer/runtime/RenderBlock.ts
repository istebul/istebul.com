/**
 * İSTEBUL Business Export Engine — RenderBlock (PR-106C).
 *
 * Formatlardan bağımsız içerik bloğu; dosya / HTML / PDF üretmez.
 */

/**
 * Render blok türü.
 */
export type RenderBlockKind =
  | 'document-block'
  | 'widget'
  | 'kpi'
  | 'text'
  | 'reference';

/**
 * Render blok kaynağı.
 */
export type RenderBlockSource =
  | {
      type: 'section';
      sectionId: string;
      source: 'document' | 'dashboard';
    }
  | { type: 'widget'; widgetId: string }
  | { type: 'kpi'; kpiId: string }
  | { type: 'document'; documentId: string }
  | { type: 'dashboard'; dashboardId: string };

/**
 * Tek render bloğu — projection only.
 */
export interface RenderBlock {
  /** Blok kimliği */
  id: string;
  /** Tür */
  kind: RenderBlockKind;
  /** Bölüm içi sıra (deterministik) */
  order: number;
  /** Başlık */
  title: string;
  /** Kaynak izi */
  source: RenderBlockSource;
  /** Projeksiyon yükü — yeni içerik üretmez */
  payload: Readonly<Record<string, unknown>>;
}
