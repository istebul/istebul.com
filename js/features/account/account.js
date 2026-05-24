import API from '../../core/api.js';
import { escapeHtml } from '../../core/security.js';
import config from '../../core/config.js';
import { canOpenBillingPortal } from '../../core/billing-portal.js';

import { STORAGE_KEYS } from '../../core/storage-keys.js';

const ONBOARDING_KEY = STORAGE_KEYS.ACCOUNT_ONBOARDING_DONE;

const SUBSCRIPTION_LABELS = {
    active: { label: 'Aktif', tone: 'success' },
    trialing: { label: 'Deneme', tone: 'info' },
    past_due: { label: 'Ödeme bekleniyor', tone: 'warning' },
    canceled: { label: 'İptal edildi', tone: 'muted' },
    incomplete: { label: 'Tamamlanmadı', tone: 'muted' }
};

function formatDate(value) {
    if (!value) return '—';
    try {
        return new Intl.DateTimeFormat('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(new Date(value));
    } catch {
        return '—';
    }
}

export class AccountManager {
    constructor(ui, auth) {
        this.ui = ui;
        this.auth = auth;
        this.activeTab = 'overview';
        this.subscription = null;
        this.loading = false;
    }

    handleQueryParams(params = new URLSearchParams()) {
        const subscribed = params.get('subscribed') === 'true';
        const cancelled = params.get('cancelled') === 'true';
        const billingManaged = params.get('billing') === 'managed';
        const tab = params.get('tab');

        if (tab && ['overview', 'settings', 'subscription', 'security'].includes(tab)) {
            this.setTab(tab);
        }

        if (subscribed) {
            this.ui?.showSuccess?.('Ödemeniz alındı. Premium aboneliğiniz birkaç dakika içinde hesabınıza yansır.');
            this.setTab('subscription');
        } else if (cancelled) {
            this.ui?.showError?.('Ödeme işlemi iptal edildi. İstediğiniz zaman tekrar deneyebilirsiniz.');
            this.setTab('subscription');
        } else if (billingManaged) {
            this.ui?.showSuccess?.('Stripe abonelik panelinden döndünüz. Kart, fatura veya plan değişiklikleri kısa süre içinde yansır.');
            this.setTab('subscription');
        }

        if (subscribed || cancelled || billingManaged || tab) {
            const cleanUrl = `${window.location.pathname}`;
            window.history.replaceState(null, '', cleanUrl);
        }
    }

    async refresh(user = null) {
        const section = document.getElementById('profil');
        if (!section) return;

        const currentUser = user || this.auth?.getCurrentUser?.();
        if (!currentUser) {
            this.renderGuest();
            return;
        }

        this.loading = true;
        this.renderLoading(currentUser);

        try {
            const profile = await API.getProfile(currentUser.id);
            currentUser.profile = profile;

            try {
                this.subscription = await API.getSubscription(currentUser.id);
            } catch (subError) {
                console.warn('Subscription could not be loaded:', subError);
                this.subscription = null;
            }

            this.renderAccount(currentUser, profile);
            this.maybeShowOnboarding(profile);
        } catch (error) {
            console.error('Account refresh failed:', error);
            this.renderError();
        } finally {
            this.loading = false;
        }
    }

    setTab(tabId) {
        this.activeTab = tabId;
        const section = document.getElementById('profil');
        if (!section) return;

        section.querySelectorAll('[data-account-tab]').forEach((btn) => {
            const isActive = btn.dataset.accountTab === tabId;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-selected', String(isActive));
        });

        section.querySelectorAll('[data-account-panel]').forEach((panel) => {
            const isActive = panel.dataset.accountPanel === tabId;
            panel.hidden = !isActive;
            panel.classList.toggle('is-active', isActive);
            if (isActive) panel.removeAttribute('tabindex');
            else panel.setAttribute('tabindex', '-1');
        });
    }

    bindEvents(app) {
        const section = document.getElementById('profil');
        if (!section || section.dataset.accountBound) return;
        section.dataset.accountBound = 'true';

        section.addEventListener('click', (event) => {
            const tabBtn = event.target.closest('[data-account-tab]');
            if (tabBtn) {
                event.preventDefault();
                this.setTab(tabBtn.dataset.accountTab);
                return;
            }

            if (event.target.closest('#account-login-btn')) {
                event.preventDefault();
                app.auth.showLoginModal();
            }

            if (event.target.closest('#account-upgrade-btn')) {
                event.preventDefault();
                app.handlePremiumCheckout();
            }

            if (event.target.closest('#account-logout-btn')) {
                event.preventDefault();
                app.handleLogout();
            }

            if (event.target.closest('#account-resend-verify')) {
                event.preventDefault();
                this.resendVerification(app);
            }
        });

        const settingsForm = section.querySelector('#account-settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (event) => this.handleSettingsSubmit(event, app));
        }
    }

    async resendVerification(app) {
        const email = app.currentUser?.email;
        if (!email) {
            this.ui?.showError?.('Oturum bilgisi bulunamadı.');
            return;
        }

        const btn = document.getElementById('account-resend-verify');
        const original = btn?.textContent;
        try {
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Gönderiliyor...';
            }
            await API.resendSignupConfirmation(email);
            this.ui?.showSuccess?.('Doğrulama e-postası gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin.');
        } catch (error) {
            console.error('Resend verification failed:', error);
            this.ui?.showError?.(error.message || 'E-posta gönderilemedi.');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = original || 'Doğrulama e-postasını yeniden gönder';
            }
        }
    }

    async handleSettingsSubmit(event, app) {
        event.preventDefault();
        const form = event.currentTarget;
        const submitBtn = form.querySelector('button[type="submit"]');
        const original = submitBtn?.textContent;

        if (!app.currentUser?.id) {
            app.auth.showLoginModal();
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Kaydediliyor...';

            const updates = {
                full_name: form.full_name.value.trim(),
                phone: form.phone.value.trim(),
                location: form.location.value.trim(),
                bio: form.bio.value.trim()
            };

            const profile = await app.profil.updateProfile(app.currentUser.id, updates);
            app.currentUser.profile = profile;
            this.ui?.updateUserUI?.(profile);
            this.ui?.showSuccess?.(config.messages.success.profileUpdated);
            await this.refresh(app.currentUser);
        } catch (error) {
            console.error('Settings save failed:', error);
            this.ui?.showError?.('Profil güncellenemedi. Lütfen tekrar deneyin.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = original || 'Değişiklikleri kaydet';
        }
    }

    maybeShowOnboarding(profile) {
        if (!profile?.id) return;
        try {
            if (localStorage.getItem(ONBOARDING_KEY)) return;
        } catch {
            return;
        }

        const banner = document.getElementById('account-onboarding');
        if (!banner) return;

        banner.hidden = false;
        banner.querySelector('[data-onboarding-dismiss]')?.addEventListener('click', () => {
            banner.hidden = true;
            try {
                localStorage.setItem(ONBOARDING_KEY, '1');
            } catch {}
        }, { once: true });
    }

    renderGuest() {
        const root = document.getElementById('account-root');
        if (!root) return;

        root.innerHTML = `
            <div class="account-guest">
                <div class="account-guest-copy">
                    <span class="account-eyebrow"><i data-lucide="shield-check"></i> Güvenli hesap alanı</span>
                    <h2>Hesabınızı tek yerden yönetin</h2>
                    <p>Karar geçmişinizi saklayın, profil bilgilerinizi güncelleyin ve Premium aboneliğinizi görün.</p>
                    <ul class="account-trust-list">
                        <li><i data-lucide="lock"></i> Oturumlar şifreli bağlantı üzerinden korunur</li>
                        <li><i data-lucide="mail-check"></i> E-posta doğrulama ve şifre sıfırlama desteği</li>
                        <li><i data-lucide="credit-card"></i> Stripe ile güvenli ödeme</li>
                    </ul>
                    <div class="account-guest-actions">
                        <button type="button" class="btn btn-primary" id="account-login-btn" data-auth-open="login">Hesabına gir</button>
                        <button type="button" class="btn btn-outline" data-auth-open="register" data-account-register title="Analizini kaydet ve devam et">Analizini kaydet</button>
                    </div>
                </div>
            </div>
        `;

        root.querySelector('[data-account-register]')?.addEventListener('click', () => {
            this.auth?.showRegisterModal?.();
        });

        this.ui?.loadIcons?.();
    }

    renderLoading(user) {
        const root = document.getElementById('account-root');
        if (!root) return;

        root.innerHTML = `
            <div class="account-loading" aria-live="polite">
                <div class="account-loading-spinner" aria-hidden="true"></div>
                <p>Hesap bilgileriniz yükleniyor…</p>
                <span class="account-loading-email">${escapeHtml(user.email || '')}</span>
            </div>
        `;
    }

    renderError() {
        const root = document.getElementById('account-root');
        if (!root) return;

        root.innerHTML = `
            <div class="account-error-state">
                <h3>Hesap bilgileri yüklenemedi</h3>
                <p>Geçici bir bağlantı sorunu olabilir. Sayfayı yenileyip tekrar deneyin.</p>
                <button type="button" class="btn btn-primary" data-action="reload-page">Yenile</button>
            </div>
        `;
    }

    renderAccount(user, profile) {
        const root = document.getElementById('account-root');
        if (!root) return;

        const emailVerified = Boolean(user.email_confirmed_at || user.confirmed_at);
        const sub = this.subscription;
        const subMeta = SUBSCRIPTION_LABELS[sub?.status] || { label: 'Ücretsiz', tone: 'muted' };
        const hasPremium = ['active', 'trialing'].includes(sub?.status);
        const canManageBilling = canOpenBillingPortal(sub);
        const isPastDue = sub?.status === 'past_due';

        root.innerHTML = `
            <div class="account-shell">
                <aside class="account-sidebar" aria-label="Hesap menüsü">
                    <div class="account-user-chip">
                        <div class="account-avatar" aria-hidden="true">${escapeHtml(this.getInitials(profile))}</div>
                        <div>
                            <strong>${escapeHtml(profile?.full_name || user.email)}</strong>
                            <span>${escapeHtml(user.email)}</span>
                        </div>
                    </div>
                    <nav class="account-nav" role="tablist" aria-label="Hesap sekmeleri">
                        <button type="button" role="tab" id="account-tab-overview" class="account-nav-btn ${this.activeTab === 'overview' ? 'is-active' : ''}" data-account-tab="overview" aria-controls="account-panel-overview" aria-selected="${this.activeTab === 'overview'}">Genel bakış</button>
                        <button type="button" role="tab" id="account-tab-settings" class="account-nav-btn ${this.activeTab === 'settings' ? 'is-active' : ''}" data-account-tab="settings" aria-controls="account-panel-settings" aria-selected="${this.activeTab === 'settings'}">Profil ve ayarlar</button>
                        <button type="button" role="tab" id="account-tab-subscription" class="account-nav-btn ${this.activeTab === 'subscription' ? 'is-active' : ''}" data-account-tab="subscription" aria-controls="account-panel-subscription" aria-selected="${this.activeTab === 'subscription'}">Abonelik</button>
                        <button type="button" role="tab" id="account-tab-security" class="account-nav-btn ${this.activeTab === 'security' ? 'is-active' : ''}" data-account-tab="security" aria-controls="account-panel-security" aria-selected="${this.activeTab === 'security'}">Güvenlik</button>
                    </nav>
                    <button type="button" class="btn btn-ghost account-logout" id="account-logout-btn">Oturumu kapat</button>
                </aside>

                <div class="account-panels">
                    <div id="account-onboarding" class="account-onboarding" hidden>
                        <div>
                            <strong>Hoş geldiniz</strong>
                            <p>Profilinizi tamamlayın, araç analiz geçmişinizi saklayın ve Premium ile gelişmiş karşılaştırmalara erişin.</p>
                        </div>
                        <button type="button" class="btn btn-outline btn-sm" data-onboarding-dismiss>Anladım</button>
                    </div>

                    ${!emailVerified ? `
                        <div class="account-banner account-banner--warning" role="status">
                            <div>
                                <strong>E-posta doğrulaması bekleniyor</strong>
                                <p>Hesabınızın tüm özelliklerini kullanmak için e-posta adresinizi doğrulayın.</p>
                            </div>
                            <button type="button" class="btn btn-outline btn-sm" id="account-resend-verify">Doğrulama e-postasını yeniden gönder</button>
                        </div>
                    ` : ''}

                    <section id="account-panel-overview" role="tabpanel" aria-labelledby="account-tab-overview" class="account-panel ${this.activeTab === 'overview' ? 'is-active' : ''}" data-account-panel="overview" ${this.activeTab === 'overview' ? '' : 'hidden'}>
                        <header class="account-panel-head">
                            <h2>Genel bakış</h2>
                            <p>Karar platformu hesabınızın özeti</p>
                        </header>
                        <div class="account-stat-grid">
                            <article class="account-stat-card">
                                <span>Plan</span>
                                <strong class="tone-${subMeta.tone}">${escapeHtml(subMeta.label)}</strong>
                            </article>
                            <article class="account-stat-card">
                                <span>E-posta</span>
                                <strong>${emailVerified ? 'Doğrulandı' : 'Bekliyor'}</strong>
                            </article>
                            <article class="account-stat-card">
                                <span>Rol</span>
                                <strong>${escapeHtml(profile?.role || 'Kullanıcı')}</strong>
                            </article>
                        </div>
                        <div class="account-quick-actions">
                            <a href="/auto" class="btn btn-primary" data-native-route>Araç analizine git</a>
                            <button type="button" class="btn btn-outline" data-account-tab="settings">Profili düzenle</button>
                        </div>
                    </section>

                    <section id="account-panel-settings" role="tabpanel" aria-labelledby="account-tab-settings" class="account-panel ${this.activeTab === 'settings' ? 'is-active' : ''}" data-account-panel="settings" ${this.activeTab === 'settings' ? '' : 'hidden'}>
                        <header class="account-panel-head">
                            <h2>Profil ve ayarlar</h2>
                            <p>Bilgileriniz yalnızca hesabınızda görünür.</p>
                        </header>
                        <form id="account-settings-form" class="account-settings-form" data-enterprise-form>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="account-full-name">Ad Soyad</label>
                                    <input id="account-full-name" name="full_name" type="text" autocomplete="name" value="${escapeHtml(profile?.full_name || '')}" required>
                                </div>
                                <div class="form-group">
                                    <label for="account-phone">Telefon</label>
                                    <input id="account-phone" name="phone" type="tel" autocomplete="tel" value="${escapeHtml(profile?.phone || '')}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="account-location">Konum</label>
                                <input id="account-location" name="location" type="text" value="${escapeHtml(profile?.location || '')}" placeholder="İl / İlçe">
                            </div>
                            <div class="form-group">
                                <label for="account-bio">Kısa not</label>
                                <textarea id="account-bio" name="bio" rows="3" maxlength="280" placeholder="İsteğe bağlı">${escapeHtml(profile?.bio || '')}</textarea>
                            </div>
                            <button type="submit" class="btn btn-primary">Değişiklikleri kaydet</button>
                        </form>
                        <div class="account-privacy-block">
                            <h3>Veri ve gizlilik</h3>
                            <p>Kişisel verilerinize ilişkin haklarınız (erişim, düzeltme, silme) için <a href="/kvkk.html">KVKK metni</a> ve <a href="/gizlilik.html">gizlilik politikası</a> geçerlidir.</p>
                            <p><a href="/iletisim.html">İletişim</a> üzerinden KVKK başvurusu oluşturabilirsiniz. Hesap silme talepleri güvenlik doğrulaması sonrası işlenir; yasal süreler içinde yanıtlanır.</p>
                        </div>
                    </section>

                    <section id="account-panel-subscription" role="tabpanel" aria-labelledby="account-tab-subscription" class="account-panel ${this.activeTab === 'subscription' ? 'is-active' : ''}" data-account-panel="subscription" ${this.activeTab === 'subscription' ? '' : 'hidden'}>
                        <header class="account-panel-head">
                            <h2>Abonelik</h2>
                            <p>Premium özellikler Stripe üzerinden güvenle yönetilir.</p>
                        </header>
                        <div class="account-subscription-card ${hasPremium || isPastDue ? 'is-premium' : ''}">
                            <div>
                                <span class="account-eyebrow">Mevcut plan</span>
                                <h3>${hasPremium || isPastDue ? 'isteBul Pro' : 'Ücretsiz'}</h3>
                                <p>${hasPremium
            ? `Dönem sonu: ${formatDate(sub?.current_period_end)}${sub?.cancel_at_period_end ? ' · Dönem sonunda iptal edilecek' : ''}`
            : isPastDue
                ? 'Son ödeme başarısız oldu. Kart bilginizi güncelleyerek aboneliğinizi sürdürebilirsiniz.'
                : canManageBilling
                    ? `Abonelik durumu: ${escapeHtml(subMeta.label)}. Faturalarınızı ve planınızı Stripe panelinden yönetin.`
                    : 'Gelişmiş karşılaştırma, öncelikli analiz ve kayıtlı karar geçmişi için Pro\'ya geçin.'}</p>
                            </div>
                            ${canManageBilling
            ? `<span class="account-plan-badge tone-${subMeta.tone}">${escapeHtml(subMeta.label)}</span>`
            : `<button type="button" class="btn btn-primary" id="account-upgrade-btn">7 gün ücretsiz dene</button>`}
                        </div>
                        ${canManageBilling ? `
                        <div class="account-billing-panel">
                            <button type="button" class="btn btn-primary" id="account-billing-portal-btn" data-billing-portal>Aboneliği yönet</button>
                            <p class="account-billing-hint">Stripe müşteri panelinde:</p>
                            <ul class="account-billing-features">
                                <li>Kart bilgisi güncelle</li>
                                <li>Faturaları görüntüle ve indir</li>
                                <li>Plan değiştir veya iptal et</li>
                            </ul>
                        </div>
                        ` : ''}
                        ${!canManageBilling ? `
                        <p class="revenue-risk-reversal account-billing-reassurance" role="note">
                            <span>7 gün ücretsiz deneme</span>
                            <span>Stripe ile güvenli ödeme</span>
                            <span>İstediğiniz zaman iptal</span>
                        </p>
                        ` : ''}
                        <p class="account-trust-note"><i data-lucide="shield"></i> Ödeme bilgileriniz isteBul sunucularında saklanmaz; kart ve fatura işlemleri Stripe üzerinden yönetilir.</p>
                    </section>

                    <section id="account-panel-security" role="tabpanel" aria-labelledby="account-tab-security" class="account-panel ${this.activeTab === 'security' ? 'is-active' : ''}" data-account-panel="security" ${this.activeTab === 'security' ? '' : 'hidden'}>
                        <header class="account-panel-head">
                            <h2>Güvenlik</h2>
                            <p>Hesap güvenliğinizi koruyun.</p>
                        </header>
                        <ul class="account-security-list">
                            <li>
                                <div>
                                    <strong>Şifre</strong>
                                    <p>Şifrenizi unuttuysanız e-posta ile güvenli sıfırlama bağlantısı alın.</p>
                                </div>
                                <button type="button" class="btn btn-outline btn-sm" id="account-reset-password">Şifre sıfırla</button>
                            </li>
                            <li>
                                <div>
                                    <strong>Oturum</strong>
                                    <p>Bu cihazda oturumunuz açık. Paylaşımlı cihazlarda işiniz bitince çıkış yapın.</p>
                                </div>
                                <button type="button" class="btn btn-outline btn-sm" id="account-logout-secondary">Çıkış yap</button>
                            </li>
                        </ul>
                    </section>
                </div>
            </div>
        `;

        root.querySelector('#account-reset-password')?.addEventListener('click', () => {
            this.auth?.showForgotPasswordForm?.(user.email);
        });

        root.querySelector('#account-logout-secondary')?.addEventListener('click', () => {
            document.getElementById('account-logout-btn')?.click();
        });

        root.querySelectorAll('[data-account-tab]').forEach((btn) => {
            if (btn.closest('.account-quick-actions')) {
                btn.addEventListener('click', (event) => {
                    event.preventDefault();
                    this.setTab(btn.dataset.accountTab);
                });
            }
        });

        this.setTab(this.activeTab);
        this.ui?.loadIcons?.();
    }

    getInitials(profile) {
        const source = (profile?.full_name || profile?.email || '?').trim();
        const parts = source.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return source.slice(0, 2).toUpperCase();
    }
}

export default AccountManager;
