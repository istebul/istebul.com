/**
 * GarsonAI production prompt kayıt defteri.
 */

/** @typedef {Object} PromptDefinition
 * @property {string} id
 * @property {string} version
 * @property {string} description
 * @property {boolean} active
 * @property {Record<string, unknown>} metadata
 */

/** @type {PromptDefinition[]} */
const PROMPT_HISTORY = [
  {
    id: 'garson-whatsapp-order',
    version: '1.0.0',
    description: 'WhatsApp sipariş ayrıştırma — kural tabanlı parser (varsayılan)',
    active: true,
    metadata: {
      channel: 'whatsapp',
      locale: 'tr',
      outputFormat: 'structured-order',
      engine: 'rule-based'
    }
  },
  {
    id: 'garson-whatsapp-order',
    version: '0.9.0',
    description: 'WhatsApp sipariş ayrıştırma — geçmiş sürüm',
    active: false,
    metadata: {
      channel: 'whatsapp',
      locale: 'tr',
      outputFormat: 'structured-order',
      engine: 'rule-based',
      deprecated: true
    }
  }
];

/**
 * @returns {PromptDefinition[]}
 */
export function listPromptDefinitions() {
  return PROMPT_HISTORY.map((entry) => ({ ...entry, metadata: { ...entry.metadata } }));
}

/**
 * @param {string} [promptId]
 * @returns {PromptDefinition|null}
 */
export function getActivePrompt(promptId = 'garson-whatsapp-order') {
  const id = String(promptId || '').trim();
  return (
    PROMPT_HISTORY.find((entry) => entry.id === id && entry.active) ||
    PROMPT_HISTORY.find((entry) => entry.active) ||
    null
  );
}

/**
 * @param {string} promptId
 * @param {string} [version]
 * @returns {PromptDefinition|null}
 */
export function getPromptByVersion(promptId, version) {
  const id = String(promptId || '').trim();
  const ver = String(version || '').trim();
  if (!id || !ver) return null;
  const match = PROMPT_HISTORY.find((entry) => entry.id === id && entry.version === ver);
  return match ? { ...match, metadata: { ...match.metadata } } : null;
}

/**
 * @param {string} [promptId]
 * @returns {PromptDefinition[]}
 */
export function getPromptHistory(promptId = 'garson-whatsapp-order') {
  const id = String(promptId || '').trim();
  return PROMPT_HISTORY.filter((entry) => entry.id === id).map((entry) => ({
    ...entry,
    metadata: { ...entry.metadata }
  }));
}
