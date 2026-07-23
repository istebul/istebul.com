/**
 * İSTEBUL Business — entity ilişki tip sözleşmesi.
 */

/**
 * İlişki türü.
 */
export type BusinessRelationKind =
  | 'bire-bir'
  | 'bire-cok'
  | 'cok-cok'
  | 'referans'
  | 'hiyerarsi';

/**
 * İki entity arasındaki ilişki tanımı.
 */
export interface BusinessRelation {
  /** İlişki kimliği */
  id: string;
  /** Kaynak entity kimliği */
  fromEntityId: string;
  /** Hedef entity kimliği */
  toEntityId: string;
  /** İlişki türü */
  kind: BusinessRelationKind;
  /** Görünen ad (Türkçe) */
  name: string;
  /** Açıklama */
  description?: string;
  /** Kaynak sütun kimliği (foreign key benzeri) */
  fromColumnId?: string;
  /** Hedef sütun kimliği */
  toColumnId?: string;
}
