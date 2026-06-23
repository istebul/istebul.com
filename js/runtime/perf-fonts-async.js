/**
 * Non-blocking perf-fonts.css and below-fold bundle CSS (CSP script-src-attr safe).
 */
(function activateDeferredStylesheets() {
  const links = document.querySelectorAll('link[data-perf-fonts-async], link[data-defer-stylesheet]');
  links.forEach((link) => {
    const apply = () => {
      link.media = 'all';
      link.removeAttribute('data-perf-fonts-async');
      link.removeAttribute('data-defer-stylesheet');
    };
    if (link.sheet) {
      apply();
      return;
    }
    link.addEventListener('load', apply, { once: true });
  });
})();
