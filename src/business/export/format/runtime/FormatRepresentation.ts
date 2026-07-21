/**
 * İSTEBUL Business Export Engine — Format Representation kimlikleri (PR-106D).
 *
 * Bunlar dosya değil; formata özgü çıktı modeli kimlikleridir.
 */

/**
 * Desteklenen format temsilleri.
 */
export type FormatRepresentationKind =
  | 'pdf'
  | 'html'
  | 'docx'
  | 'markdown'
  | 'json';

export const FORMAT_REPRESENTATION_LABELS: Readonly<
  Record<FormatRepresentationKind, string>
> = Object.freeze({
  pdf: 'PDF Representation',
  html: 'HTML Representation',
  docx: 'DOCX Representation',
  markdown: 'Markdown Representation',
  json: 'JSON Representation'
});

export const FORMAT_REPRESENTATION_ORDER: readonly FormatRepresentationKind[] =
  Object.freeze(['pdf', 'html', 'docx', 'markdown', 'json']);

export const FORMAT_REPRESENTATION_MIME: Readonly<
  Record<FormatRepresentationKind, string>
> = Object.freeze({
  pdf: 'application/pdf',
  html: 'text/html',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  markdown: 'text/markdown',
  json: 'application/json'
});

export const FORMAT_REPRESENTATION_EXTENSION: Readonly<
  Record<FormatRepresentationKind, string>
> = Object.freeze({
  pdf: '.pdf',
  html: '.html',
  docx: '.docx',
  markdown: '.md',
  json: '.json'
});
