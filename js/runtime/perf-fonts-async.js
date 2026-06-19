/**
 * Non-blocking perf-fonts.css without inline onload handlers (CSP script-src-attr).
 */
(function activatePerfFonts() {
  const links = document.querySelectorAll('link[data-perf-fonts-async]');
  links.forEach((link) => {
    const apply = () => {
      link.media = 'all';
      link.removeAttribute('data-perf-fonts-async');
    };
    if (link.sheet) {
      apply();
      return;
    }
    link.addEventListener('load', apply, { once: true });
  });
})();
