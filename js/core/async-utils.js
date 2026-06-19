/**
 * Shared async helpers — prevent UI hangs on network/auth calls.
 */

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {T} [fallback]
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms, fallback = undefined) {
  if (!Number.isFinite(ms) || ms <= 0) return promise;
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve(fallback), ms);
    })
  ]);
}
