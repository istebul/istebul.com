// Authentication Manager
import { supabase } from '../../core/supabase.js';
import { state } from '../../core/state.js';
import API from '../../core/api.js';
import config from '../../core/config.js';
import { monitoring } from '../../core/monitoring.js';
import { analytics } from '../../core/analytics.js';
import { mapAuthError } from './auth-errors.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';

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
        const modalHeader = modal.querySelector('.modal-header h3');
        const modalBody = modal.querySelector('.modal-body');

        if (modalHeader) {
            if (options.intent === 'checkout') {
                modalHeader.textContent = type === 'register' ? 'Pro için hesap oluşturun' : 'Pro için giriş yapın';
            } else {
                modalHeader.textContent = type === 'login' ? 'Giriş Yap' : 'Üye Ol';
            }
        }

        const intentBanner = options.intent === 'checkout'
            ? '<p class="auth-intent-banner">7 gün ücretsiz deneme · Stripe ile güvenli ödeme · İstediğiniz zaman iptal</p>'
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
        state.setModal('auth');

        // Setup form handlers
        this.setupAuthForm(type);
    }

    hideAuthModal() {
        const modal = document.getElementById('auth-modal');
        modal.classList.remove('show');
        modal.classList.remove('auth-modal');
        document.body.classList.remove('modal-open');
        state.setModal(null);
    }

    getLoginForm() {
        return `
            <form id="login-form">
                <div class="form-group">
                    <label for="email">E-posta</label>
                    <input type="email" id="email" name="email" autocomplete="email" required>
                </div>
                <div class="form-group">
                    <label for="password">Şifre</label>
                    <input type="password" id="password" name="password" autocomplete="current-password" required>
                </div>
                <button type="submit" class="btn btn-primary full-width">Giriş Yap</button>
            </form>
            <div class="modal-footer">
                <p>Şifrenizi mi unuttunuz? <a href="#" id="forgot-password">Sıfırlayın</a></p>
                <p>Hesabınız yok mu? <a href="#" id="switch-to-register">Üye olun</a></p>
            </div>
        `;
    }

    getRegisterForm() {
        return `
            <form id="register-form">
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
                    <small id="password-hint" class="form-hint">En az 8 karakter</small>
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
                <button type="submit" class="btn btn-primary full-width">Üye Ol</button>
            </form>
            <div class="modal-footer">
                <p>Zaten hesabınız var mı? <a href="#" id="switch-to-login">Giriş yapın</a></p>
            </div>
        `;
    }

    setupAuthForm(type) {
        const form = document.getElementById(`${type}-form`);
        const modal = document.getElementById('auth-modal');

        if (!modal.dataset.authCloseBound) {
            modal.dataset.authCloseBound = 'true';
            modal.querySelector('.modal-close').addEventListener('click', () => {
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

        if (switchToRegister) {
            switchToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegisterModal();
            });
        }

        if (switchToLogin) {
            switchToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginModal();
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
        const originalText = submitBtn.textContent;

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Giriş yapılıyor...';

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
                throw new Error('Giriş tamamlanamadı. E-posta ve şifrenizi kontrol edip tekrar deneyin.');
            }

            this.currentUser = user;
            state.setUser(user);

            document.dispatchEvent(new CustomEvent('userLoggedIn', {
                detail: user
            }));

            analytics.track('auth_login_success', {}, { category: 'auth', funnel: 'auth', funnel_step: 'login_success' });
            this.hideAuthModal();
        } catch (error) {
            console.error('Login failed:', error);
            analytics.track('auth_login_failed', { message: error.message || 'login_failed' }, {
                category: 'auth',
                funnel: 'auth',
                funnel_step: 'login_failed'
            });
            this.showAuthError(mapAuthError(error, config.messages.error.login));
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    async handleRegister(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Hesap oluşturuluyor...';

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

            // Profile creation is handled by the Supabase on_auth_user_created trigger.
            await API.signUp(email, password, {
                full_name: fullName
            });

            analytics.track('auth_register_success', {}, {
                category: 'auth',
                funnel: 'auth',
                funnel_step: 'register_success'
            });

            const pendingCheckout = typeof sessionStorage !== 'undefined'
                && sessionStorage.getItem(STORAGE_KEYS.CHECKOUT_INTENT);

            if (pendingCheckout) {
                this.showAuthSuccess('Hesabınız oluşturuldu. E-posta doğrulamasından sonra giriş yaparak ödemeye devam edebilirsiniz — ücretsiz analiz için /auto sayfasını kullanabilirsiniz.');
            } else {
                this.showAuthSuccess('Hesabınız oluşturuldu! Lütfen e-posta adresinizi doğrulayın.');
            }
            setTimeout(() => this.showLoginModal(pendingCheckout ? { intent: 'checkout' } : {}), 2800);

        } catch (error) {
            console.error('Registration failed:', error);
            analytics.track('auth_register_failed', { message: error.message || 'register_failed' }, {
                category: 'auth',
                funnel: 'auth',
                funnel_step: 'register_failed'
            });
            this.showAuthError(mapAuthError(error, config.messages.error.register));
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    showForgotPasswordForm() {
        const modal = document.getElementById('auth-modal');
        const modalBody = modal.querySelector('.modal-body');
        modalBody.innerHTML = this.getForgotPasswordForm();
        this.setupForgotPasswordForm();
    }

    getForgotPasswordForm() {
        return `
            <form id="forgot-password-form">
                <div class="form-group">
                    <label for="reset-email">E-posta</label>
                    <input type="email" id="reset-email" name="email" autocomplete="email" required>
                </div>
                <button type="submit" class="btn btn-primary full-width">Sıfırlama Bağlantısı Gönder</button>
            </form>
            <div class="modal-footer">
                <p>Şifrenizi hatırladınız mı? <a href="#" id="switch-to-login">Giriş yapın</a></p>
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
        const originalText = submitBtn.textContent;
        const email = form.email.value.trim();
        if (!email) return;

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Gönderiliyor...';
            await API.resetPassword(email);
            this.showAuthSuccess('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
        } catch (error) {
            console.error('Password reset failed:', error);
            this.showAuthError(mapAuthError(error, 'Şifre sıfırlama sırasında bir hata oluştu.'));
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
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
        const modalBody = document.querySelector('#auth-modal .modal-body');
        const existingMessage = modalBody.querySelector('.auth-message');

        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `auth-message ${type}`;
        messageDiv.textContent = message;

        modalBody.insertBefore(messageDiv, modalBody.firstChild);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
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