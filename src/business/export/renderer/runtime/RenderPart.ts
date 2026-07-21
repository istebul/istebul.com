/**
 * İSTEBUL Business Export Engine — Renderer parça kimlikleri (PR-106C).
 */

export type RenderPartId =
  | 'metadata'
  | 'header'
  | 'sections'
  | 'content-blocks'
  | 'footer';

export const RENDER_PART_LABELS: Readonly<Record<RenderPartId, string>> =
  Object.freeze({
    metadata: 'Render Metadata',
    header: 'Header',
    sections: 'Sections',
    'content-blocks': 'Content Blocks',
    footer: 'Footer'
  });

export const RENDER_PART_ORDER: readonly RenderPartId[] = Object.freeze([
  'metadata',
  'header',
  'sections',
  'content-blocks',
  'footer'
]);
