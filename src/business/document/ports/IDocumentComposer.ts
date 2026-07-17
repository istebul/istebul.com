import type { DocumentContext } from '../models/DocumentContext';
import type { DocumentFooter } from '../models/DocumentFooter';
import type { DocumentHeader } from '../models/DocumentHeader';
import type { DocumentLayout } from '../models/DocumentLayout';
import type { DocumentMetadata } from '../models/DocumentMetadata';
import type { DocumentModel } from '../models/DocumentModel';
import type { DocumentSection } from '../models/DocumentSection';
import type { DocumentStyle } from '../models/DocumentStyle';
import type { DocumentTheme } from '../models/DocumentTheme';

export interface IDocumentComposer {
  compose(
    context: DocumentContext,
    parts: Readonly<{
      metadata: DocumentMetadata;
      layout: DocumentLayout;
      style: DocumentStyle;
      theme: DocumentTheme;
      header: DocumentHeader;
      footer: DocumentFooter;
      sections: readonly DocumentSection[];
    }>
  ): Promise<DocumentModel>;
}
