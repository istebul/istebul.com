// Authentication Manager
import { supabase } from '../../core/supabase.js';
import { state } from '../../core/state.js';
import API from '../../core/api.js';
import config from '../../core/config.js';
import { monitoring } from '../../core/monitoring.js';

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

    showLoginModal() {
        this.showAuthModal('login');
    }

    showRegisterModal() {
        this.showAuthModal('register');
    }

    showAuthModal(type) {
        const modal = document.getElementById('auth-modal');
        const modalBody = modal.querySelector('.modal-body');
        const modalTitle = modal.querySelector('#auth-modal-title');

        modalBody.innerHTML = type === 'login' ? this.getLoginForm() : this.getRegisterForm();
        if (modalTitle) {
            modalTitle.textContent = type === 'login' ? 'Giriş Yap' : 'Kurumsal Hesap Oluştur';
        }

        modal.classList.add('show');
        state.setModal('auth');

        // Setup form handlers
        this.setupAuthForm(type);
    }

    hideAuthModal() {
        const modal = document.getElementById('auth-modal');
        modal.classList.remove('show');
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
                    <input type="password" id="password" name="password" autocomplete="new-password" required minlength="8">
                </div>
                <div class="form-group">
                    <label for="confirm-password">Şifre Tekrar</label>
                    <input type="password" id="confirm-password" name="confirm-password" autocomplete="new-password" required>
                </div>
                <div class="form-group">
                    <label class="auth-consent">
                        <input type="checkbox" id="terms" name="terms" required>
                        <span><a href="/kullanim-sartlari.html" target="_blank" rel="noopener">Kullanım koşullarını</a>, <a href="/kvkk.html" target="_blank" rel="noopener">KVKK metnini</a> ve <a href="/gizlilik.html" target="_blank" rel="noopener">Gizlilik Politikasını</a> kabul ediyorum.</span>
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

            this.hideAuthModal();
        } catch (error) {
            console.error('Login failed:', error);
            this.showAuthError(error.message || config.messages.error.login);
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

            // Profile creation is handled by the Supabase on_auth_user_created trigger.
            await API.signUp(email, password, {
                full_name: fullName
            });

            this.showAuthSuccess('Hesabınız oluşturuldu! Lütfen e-posta adresinizi doğrulayın.');
            // Welcome email disabled until production email provider is configured.
            setTimeout(() => this.showLoginModal(), 2000);

        } catch (error) {
            console.error('Registration failed:', error);
            this.showAuthError(error.message || config.messages.error.register);
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
            this.showAuthError(error.message || 'Şifre sıfırlama sırasında bir hata oluştu.');
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