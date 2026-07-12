/**
 * GarsonAI production AI maliyet takibi.
 */

/** @type {Record<string, { input: number, output: number }>} */
const MODEL_TOKEN_RATES_PER_1K = {
  'llama-3.3-70b-versatile': { input: 0.00059, output: 0.00079 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'rule-based': { input: 0, output: 0 }
};

const COST_STORE_KEY = '__garsonAiProductionCost__';

/**
 * @returns {{ inputTokens: number, outputTokens: number, totalTokens: number, estimatedCostUsd: number, byModel: Record<string, { inputTokens: number, outputTokens: number, estimatedCostUsd: number }> }}
 */
function getCostStore() {
  const root = /** @type {Record<string, unknown>} */ (globalThis);
  if (!root[COST_STORE_KEY]) {
    root[COST_STORE_KEY] = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      byModel: {}
    };
  }
  return /** @type {{ inputTokens: number, outputTokens: number, totalTokens: number, estimatedCostUsd: number, byModel: Record<string, { inputTokens: number, outputTokens: number, estimatedCostUsd: number }> }} */ (
    root[COST_STORE_KEY]
  );
}

/**
 * @param {string} text
 * @returns {number}
 */
export function estimateTokenCount(text) {
  const normalized = String(text || '').trim();
  if (!normalized) return 0;
  return Math.max(1, Math.ceil(normalized.length / 4));
}

/**
 * @param {string} model
 * @param {number} inputTokens
 * @param {number} outputTokens
 */
export function estimateModelCostUsd(model, inputTokens, outputTokens) {
  const rates = MODEL_TOKEN_RATES_PER_1K[model] || MODEL_TOKEN_RATES_PER_1K['rule-based'];
  return Number(
    ((inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output).toFixed(6)
  );
}

/**
 * @param {{ model?: string, inputText?: string, outputText?: string, inputTokens?: number, outputTokens?: number }} usage
 */
export function recordAiCostUsage(usage = {}) {
  const model = String(usage.model || 'rule-based');
  const inputTokens = usage.inputTokens ?? estimateTokenCount(usage.inputText || '');
  const outputTokens = usage.outputTokens ?? estimateTokenCount(usage.outputText || '');
  const totalTokens = inputTokens + outputTokens;
  const estimatedCostUsd = estimateModelCostUsd(model, inputTokens, outputTokens);

  const store = getCostStore();
  store.inputTokens += inputTokens;
  store.outputTokens += outputTokens;
  store.totalTokens += totalTokens;
  store.estimatedCostUsd = Number((store.estimatedCostUsd + estimatedCostUsd).toFixed(6));

  if (!store.byModel[model]) {
    store.byModel[model] = { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };
  }
  store.byModel[model].inputTokens += inputTokens;
  store.byModel[model].outputTokens += outputTokens;
  store.byModel[model].estimatedCostUsd = Number(
    (store.byModel[model].estimatedCostUsd + estimatedCostUsd).toFixed(6)
  );

  return {
    model,
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd
  };
}

/**
 * @returns {{ inputTokens: number, outputTokens: number, totalTokens: number, estimatedCostUsd: number, byModel: Record<string, { inputTokens: number, outputTokens: number, estimatedCostUsd: number }> }}
 */
export function getAiCostSummary() {
  const store = getCostStore();
  return {
    inputTokens: store.inputTokens,
    outputTokens: store.outputTokens,
    totalTokens: store.totalTokens,
    estimatedCostUsd: store.estimatedCostUsd,
    byModel: { ...store.byModel }
  };
}

export function resetAiCostTracking() {
  const root = /** @type {Record<string, unknown>} */ (globalThis);
  delete root[COST_STORE_KEY];
}
