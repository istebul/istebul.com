/**
 * Decision OS v1 overlay mount — silent fail, non-breaking for V2 flows.
 */

/**
 * @param {HTMLElement|null} mountNode
 * @param {object} params
 */
export async function mountDecisionOsOverlay(mountNode, params = {}) {
  if (!mountNode) return null;

  try {
    const { tryMountDecisionOs } = await import('/js/decision/decision-os-engine.js');
    return await tryMountDecisionOs({ mountNode, ...params });
  } catch {
    return null;
  }
}
