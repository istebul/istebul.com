// Authentication Manager
import { supabase } from '../../core/supabase.js';
import { state } from '../../core/state.js';
import API from '../../core/api.js';
import config from '../../core/config.js';
import { monitoring } from '../../core/monitoring.js';
import { analytics } from '../../core/analytics.js';
import { mapAuthError, mapAuthErrorForCheckout } from './auth-errors.js';
import { peekCheckoutIntent } from '../../core/checkout-intent.js';
import { enrollSignupNurture } from '../lifecycle/lifecycle-client.js';
import { enrollOnboardingHelp } from '../customer/customer-ops-client.js';
import {
    attributeReferralSignupFromStorage,
    ensureServerReferralCode
} from '../growth/referral-client.js';
import { getStoredReferralCode } from '../growth/growth-engine.js';
import { trackOpsEvent } from '../../core/operational-telemetry.js';
import {
    bindAuthModalA11y,
    focusFirstField,
    setSubmitLoading,
    showInlineFormBanner,
    clearInlineFormBanner
} from '../../runtime/enterprise-form-ux.js';
import { CONVERSION_COPY, getAuthModalTitle } from '../../core/conversion-copy.js';

export class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Keep auth callback synchronous. Supabase calls inside this callback can delay sign-in resolution.
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                this.currentUser = session.user;
                state.setUser(session.user);

                document.dispatchEvent(new CustomEvent('userLoggedIn', {
                    detail: session.user
                }));

                const nurtureKey = `istebul_lifecycle_signup:${session.user.id}`;
                try {
                    if (!localStorage.getItem(nurtureKey)) {
                        enrollSignupNurture(session.user).then((result) => {
                            if (result?.ok) localStorage.setItem(nurtureKey, '1');
                        });
                        enrollOnboardingHelp({
                            email: session.user.email,
                            user_id: session.user.id,
                            trigger_source: 'auth_signed_in'
                        }).catch(() => {});
                    }
                } catch {
                    /* ignore */
                }

                ensureServerReferralCode().catch(() => {});
                if (getStoredReferralCode()) {
                    attributeReferralSignupFromStorage().catch(() => {});
                }

                this.hideAuthModal();

                setTimeout(async () => {
                    try {
                        const profile = await API.getProfile(session.user.id);
                        this.currentUser.profile = profile;
                        state.set('user.profile', profile);
                    } catch (error) {
                        console.error('Failed to load profile:', error);
                    }
                }, 0);
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                state.setUser(null);

                document.dispatchEvent(new CustomEvent('userLoggedOut'));

                this.hideAuthModal();
            }
        });
    }

    showLoginModal(options = {}) {
        this.showAuthModal('login', options);
    }

    showRegisterModal(options = {}) {
        this.showAuthModal('register', options);
    }

    showCheckoutAuthGate() {
        this.showAuthModal('register', { intent: 'checkout' });
    }

    showAuthModal(type, options = {}) {
        const modal = document.getElementById('auth-modal');
        if (!modal) {
            console.warn('[auth] auth-modal not found on this page');
            return;
        }

        const modalHeader = modal.querySelector('.modal-header h3');
        const modalBody = modal.querySelector('.modal-body');
        if (!modalBody) {
            console.warn('[auth] auth-modal body missing');
            return;
        }

        if (modalHeader) {
            modalHeader.textContent = getAuthModalTitle(type, options.intent === 'checkout');
        }

        const intentBanner = options.intent === 'checkout'
            ? `<p class="auth-intent-banner" role="note">
                <strong>Pro ödeme adımı</strong> — ${CONVERSION_COPY.auth.checkoutIntentBanner}
                <a href="/kvkk.html" target="_blank" rel="noopener">KVKK</a>
              </p>`
            : '';

        modalBody.innerHTML = intentBanner + (type === 'login' ? this.getLoginForm() : this.getRegisterForm());
        modal.classList.add('auth-modal');
        document.body.classList.add('modal-open');

        analytics.track('auth_modal_open', { mode: type }, {
            category: 'auth',
            funnel: 'auth',
            funnel_step: type === 'login' ? 'login_modal' : 'register_modal'
        });

        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        state.setModal('auth');

        bindAuthModalA11y(modal, () => this.hideAuthModal());
        clearInlineFormBanner(modalBody);

        // Setup form handlers
        this.setupAuthForm(type);

        requestAnimationFrame(() => focusFirstField(modalBody));
    }

    hideAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (!modal) return;

        modal.classList.remove('show');
        modal.classList.remove('auth-modal');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        state.setModal(null);
    }

    getLoginForm() {
        return `
            <form id="login-form" data-enterprise-form novalidate>
                <div class="form-group">
                    <label for="email">E-posta</label>
                    <input type="email" id="email" name="email" autocomplete="email" required>
                </div>
                <div class="form-group">
                    <label for="password">Şifre</label>
                    <input type="password" id="password" name="password" autocomplete="current-password" required>
                </div>
                <button type="submit" class="btn btn-primary full-width auth-submit">${CONVERSION_COPY.auth.loginSubmit}</button>
            </form>
            <div class="modal-footer">
                <p>Şifrenizi mi unuttunuz? <a href="#" id="forgot-password">Sıfırlayın</a></p>
                <p>Hesabınız yok mu? <a href="#" id="switch-to-register">${CONVERSION_COPY.auth.switchToRegister}</a></p>
            </div>
        `;
    }

    getRegisterForm() {
        return `
            <form id="register-form" data-enterprise-form>
                <div class="form-group">
                    <label for="full-name">Ad Soyad</label>
                    <input type="text" id="full-name" name="full-name" autocomplete="name" required>
                </div>
                <div class="form-group">
                    <label for="email">E-posta</label>
                    <input type="email" id="email" name="email" autocomplete="email" required>
                </div>
                <div class="form-group">
                    <label for="password">Şifre</label>
                    <input type="password" id="password" name="password" autocomplete="new-password" required minlength="8" aria-describedby="password-hint">
                    <small id="password-hint" class="form-hint">En az 8 karakter; büyük harf, küçük harf ve rakam önerilir</small>
                </div>
                <div class="form-group">
                    <label for="confirm-password">Şifre Tekrar</label>
                    <input type="password" id="confirm-password" name="confirm-password" autocomplete="new-password" required>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="terms" name="terms" required>
                        <span><a href="/kullanim-sartlari.html" target="_blank" rel="noopener">Kullanım şartları</a> ve <a href="/kvkk.html" target="_blank" rel="noopener">KVKK</a> metnini kabul ediyorum</span>
                    </label>
                </div>
                <button type="submit" class="btn btn-primary full-width auth-submit" data-enterprise-form>${CONVERSION_COPY.auth.registerSubmit}</button>
            </form>
            <div class="modal-footer">
                <p>Zaten hesabınız var mı? <a href="#" id="switch-to-login">${CONVERSION_COPY.auth.switchToLogin}</a></p>
            </div>
        `;
    }

    setupAuthForm(type) {
        const form = document.getElementById(`${type}-form`);
        const modal = document.getElementById('auth-modal');

        if (!form || !modal) {
            console.warn('[auth] Could not bind auth form', type);
            return;
        }

        if (!modal.dataset.authCloseBound) {
            modal.dataset.authCloseBound = 'true';
            const closeBtn = modal.querySelector('.modal-close');
            closeBtn?.addEventListener('click', () => {
                this.hideAuthModal();
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideAuthModal();
                }
            });
        }

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (type === 'login') {
                await this.handleLogin(form);
            } else {
                await this.handleRegister(form);
            }
        });

        // Switch forms
        const switchToRegister = document.getElementById('switch-to-register');
        const switchToLogin = document.getElementById('switch-to-login');
        const forgotPassword = document.getElementById('forgot-password');

        const checkoutIntentActive = () => Boolean(peekCheckoutIntent());

        if (switchToRegister) {
            switchToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegisterModal(checkoutIntentActive() ? { intent: 'checkout' } : {});
            });
        }

        if (switchToLogin) {
            switchToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginModal(checkoutIntentActive() ? { intent: 'checkout' } : {});
            });
        }

        if (forgotPassword) {
            forgotPassword.addEventListener('click', (e) => {
                e.preventDefault();
                this.showForgotPasswordForm();
            });
        }
    }

    async handleLogin(form) {
        const submitBtn = form.querySelector('button[type="submit"]');

        try {
            setSubmitLoading(submitBtn, true, { busyLabel: CONVERSION_COPY.auth.loginBusy });

            const email = form.email.value;
            const password = form.password.value;

            analytics.track('auth_login_start', { email_domain: email.split('@')[1] || '' }, {
                category: 'auth',
                funnel: 'auth',
                funnel_step: 'login_start'
            });

            const result = await API.signIn(email, password);
            const user = result?.user || result?.session?.user;

            if (!user) {
                throw new Error(CONVERSION_COPY.auth.loginFailed);
            }

            this.currentUser = user;
            state.setUser(user);

            document.dispatchEvent(new CustomEvent('userLoggedIn', {
                detail: user
            }));

            analytics.track('auth_login_success', {}, { category: 'auth', funnel: 'auth', funnel_step: 'login_success' });

            const pendingCheckout = Boolean(peekCheckoutIntent());
            if (pendingCheckout) {
                this.showAuthSuccess(CONVERSION_COPY.auth.successCheckoutLogin);
                setTimeout(() => this.hideAuthModal(), 1200);
            } else {
                this.hideAuthModal();
            }
        } catch (error) {
            console.error('Login failed:', error);
            analytics.track('auth_login_failed', { message: error.message || 'login_failed' }, {
                category: 'auth',
                funnel: 'auth',
                funnel_step: 'login_failed'
            });
            trackOpsEvent('auth_login_failed', {
                error_code: error.code || 'login_failed'
            }, { category: 'auth', severity: 'warning' });
            const pendingCheckout = Boolean(peekCheckoutIntent());
            const mapFn = pendingCheckout ? mapAuthErrorForCheckout : mapAuthError;
            this.showAuthError(mapFn(error, config.messages.error.login));
        } finally {
            setSubmitLoading(submitBtn, false);
        }
    }

    async handleRegister(form) {
        const submitBtn = form.querySelector('button[type="submit"]');

        try {
            setSubmitLoading(submitBtn, true, { busyLabel: CONVERSION_COPY.auth.registerBusy });

            const fullName = form['full-name'].value;
            const email = form.email.value;
            const password = form.password.value;
            const confirmPassword = form['confirm-password'].value;

            // Validation
            if (password !== confirmPassword) {
                throw new Error('Şifreler eşleşmiyor');
            }

            if (password.length < config.validation.password.minLength) {
                throw new Error(`Şifre en az ${config.validation.password.minLength} karakter olmalıdır`);
            }

            analytics.track('auth_register_start', {}, {
                category: 'auth',
                funnel: 'auth',
                funnel_step: 'register_start'
            });

            const pendingCheckout = Boolean(peekCheckoutIntent());

            const signUpResult = await API.signUp(email, password, {
                full_name: fullName
            });

            analytics.track('auth_register_success', {}, {
                category: 'auth',
                funnel: 'auth',
                funnel_step: 'register_success'
            });

            const session = signUpResult?.session;
            const signedUpUser = session?.user || signUpResult?.user;

            if (session && signedUpUser) {
                this.currentUser = signedUpUser;
                state.setUser(signedUpUser);
                document.dispatchEvent(new CustomEvent('userLoggedIn', { detail: signedUpUser }));
                this.hideAuthModal();

                if (pendingCheckout) {
                    this.showAuthSuccess(CONVERSION_COPY.auth.successCheckoutRegister);
                } else {
                    this.showAuthSuccess(CONVERSION_COPY.auth.successRegister);
                }
                return;
            }

            if (pendingCheckout) {
                this.showAuthSuccess(CONVERSION_COPY.auth.successRegisterVerifyCheckout);
                setTimeout(() => this.showLoginModal({ intent: 'checkout' }), 1400);
            } else {
                this.showAuthSuccess(CONVERSION_COPY.auth.successRegisterVerify);
                setTimeout(() => this.showLoginModal(), 2800);
            }

        } catch (error) {
            console.error('Registration failed:', error);
            analytics.track('auth_register_failed', { message: error.message || 'register_failed' }, {
                category: 'auth',
                funnel: 'auth',
                funnel_step: 'register_failed'
            });
            trackOpsEvent('auth_register_failed', {
                error_code: error.code || 'register_failed'
            }, { category: 'auth', severity: 'warning' });
            const pendingCheckout = Boolean(peekCheckoutIntent());
            const mapFn = pendingCheckout ? mapAuthErrorForCheckout : mapAuthError;
            this.showAuthError(mapFn(error, config.messages.error.register));
        } finally {
            setSubmitLoading(submitBtn, false);
        }
    }

    showForgotPasswordForm(prefillEmail = '') {
        const modal = document.getElementById('auth-modal');
        if (!modal) return;

        const modalHeader = modal.querySelector('.modal-header h3');
        const modalBody = modal.querySelector('.modal-body');
        if (!modalBody) return;

        if (modalHeader) modalHeader.textContent = 'Şifre sıfırlama';
        modalBody.innerHTML = this.getForgotPasswordForm(prefillEmail);
        modal.classList.add('show', 'auth-modal');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        state.setModal('auth');

        bindAuthModalA11y(modal, () => this.hideAuthModal());
        this.setupForgotPasswordForm();
        requestAnimationFrame(() => focusFirstField(modalBody));
    }

    getForgotPasswordForm(prefillEmail = '') {
        const safeEmail = String(prefillEmail || '').replace(/"/g, '&quot;');
        return `
            <form id="forgot-password-form" data-enterprise-form>
                <p class="form-hint" style="margin-bottom:1rem;">Kayıtlı e-posta adresinize güvenli sıfırlama bağlantısı gönderilir. Bağlantı kısa süre geçerlidir.</p>
                <div class="form-group">
                    <label for="reset-email">E-posta</label>
                    <input type="email" id="reset-email" name="email" autocomplete="email" required value="${safeEmail}">
                </div>
                <button type="submit" class="btn btn-primary full-width auth-submit">Sıfırlama bağlantısı gönder</button>
            </form>
            <div class="modal-footer">
                <p>Şifrenizi hatırladınız mı? <a href="#" id="switch-to-login">${CONVERSION_COPY.auth.switchToLogin}</a></p>
            </div>
        `;
    }

    setupForgotPasswordForm() {
        const form = document.getElementById('forgot-password-form');
        const switchToLogin = document.getElementById('switch-to-login');
        if (form) {
            form.addEventListener('submit', (event) => this.handleForgotPassword(event));
        }
        if (switchToLogin) {
            switchToLogin.addEventListener('click', (event) => {
                event.preventDefault();
                this.showLoginModal();
            });
        }
    }

    async handleForgotPassword(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const submitBtn = form.querySelector('button[type="submit"]');
        const email = form.email.value.trim();
        if (!email) return;

        try {
            setSubmitLoading(submitBtn, true, { busyLabel: CONVERSION_COPY.auth.resetBusy });
            await API.resetPassword(email);
            this.showAuthSuccess(CONVERSION_COPY.auth.successReset);
        } catch (error) {
            console.error('Password reset failed:', error);
            this.showAuthError(mapAuthError(error, 'Şifre sıfırlama sırasında bir hata oluştu.'));
        } finally {
            setSubmitLoading(submitBtn, false);
        }
    }

    async logout() {
        try {
            await API.signOut();
            monitoring.clearUser();
        } catch (error) {
            console.error('Logout failed:', error);
            monitoring.captureException(error, { context: 'logout' });
            throw error;
        }
    }

    showAuthError(message) {
        this.showAuthMessage(message, 'error');
    }

    showAuthSuccess(message) {
        this.showAuthMessage(message, 'success');
    }

    showAuthMessage(message, type) {
        const modal = document.getElementById('auth-modal');
        const modalBody = modal?.querySelector('.modal-body');
        if (!modalBody) return;

        if (type === 'success' && !modal.classList.contains('show')) {
            document.dispatchEvent(
                new CustomEvent('ib:auth-toast', { detail: { message, type } })
            );
            return;
        }

        const banner = showInlineFormBanner(modalBody, message, type);
        if (banner) banner.classList.add('auth-message', type);

        if (type === 'error') {
            modalBody.querySelector('.ib-form-banner, .auth-message')?.focus?.();
        }

        setTimeout(() => {
            const banner = modalBody.querySelector('.ib-form-banner, .auth-message');
            if (banner && banner.textContent === message) banner.remove();
        }, type === 'error' ? 8000 : 6000);
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    requireAuth() {
        if (!this.isAuthenticated()) {
            this.showLoginModal();
            return false;
        }
        return true;
    }
}

export default AuthManager;