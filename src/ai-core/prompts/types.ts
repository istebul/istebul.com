import type { AIModuleId } from '../types/common.ts';

export interface PromptTemplate {
  id: string;
  moduleId: AIModuleId;
  version: string;
  locale: string;
  /** System instruction template. Supports {{var}} placeholders. */
  system: string;
  /** Optional user message template. */
  user?: string;
  description?: string;
  variables?: string[];
}

export interface PromptRenderInput {
  variables?: Record<string, string | number | boolean | null | undefined>;
  locale?: string;
}
