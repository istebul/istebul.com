/**
 * GarsonAI WhatsApp Cloud API production katmanı.
 */
export {
  DEFAULT_GRAPH_API_BASE,
  DEFAULT_WHATSAPP_API_VERSION,
  buildGraphEndpoint,
  loadWhatsAppProductionConfig,
  parseRestaurantMap,
  readAccessToken,
  readApiVersion,
  readAppSecret,
  readPhoneNumberId,
  readVerifyToken,
  resolveWhatsAppEnv,
  validateWhatsAppProductionEnvironment
} from './config.js';

export {
  computeExponentialBackoffMs,
  fetchWithRetry,
  isRetryableHttpStatus,
  isRetryableNetworkError,
  withRetry
} from './retry.js';

export { logAudit, logDelivery, logError, logRetry } from './logging.js';

export {
  getWhatsAppProductionMetrics,
  recordDuplicateSkipped,
  recordMessageProcessed,
  recordMessageSent,
  recordProcessingLatency,
  recordWebhookFailed,
  recordWebhookReceived,
  resetWhatsAppProductionMetrics
} from './monitoring.js';

export {
  buildWebhookEventKey,
  isDuplicateEvent,
  markEventProcessed,
  resetDuplicateEventStore
} from './dedupe.js';

export { verifyWebhookSignature } from './signature.js';

export {
  extractRestaurantRoutesFromWebhook,
  resolveRestaurantFromPhoneNumberId,
  WhatsAppWebhookError
} from './restaurant-routing.js';

export { WhatsAppCloudApiClient, WhatsAppCloudApiError } from './cloud-api-client.js';

export { runWhatsAppOrderPipeline } from './order-pipeline.js';

export {
  handleWebhookRequest,
  handleWebhookVerification,
  processWebhookPost,
  WhatsAppProductionWebhookError
} from './webhook.js';
