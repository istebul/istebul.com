/**
 * İSTEBUL Business — dataset şema sabitleri.
 *
 * JSON Schema dosyası bu PR’da zorunlu değildir; sürüm ve kök alan sözleşmesi burada tutulur.
 */

/** BusinessDataset kök şema sürümü */
export const BUSINESS_DATASET_SCHEMA_VERSION = '1.0.0';

/** Örnek JSON dosyalarında kullanılan kök alan adları */
export const BUSINESS_DATASET_ROOT_KEYS = Object.freeze([
  'id',
  'metadata',
  'version',
  'source',
  'entities',
  'relations',
  'attachments',
  'validation'
] as const);

export type BusinessDatasetRootKey =
  (typeof BUSINESS_DATASET_ROOT_KEYS)[number];
