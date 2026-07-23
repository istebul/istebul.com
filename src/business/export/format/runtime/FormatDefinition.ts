/**
 * İSTEBUL Business Export Engine — FormatDefinition (PR-106D).
 *
 * Foundation `formats/FormatContract` ile karıştırılmamalıdır.
 * Bu tip yalnızca Format Runtime temsil kayıtları içindir.
 */

import type { FormatRepresentationKind } from './FormatRepresentation';

/**
 * Format Runtime tanımı — dosya üretmez.
 */
export interface FormatDefinition {
  /** Temsil kimliği */
  id: FormatRepresentationKind;
  /** Görünen ad */
  name: string;
  /** MIME türü (önerilen) */
  mimeType: string;
  /** Dosya uzantısı önerisi — yazılmaz */
  fileExtension: string;
  /** Deterministik sıra */
  order: number;
  /** Etkin mi */
  enabled: boolean;
}
