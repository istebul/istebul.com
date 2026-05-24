/**
 * Executive UX micro-interactions (nav scroll state, focus polish).
 */
export function initExecutivePolish() {
  if (typeof document === 'undefined') return;

  const nav = document.getElementById('main-nav') || document.querySelector('.navbar');
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('nav-scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  document.addEventListener('ib:refresh-icons', () => {
    window.lucide?.createIcons?.();
  });
}
