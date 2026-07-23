/**
 * PipelineContext bağlantısı — PR-101A dosyalarını değiştirmeden bag’e yazar.
 */

import type { PipelineContext } from '../../pipeline/runtime/PipelineContext';
import type { ReaderLookupTelemetry } from './telemetry';
import { PIPELINE_BAG_READER_LOOKUP_KEY } from './telemetry';

/**
 * Reader lookup telemetrisini PipelineContext.bag’e bağlar.
 */
export function attachReaderLookupToPipelineContext(
  context: PipelineContext,
  telemetry: ReaderLookupTelemetry
): void {
  context.bag[PIPELINE_BAG_READER_LOOKUP_KEY] = telemetry;
}

/**
 * Bag’den reader lookup telemetrisini okur.
 */
export function readReaderLookupFromPipelineContext(
  context: PipelineContext
): ReaderLookupTelemetry | undefined {
  const value = context.bag[PIPELINE_BAG_READER_LOOKUP_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as ReaderLookupTelemetry;
}
