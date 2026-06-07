/**
 * AI Auto Listing Builder — pipeline stage logging.
 */

const LOG_PREFIX = '[ai-listings-builder]';

/**
 * @param {string} stage
 * @param {unknown} [payload]
 */
export function logBuilderStage(stage, payload) {
  try {
    if (payload === undefined) {
      console.debug(`${LOG_PREFIX} ${stage}`);
      return;
    }
    console.debug(`${LOG_PREFIX} ${stage}`, payload);
  } catch {
    // Logging must never break the builder pipeline.
  }
}

/**
 * @param {string} stage
 * @param {unknown} error
 */
export function logBuilderError(stage, error) {
  try {
    console.error(`${LOG_PREFIX} ${stage}`, error);
  } catch {
    // noop
  }
}
