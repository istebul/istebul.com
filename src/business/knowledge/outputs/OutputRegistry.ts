/**
 * İSTEBUL Business — çıktı formatı kayıtları (statik).
 *
 * Desteklenen çıktılar: Dashboard, PDF, Word, PowerPoint, Excel, CSV, JSON.
 * Henüz üretim motoru yoktur.
 */

import type { OutputDefinition, OutputFormatId } from './OutputDefinition';

export const OUTPUT_REGISTRY: readonly OutputDefinition[] = Object.freeze([
  Object.freeze({
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Etkileşimli gösterge paneli çıktısı.',
    mimeType: '',
    fileExtension: '',
    order: 1
  }),
  Object.freeze({
    id: 'pdf',
    name: 'PDF',
    description: 'Paylaşılabilir PDF rapor çıktısı.',
    mimeType: 'application/pdf',
    fileExtension: '.pdf',
    order: 2
  }),
  Object.freeze({
    id: 'word',
    name: 'Word',
    description: 'Düzenlenebilir Word (DOCX) rapor çıktısı.',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileExtension: '.docx',
    order: 3
  }),
  Object.freeze({
    id: 'powerpoint',
    name: 'PowerPoint',
    description: 'Sunum için PowerPoint (PPTX) çıktısı.',
    mimeType:
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    fileExtension: '.pptx',
    order: 4
  }),
  Object.freeze({
    id: 'excel',
    name: 'Excel',
    description: 'Tablo ve sayısal analiz için Excel (XLSX) çıktısı.',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileExtension: '.xlsx',
    order: 5
  }),
  Object.freeze({
    id: 'csv',
    name: 'CSV',
    description: 'Ham veri dışa aktarımı için CSV çıktısı.',
    mimeType: 'text/csv',
    fileExtension: '.csv',
    order: 6
  }),
  Object.freeze({
    id: 'json',
    name: 'JSON',
    description: 'Makine okunabilir JSON çıktısı.',
    mimeType: 'application/json',
    fileExtension: '.json',
    order: 7
  })
]);

export function getOutputById(
  id: OutputFormatId
): OutputDefinition | undefined {
  return OUTPUT_REGISTRY.find((output) => output.id === id);
}

export function listOutputs(): readonly OutputDefinition[] {
  return OUTPUT_REGISTRY;
}

export const OUTPUT_COUNT = OUTPUT_REGISTRY.length;

export default OUTPUT_REGISTRY;
