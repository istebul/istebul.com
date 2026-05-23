// Authentication Manager
import { supabase } from '../../core/supabase.js';
import { state } from '../../core/state.js';
import API from '../../core/api.js';
import config from '../../core/config.js';
import { monitoring } from '../../core/monitoring.js';
import { mapAuthError, validatePassword } from './auth-errors.js';

const AUTH_TRUST_STRIP = `
    <div class="auth-trust-strip" aria-label="Güvenlik bilgisi">
        <span><i data-lucide="lock"></i> Şifreli bağlantı</span>
        <span><i data-lucide="shield-check"></i> KVKK uyumlu</span>
        <span><i data-lucide="mail-check"></i> E-posta doğrulama</span>
    </div>
`;

export class AuthManager {
    constructor() {
        this.currentUser = null;
        this.pendingVerifyEmail = null;
        this.init();
    }

    init() {
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

    openFromQueryParams() {
        const params = new URLSearchParams(window.location.search);
        const authMode = params.get('auth');
        const redirect = params.get('redirect');

        if (redirect && redirect.startsWith('/')) {
            try {
                sessionStorage.setItem('istebul_auth_redirect', redirect);
            } catch {}
        }

        if (authMode === 'login') {
            this.showLoginModal();
        } else if (authMode === 'register') {
            this.showRegisterModal();
        } else if (authMode === 'forgot') {
            this.showForgotPasswordForm();
        } else if (authMode === 'reset') {
            this.showAuthSuccess('Şifre sıfırlama bağlantınızı kullanarak yeni şifrenizi belirleyebilirsiniz.');
            this.showLoginModal();
        }

        if (authMode) {
            const clean = new URL(window.location.href);
            clean.searchParams.delete('auth');
            window.history.replaceState(null, '', clean.pathname + clean.search + clean.hash);
        }
    }

    consumePostLoginRedirect() {
        try {
            const target = sessionStorage.getItem('istebul_auth_redirect');
            if (!target) return;
            sessionStorage.removeItem('istebul_auth_redirect');
            if (target.startsWith('/')) {
                window.location.assign(target);
            }
        } catch {}
    }

    showLoginModal() {
        this.showAuthModal('login');
    }

    showRegisterModal() {
        this.showAuthModal('register');
    }

    showAuthModal(type) {
        const modal = document.getElementById('auth-modal');
        if (!modal) return;

        const modalBody = modal.querySelector('.modal-body');
        const modalTitle = modal.querySelector('#auth-modal-title');
        const modalSubtitle = modal.querySelector('#auth-modal-subtitle');

        modalBody.innerHTML = type === 'login' ? this.getLoginForm() : this.getRegisterForm();

        if (modalTitle) {
            modalTitle.textContent = type === 'login' ? 'Giriş yapın' : 'Hesap oluşturun';
        }
        if (modalSubtitle) {
            modalSubtitle.textContent = type === 'login'
                ? 'Karar geçmişinize ve hesap ayarlarınıza güvenle erişin.'
                : 'Ücretsiz başlayın; Premium özellikleri istediğiniz zaman ekleyin.';
        }

        modal.classList.add('show');
        state.setModal('auth');
        this.setupAuthForm(type);
        this.decorateAuthModal();
    }

    hideAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (!modal) return;
        modal.classList.remove('show');
        state.setModal(null);
    }

    getLoginForm() {
        return `
            ${AUTH_TRUST_STRIP}
            <form id="login-form" class="auth-form" novalidate>
                <div class="form-group">
                    <label for="login-email">E-posta</label>
                    <input type="email" id="login-email" name="email" autocomplete="email" inputmode="email" required placeholder="ornek@sirket.com">
                </div>
                <div class="form-group">
                    <div class="form-label-row">
                        <label for="login-password">Şifre</label>
                        <a href="#" id="forgot-password" class="auth-inline-link">Şifremi unuttum</a>
                    </div>
                    <div class="auth-password-field">
                        <input type="password" id="login-password" name="password" autocomplete="current-password" required placeholder="••••••••">
                        <button type="button" class="auth-password-toggle" data-toggle-password="login-password" aria-label="Şifreyi göster">
                            <i data-lucide="eye"></i>
                        </button>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary full-width auth-submit">
                    <span class="auth-submit-label">Giriş yap</span>
                </button>
            </form>
            <div class="modal-footer auth-modal-footer">
                <p>Hesabınız yok mu? <a href="#" id="switch-to-register">Ücretsiz üye olun</a></p>
            </div>
        `;
    }

