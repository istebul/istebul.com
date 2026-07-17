/**
 * Yerleşim kayıt sözleşmesi.
 */

import type {
  DocumentOrientation,
  DocumentPageSize
} from '../models/DocumentLayout';

export interface LayoutDefinitionEntry {
  id: string;
  name: string;
  description: string;
  pageSize: DocumentPageSize;
  orientation: DocumentOrientation;
  version: string;
}
