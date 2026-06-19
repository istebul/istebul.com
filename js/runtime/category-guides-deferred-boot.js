/**
 * Deferred category guides hub init (vertical shells — CSP-safe).
 */
const bootGuides = () =>
  import('/js/runtime/init-category-guides.js')
    .then((m) => m.initCategoryGuidesHub())
    .catch(() => {});
if ('requestIdleCallback' in window) {
  requestIdleCallback(bootGuides, { timeout: 4000 });
} else {
  setTimeout(bootGuides, 800);
}