    getRegisterForm() {
        return `
            ${AUTH_TRUST_STRIP}
            <form id="register-form" class="auth-form" novalidate>
                <div class="form-group">
                    <label for="register-full-name">Ad Soyad</label>
                    <input type="text" id="register-full-name" name="full-name" autocomplete="name" required placeholder="Adınız Soyadınız">
                </div>
                <div class="form-group">
                    <label for="register-email">E-posta</label>
                    <input type="email" id="register-email" name="email" autocomplete="email" inputmode="email" required placeholder="ornek@sirket.com">
                </div>
                <div class="form-group">
                    <label for="register-password">Şifre</label>
                    <div class="auth-password-field">
                        <input type="password" id="register-password" name="password" autocomplete="new-password" required minlength="8" placeholder="En az 8 karakter">
                        <button type="button" class="auth-password-toggle" data-toggle-password="register-password" aria-label="Şifreyi göster">
                            <i data-lucide="eye"></i>
                        </button>
                    </div>
                    <ul class="auth-password-hints" id="register-password-hints" aria-live="polite"></ul>
                </div>
                <div class="form-group">
                    <label for="register-confirm-password">Şifre tekrar</label>
                    <input type="password" id="register-confirm-password" name="confirm-password" autocomplete="new-password" required placeholder="Şifrenizi tekrar girin">
                </div>
                <div class="form-group">
                    <label class="auth-consent">
                        <input type="checkbox" id="terms" name="terms" required>
                        <span><a href="/kullanim-sartlari.html" target="_blank" rel="noopener">Kullanım koşullarını</a>, <a href="/kvkk.html" target="_blank" rel="noopener">KVKK metnini</a> ve <a href="/gizlilik.html" target="_blank" rel="noopener">Gizlilik Politikasını</a> kabul ediyorum.</span>
                    </label>
                </div>
                <button type="submit" class="btn btn-primary full-width auth-submit">
                    <span class="auth-submit-label">Hesap oluştur</span>
                </button>
            </form>
            <div class="modal-footer auth-modal-footer">
                <p>Zaten hesabınız var mı? <a href="#" id="switch-to-login">Giriş yapın</a></p>
            </div>
        `;
    }

    setupAuthForm(type) {
        const form = document.getElementById(`${type}-form`);
        const modal = document.getElementById('auth-modal');
        if (!form || !modal) return;

        if (!modal.dataset.authCloseBound) {
            modal.dataset.authCloseBound = 'true';
            modal.querySelector('.modal-close')?.addEventListener('click', () => this.hideAuthModal());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideAuthModal();
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (type === 'login') {
                await this.handleLogin(form);
            } else {
                await this.handleRegister(form);
            }
        });

