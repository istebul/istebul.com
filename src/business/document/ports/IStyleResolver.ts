import type { DocumentContext } from '../models/DocumentContext';
import type { DocumentStyle } from '../models/DocumentStyle';
import type { DocumentTheme } from '../models/DocumentTheme';

export interface IStyleResolver {
  resolve(
    context: DocumentContext,
    themeId: string,
    styleId?: string
  ): Promise<Readonly<{ style: DocumentStyle; theme: DocumentTheme }>>;
}
