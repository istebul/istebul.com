/**
 * AI Decision Engine V3 — unified mount with deterministic memory-lite enrichment.
 */
import { buildDecisionIntelligenceResult } from '../features/results/decision-intelligence-engine.js';
import { buildDecisionMemoryLite } from './decision-memory-lite.js';
import { mapDecisionSnapshot, mapDecisionToRenderModel } from './decision-v3-mappers.js';
import { renderDecisionV3Panel } from './decision-v3-renderer.js';

/**
 * @param {{
 *   mountNode?: HTMLElement|null,
 *   category?: string,
 *   formData?: object,
 *   metrics?: object,
 *   extras?: object,
 *   storage?: Storage,
 *   persistMemory?: boolean
 * }} params
 */
export async function tryMountDecisionEngineV3(params = {}) {
  try {
    const {
      mountNode,
      category = 'konut',
      formData = {},
      metrics = {},
      extras = {},
      storage,
      persistMemory = true
    } = params;

    if (!mountNode) return null;

    const intelligence = buildDecisionIntelligenceResult(category, formData, metrics, extras);
    const snapshot = mapDecisionSnapshot(intelligence, {
      vertical: category,
      totalCost: extras.totalCost ?? metrics.totalCost ?? null,
      badges: extras.badges,
      riskScore: extras.riskScore,
      decisionQualityScore: extras.decisionQualityScore
    });

    let memory = null;
    try {
      memory = buildDecisionMemoryLite(snapshot, { storage, persist: persistMemory });
    } catch {
      memory = null;
    }

    const model = mapDecisionToRenderModel(intelligence, {
      vertical: category,
      memory,
      title: extras.title
    });

    const existing = mountNode.querySelector('[data-decision-v3-root]');
    if (existing) existing.remove();

    const wrapper = document.createElement('div');
    wrapper.className = 'decision-v3-mount';
    wrapper.innerHTML = renderDecisionV3Panel(model);
    mountNode.prepend(wrapper);

    return {
      intelligence,
      snapshot,
      memory,
      model
    };
  } catch {
    return null;
  }
}

export { buildDecisionMemoryLite } from './decision-memory-lite.js';
export { mapDecisionSnapshot, mapDecisionToRenderModel } from './decision-v3-mappers.js';
export { renderDecisionV3Panel } from './decision-v3-renderer.js';
