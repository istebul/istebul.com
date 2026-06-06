/**
 * Optional Decision Engine V3 overlay mount — silent fail, non-breaking for V2 flows.
 */

/**
 * @param {HTMLElement|null} mountNode
 * @param {object} params
 */
export async function mountDecisionEngineV3Overlay(mountNode, params = {}) {
  if (!mountNode) return null;

  try {
    const { tryMountDecisionEngineV3 } = await import('/js/decision/ai-decision-engine-v3.js');
    return await tryMountDecisionEngineV3({ mountNode, ...params });
  } catch {
    return null;
  }
}
