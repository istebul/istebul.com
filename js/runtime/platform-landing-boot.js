import { initPlatformLanding } from './platform-shell-landing.js';

function mountPlatformLanding() {
  if (typeof document === 'undefined') return false;
  if (!document.getElementById('platform-landing-mount')) return false;
  return initPlatformLanding();
}

if (typeof document !== 'undefined') {
  if (document.documentElement?.dataset?.ibRoute === 'home') {
    mountPlatformLanding();
  }

  document.addEventListener('routeChanged', (event) => {
    if (event.detail?.route === 'home') {
      mountPlatformLanding();
    }
  });
}
