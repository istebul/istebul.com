import type {
  AIProviderCode,
  ModerationRequest,
  ModerationResult,
} from '../types/common.ts';

/**
 * Strategy contract for content moderation providers.
 * P8-A: stub implementations only.
 */
export interface ModerationProvider {
  readonly code: AIProviderCode;
  readonly displayName: string;
  moderate(request: ModerationRequest): Promise<ModerationResult>;
}
