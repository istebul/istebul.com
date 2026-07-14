/**
 * Shared AI Core types (P8-A).
 * No network I/O — stubs and in-memory abstractions only.
 */

export type AIProviderCode = 'openai' | 'groq' | 'xai' | 'mock';

export type AIModuleId =
  | 'reservation'
  | 'menu'
  | 'crm'
  | 'kitchen'
  | 'waiter'
  | 'payments'
  | 'customer'
  | 'inventory';

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  name?: string;
  /** Optional tool / function call payload (stub-ready). */
  toolCallId?: string;
  createdAt?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** Heuristic estimate until live provider usage is wired. */
  estimated: boolean;
}

export interface AIRequestMeta {
  restaurantId?: string;
  customerId?: string;
  conversationId?: string;
  moduleId?: AIModuleId;
  requestId?: string;
  /** Free-form caller tags for audit correlation. */
  tags?: string[];
}

export interface LLMCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  meta?: AIRequestMeta;
}

export interface LLMCompletionResult {
  ok: boolean;
  provider: AIProviderCode;
  model: string;
  message: ChatMessage;
  usage: TokenUsage;
  /** Always false in P8-A — marks that no remote LLM was contacted. */
  remoteCallAttempted: false;
  latencyMs: number;
  raw?: Record<string, unknown>;
  error?: string;
}

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
  meta?: AIRequestMeta;
}

export interface EmbeddingResult {
  ok: boolean;
  provider: AIProviderCode;
  model: string;
  embeddings: number[][];
  usage: TokenUsage;
  remoteCallAttempted: false;
  latencyMs: number;
  error?: string;
}

export interface ModerationRequest {
  input: string | string[];
  model?: string;
  meta?: AIRequestMeta;
}

export interface ModerationResult {
  ok: boolean;
  provider: AIProviderCode;
  model: string;
  flagged: boolean;
  categories: Record<string, boolean>;
  remoteCallAttempted: false;
  latencyMs: number;
  error?: string;
}

export interface AIAuditDecision {
  decisionType: string;
  summary: string;
  confidence?: number;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
}

export interface AIAuditEntry {
  id: string;
  timestamp: string;
  provider: AIProviderCode;
  moduleId?: AIModuleId;
  conversationId?: string;
  restaurantId?: string;
  customerId?: string;
  requestId?: string;
  decision: AIAuditDecision;
  usage?: TokenUsage;
  tags?: string[];
}
