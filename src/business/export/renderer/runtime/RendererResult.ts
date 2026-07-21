/**
 * İSTEBUL Business Export Engine — Renderer Runtime sonucu (PR-106C).
 */

import type { RenderDocument, RenderMetadata } from './RenderDocument';

/**
 * Renderer uyarısı.
 */
export interface RendererWarning {
  code: string;
  message: string;
}

/**
 * Renderer telemetrisi.
 */
export interface RendererTelemetry {
  /** Execution duration (ms) */
  durationMs: number;
  startedAt: string;
  endedAt: string;
  /** Rendered section count */
  renderedSectionCount: number;
  /** Rendered block count */
  renderedBlockCount: number;
  warningCount: number;
}

/**
 * Renderer Runtime çıktısı.
 */
export interface RendererResult {
  /** Formatlardan bağımsız RenderDocument */
  document: RenderDocument;
  /** Render metadata */
  metadata: RenderMetadata;
  /** Uyarılar */
  warnings: readonly RendererWarning[];
  /** Telemetri */
  telemetry: RendererTelemetry;
}

/** Pipeline bag anahtarı — Export Engine Renderer */
export const PIPELINE_BAG_EXPORT_RENDERER_RUNTIME_RESULT_KEY =
  'exportRendererRuntimeResult' as const;
