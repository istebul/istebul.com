/**
 * Global auth CTA bindings — capture phase so nav/mobile buttons work even if init order shifts.
 */

const LOGIN_SELECTORS = [
    '[data-auth-open="login"]',
    '#login-btn',
    '#profile-login-btn',
    '[data-history-login]',
    '[data-mobile-login]',
    '[data-mobile-header-login]',
    '#account-login-btn',
    '#switch-to-login'
].join(', ');

const REGISTER_SELECTORS = [
    '[data-auth-open="register"]',
    '#register-btn',
    '[data-history-register]',
    '[data-mobile-register]',
    '[data-mobile-header-register]',
    '[data-account-register]',
    '#switch-to-register'
].join(', ');

function authReturnPath() {
    if (typeof window === 'undefined') return '/';
    const path = `${window.location.pathname || '/'}${window.location.search || ''}`;
    return path.startsWith('/') ? path : '/';
}

function redirectToAuth(mode) {
    const ret = encodeURIComponent(authReturnPath());
    const target = mode === 'register' ? `/kayit?return=${ret}` : `/giris?return=${ret}`;
    window.location.assign(target);
    return true;
}

function openAuth(mode) {
    const auth = window.app?.auth;
    const hasModal = Boolean(document.getElementById('auth-modal'));

    if (!hasModal || !auth) {
        return redirectToAuth(mode);
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