        document.getElementById('switch-to-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterModal();
        });

        document.getElementById('switch-to-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginModal();
        });

        document.getElementById('forgot-password')?.addEventListener('click', (e) => {
            e.preventDefault();
            const email = form.email?.value?.trim();
            this.showForgotPasswordForm(email);
        });

        modal.querySelectorAll('[data-toggle-password]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const input = document.getElementById(btn.dataset.togglePassword);
                if (!input) return;
                const reveal = input.type === 'password';
                input.type = reveal ? 'text' : 'password';
                btn.setAttribute('aria-label', reveal ? 'Şifreyi gizle' : 'Şifreyi göster');
                btn.innerHTML = `<i data-lucide="${reveal ? 'eye-off' : 'eye'}"></i>`;
                this.decorateAuthModal();
            });
        });

        if (type === 'register') {
            const passwordInput = document.getElementById('register-password');
            const hints = document.getElementById('register-password-hints');
            passwordInput?.addEventListener('input', () => {
                const result = validatePassword(passwordInput.value, config.validation.password);
                if (!hints) return;
                hints.innerHTML = result.issues.length
                    ? result.issues.map((issue) => `<li>${issue}</li>`).join('')
                    : '<li class="is-valid">Şifre güvenlik gereksinimlerini karşılıyor</li>';
            });
        }
    }

    setSubmitLoading(form, loading, loadingLabel) {
        const submitBtn = form.querySelector('.auth-submit');
        if (!submitBtn) return;

        const label = submitBtn.querySelector('.auth-submit-label');
        if (!submitBtn.dataset.defaultLabel && label) {
            submitBtn.dataset.defaultLabel = label.textContent;
        }

        submitBtn.disabled = loading;
        submitBtn.classList.toggle('is-loading', loading);
        if (label) {
            label.textContent = loading ? loadingLabel : submitBtn.dataset.defaultLabel;
        }
    }

    async handleLogin(form) {
        try {
            this.setSubmitLoading(form, true, 'Giriş yapılıyor…');

            const email = form.email.value.trim();
            const password = form.password.value;

            const result = await API.signIn(email, password);
            const user = result?.user || result?.session?.user;

            if (!user) {
                throw new Error('Giriş tamamlanamadı. E-posta ve şifrenizi kontrol edip tekrar deneyin.');
            }

            this.currentUser = user;
            state.setUser(user);
            this.consumePostLoginRedirect();
        } catch (error) {
            console.error('Login failed:', error);
            this.showAuthError(mapAuthError(error, config.messages.error.login));
        } finally {
            this.setSubmitLoading(form, false);
        }
    }

    async handleRegister(form) {
        try {
            this.setSubmitLoading(form, true, 'Hesap oluşturuluyor…');

            const fullName = form['full-name'].value.trim();
            const email = form.email.value.trim();
            const password = form.password.value;
            const confirmPassword = form['confirm-password'].value;

            if (password !== confirmPassword) {
                throw new Error('Şifreler eşleşmiyor.');
            }

            const passwordCheck = validatePassword(password, config.validation.password);
            if (!passwordCheck.valid) {
                throw new Error(`Şifre gereksinimleri: ${passwordCheck.issues.join(', ')}`);
            }

            const data = await API.signUp(email, password, { full_name: fullName });
            const needsConfirmation = !data?.session;

            this.pendingVerifyEmail = email;

            if (needsConfirmation) {
                this.showVerifyEmailView(email);
            } else {
                this.showAuthSuccess('Hesabınız hazır. Yönlendiriliyorsunuz…');
                setTimeout(() => this.hideAuthModal(), 1200);
            }
        } catch (error) {
            console.error('Registration failed:', error);
            this.showAuthError(mapAuthError(error, config.messages.error.register));
        } finally {
            this.setSubmitLoading(form, false);
        }
    }

    showVerifyEmailView(email) {
        const modal = document.getElementById('auth-modal');
        const modalBody = modal?.querySelector('.modal-body');
        const modalTitle = modal?.querySelector('#auth-modal-title');
        const modalSubtitle = modal?.querySelector('#auth-modal-subtitle');

        if (!modalBody) return;

        if (modalTitle) modalTitle.textContent = 'E-postanızı doğrulayın';
        if (modalSubtitle) modalSubtitle.textContent = 'Hesabınızı etkinleştirmek için gelen kutunuzu kontrol edin.';

        modalBody.innerHTML = `
            <div class="auth-verify-panel">
                <div class="auth-verify-icon" aria-hidden="true"><i data-lucide="mail-check"></i></div>
                <p><strong>${email}</strong> adresine bir doğrulama bağlantısı gönderdik.</p>
                <p class="auth-verify-hint">E-posta gelmediyse spam klasörünü kontrol edin veya yeniden gönderin.</p>
                <button type="button" class="btn btn-primary full-width" id="auth-resend-verify">Doğrulama e-postasını yeniden gönder</button>
                <button type="button" class="btn btn-outline full-width" id="auth-back-login">Giriş ekranına dön</button>
            </div>
        `;

        document.getElementById('auth-resend-verify')?.addEventListener('click', async () => {
            const btn = document.getElementById('auth-resend-verify');
            const original = btn?.textContent;
            try {
                btn.disabled = true;
                btn.textContent = 'Gönderiliyor…';
                await API.resendSignupConfirmation(email);
                this.showAuthSuccess('Doğrulama e-postası yeniden gönderildi.');
            } catch (error) {
                this.showAuthError(mapAuthError(error, 'E-posta gönderilemedi.'));
            } finally {
                btn.disabled = false;
                btn.textContent = original;
            }
        });

        document.getElementById('auth-back-login')?.addEventListener('click', () => {
            this.showLoginModal();
        });

        this.decorateAuthModal();
    }

    showForgotPasswordForm(prefillEmail = '') {
        const modal = document.getElementById('auth-modal');
        const modalBody = modal?.querySelector('.modal-body');
        const modalTitle = modal?.querySelector('#auth-modal-title');
        const modalSubtitle = modal?.querySelector('#auth-modal-subtitle');

        if (!modalBody) return;

        if (modalTitle) modalTitle.textContent = 'Şifrenizi sıfırlayın';
        if (modalSubtitle) modalSubtitle.textContent = 'Size güvenli bir sıfırlama bağlantısı göndereceğiz.';

        modalBody.innerHTML = `
            ${AUTH_TRUST_STRIP}
            <form id="forgot-password-form" class="auth-form">
                <div class="form-group">
                    <label for="reset-email">E-posta</label>
                    <input type="email" id="reset-email" name="email" autocomplete="email" required value="${prefillEmail.replace(/"/g, '&quot;')}" placeholder="Kayıtlı e-posta adresiniz">
                </div>
                <p class="auth-form-note">Bağlantı yalnızca kısa süre geçerlidir. Talep etmediyseniz e-postayı yok sayabilirsiniz.</p>
                <button type="submit" class="btn btn-primary full-width auth-submit">
                    <span class="auth-submit-label">Sıfırlama bağlantısı gönder</span>
                </button>
            </form>
            <div class="modal-footer auth-modal-footer">
                <p><a href="#" id="switch-to-login">Giriş ekranına dön</a></p>
            </div>
        `;

        modal.classList.add('show');
        state.setModal('auth');
        this.setupForgotPasswordForm();
        this.decorateAuthModal();
    }

    setupForgotPasswordForm() {
        const form = document.getElementById('forgot-password-form');
        form?.addEventListener('submit', (event) => this.handleForgotPassword(event));
        document.getElementById('switch-to-login')?.addEventListener('click', (event) => {
            event.preventDefault();
            this.showLoginModal();
        });
    }

    async handleForgotPassword(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const email = form.email.value.trim();
        if (!email) return;

        try {
            this.setSubmitLoading(form, true, 'Gönderiliyor…');
            await API.resetPassword(email);
            this.showAuthSuccess('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
        } catch (error) {
            console.error('Password reset failed:', error);
            this.showAuthError(mapAuthError(error, 'Şifre sıfırlama sırasında bir hata oluştu.'));
        } finally {
            this.setSubmitLoading(form, false);
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
        if (!modalBody) return;

        modalBody.querySelector('.auth-message')?.remove();

        const messageDiv = document.createElement('div');
        messageDiv.className = `auth-message ${type}`;
        messageDiv.setAttribute('role', type === 'error' ? 'alert' : 'status');
        messageDiv.textContent = message;

        modalBody.insertBefore(messageDiv, modalBody.firstChild);

        setTimeout(() => messageDiv.remove(), 6000);
    }

    decorateAuthModal() {
        if (typeof window.lucide !== 'undefined') {
            window.lucide?.createIcons?.();
        }
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
