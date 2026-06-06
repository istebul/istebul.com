/**
 * Decision OS v1 — unified mount engine (progressive enhancement over V2).
 */
import { buildDecisionIntelligenceResult } from '../features/results/decision-intelligence-engine.js';
import { buildDecisionMemoryLite } from './decision-memory-lite.js';
import { isDecisionOsEnabled } from './decision-os-flags.js';
import { buildDecisionOsModel } from './decision-os-mappers.js';
import { bindDecisionOsInteractions } from './decision-os-bindings.js';
import { ensureDecisionOsStyles, renderDecisionOsPanel } from './decision-os-renderer.js';
import { resolveTotalCost } from './decision-v3-whatif.js';

const V2_ROOT_SELECTORS = [
  '.auto-v2-root',
  '.konut-v2-root',
  '.tatil-v2-root',
  '.finansman-v2-root',
  '.sigorta-v2-root',
  '.kasko-v2-root'
];

function findV2Root(mountNode) {
  if (!mountNode) return null;
  for (const selector of V2_ROOT_SELECTORS) {
    const node = mountNode.querySelector(selector);
    if (node) return node;
  }
  return null;
}

function hideV2ForDecisionOs(mountNode) {
  const v2Root = findV2Root(mountNode);
  if (!v2Root) return null;
  v2Root.setAttribute('data-dos-legacy-v2', '1');
  v2Root.hidden = true;
  return v2Root;
}

/**
 * @param {{
 *   mountNode?: HTMLElement|null,
 *   category?: string,
 *   formData?: object,
 *   metrics?: object,
 *   extras?: object,
 *   storage?: Storage,
 *   intelligence?: object,
 *   model?: object
 * }} params
 */
export async function tryMountDecisionOs(params = {}) {
  try {
    if (!isDecisionOsEnabled()) return null;

    const {
      mountNode,
      category = 'konut',
      formData = {},
      metrics = {},
      extras = {},
      storage,
      intelligence: providedIntel,
      model: v2Model
    } = params;

    if (!mountNode) return null;

    ensureDecisionOsStyles();

    const intelligence =
      providedIntel ||
      v2Model?.intelligence ||
      buildDecisionIntelligenceResult(category, formData, metrics, extras);

    let memory = null;
    try {
      memory = buildDecisionMemoryLite(
        {
          vertical: category,
          decisionScore: intelligence.decisionScore,
          confidenceScore: intelligence.confidenceScore
        },
        { storage, persist: true }
      );
    } catch {
      memory = extras.memory || v2Model?.memory || null;
    }

    const whatIfInput = {
      category,
      formData,
      metrics,
      extras: {
        ...extras,
        totalCost:
          extras.totalCost ??
          metrics.totalCost ??
          v2Model?.totalCost?.value ??
          resolveTotalCost(intelligence, { category, metrics, extras })
      }
    };

    const osModel = buildDecisionOsModel(intelligence, {
      vertical: category,
      formData,
      metrics,
      extras,
      memory,
      totalCost: whatIfInput.extras.totalCost,
      title: extras.title || v2Model?.title,
      executiveSummary: extras.executiveSummary || v2Model?.executiveSummary,
      strengths: extras.strengths || v2Model?.strengths,
      cautions: extras.cautions || v2Model?.cautions || v2Model?.weaknesses,
      alternatives: extras.alternatives || v2Model?.alternatives,
      insight: extras.insight || v2Model?.insight,
      whatIfInput,
      evdsAvailable: Boolean(extras.evdsRiskLayer || v2Model?.evdsRiskLayer)
    });

    const existing = mountNode.querySelector('[data-decision-os-root]');
    if (existing) existing.remove();

    const wrapper = document.createElement('div');
    wrapper.className = 'decision-os-mount';
    wrapper.innerHTML = renderDecisionOsPanel(osModel);
    mountNode.prepend(wrapper);

    mountNode.setAttribute('data-decision-os-active', '1');

    const v2Root = hideV2ForDecisionOs(mountNode);
    const legacySlot = wrapper.querySelector('[data-dos-legacy]');
    if (v2Root && legacySlot) {
      legacySlot.appendChild(v2Root);
      v2Root.hidden = false;
    }

    const root = wrapper.querySelector('[data-decision-os-root]');
    bindDecisionOsInteractions(root, osModel);

    return { intelligence, memory, model: osModel, root };
  } catch {
    return null;
  }
}

export { isDecisionOsEnabled } from './decision-os-flags.js';
export { buildDecisionOsModel, mapVerdict } from './decision-os-mappers.js';
export { renderDecisionOsPanel, ensureDecisionOsStyles } from './decision-os-renderer.js';
export { bindDecisionOsInteractions } from './decision-os-bindings.js';
