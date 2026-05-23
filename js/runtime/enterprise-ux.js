export function initEnterpriseUx() {
  if (typeof document === 'undefined') return;

  const markReady = () => {
    document.documentElement.classList.add('ib-ready');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', markReady, { once: true });
  } else {
    requestAnimationFrame(markReady);
  }

  document.addEventListener('routeChanged', () => {
    document.dispatchEvent(new CustomEvent('ib:refresh-icons'));
  });
}
