/**
 * Debounced auto-apply listing filters (no submit click required).
 */

/**
 * @param {() => void | Promise<void>} fn
 * @param {number} ms
 */
function debounce(fn, ms = 420) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  };
}

/**
 * @param {HTMLFormElement | null} form
 * @param {() => void | Promise<void>} onApply
 */
export function wireAutoListingFilters(form, onApply) {
  if (!form || typeof onApply !== 'function') return () => {};

  const run = debounce(() => {
    Promise.resolve(onApply()).catch((err) => console.warn('[listings] auto-filter', err));
  }, 420);

  const fields = form.querySelectorAll(
    'select, input[type="number"], input[type="text"], input[type="search"]'
  );

  fields.forEach((field) => {
    field.addEventListener('input', run);
    field.addEventListener('change', run);
  });

  return () => fields.forEach((field) => {
    field.removeEventListener('input', run);
    field.removeEventListener('change', run);
  });
}
