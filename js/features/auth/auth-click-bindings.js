/**
 * Global auth CTA bindings — capture phase so nav/mobile buttons work even if init order shifts.
 */

const LOGIN_SELECTORS = [
    '[data-auth-open="login"]',
    '#login-btn',
    '#profile-login-btn',
    '[data-history-login]',
    '[data-mobile-login]',
    '#account-login-btn',
    '#switch-to-login'
].join(', ');

const REGISTER_SELECTORS = [
    '[data-auth-open="register"]',
    '#register-btn',
    '[data-history-register]',
    '[data-mobile-register]',
    '[data-account-register]',
    '#switch-to-register'
].join(', ');

function openAuth(mode) {
    const auth = window.app?.auth;
    if (!auth) {
        console.warn('[auth] App not ready — retry after init');
        return false;
    }

    if (mode === 'register') {
        auth.showRegisterModal();
    } else {
        auth.showLoginModal();
    }

    document.getElementById('nav-menu')?.classList.remove('show');
    return true;
}

function handleAuthClick(event) {
    if (!document.getElementById('auth-modal')) return;

    const registerTrigger = event.target.closest(REGISTER_SELECTORS);
    if (registerTrigger) {
        event.preventDefault();
        openAuth('register');
        return;
    }

    const loginTrigger = event.target.closest(LOGIN_SELECTORS);
    if (loginTrigger) {
        event.preventDefault();
        openAuth('login');
    }
}

document.addEventListener('click', handleAuthClick, true);

export { openAuth, handleAuthClick };
