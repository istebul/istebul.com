import API from '../../core/api.js';
import { escapeHtml } from '../../core/security.js';
import config from '../../core/config.js';
import { enrollBillingHelp } from '../customer/customer-ops-client.js';
import { STORAGE_KEYS, readStoredJson, userScopedKey } from '../../core/storage-keys.js';
import { renderUserDashboard } from '../profil/user-dashboard.js';
import { mapHistoryRecordToResult } from '../../ui/components/user-result-card.js';

const ONBOARDING_KEY = STORAGE_KEYS.ACCOUNT_ONBOARDING_DONE;

const SUBSCRIPTION_LABELS = {
    active: { label: 'Aktif', tone: 'success' },
    trialing: { label: 'Deneme', tone: 'info' },
    past_due: { label: 'Ödeme bekleniyor', tone: 'warning' },
    canceled: { label: 'İptal edildi', tone: 'muted' },
    incomplete: { label: 'Tamamlanmadı', tone: 'muted' }
};

export class AccountManager {
    constructor(ui, auth) {
        this.ui = ui;
        this.auth = auth;
        this.activeTab = 'overview';
        this.activeFavoritesTab = 'arac';
        this.subscription = null;
        this.loading = false;
        this.app = null;
    }

    handleQueryParams(params = new URLSearchParams()) {
        const subscribed = params.get('subscribed') === 'true';
        const cancelled = params.get('cancelled') === 'true';
        const billingManaged = params.get('billing') === 'managed';
        const tab = params.get('tab');

        const allowedTabs = ['overview', 'analyses', 'favorites', 'comparisons', 'recommendations', 'notifications', 'settings', 'security', 'help'];
        if (tab && allowedTabs.includes(tab)) {
            this.activeTab = tab;
        }

        if (subscribed) {
            this.ui?.showSuccess?.('Ödemeniz alındı. Premium aboneliğiniz birkaç dakika içinde hesabınıza yansır.');
            this.activeTab = 'overview';
        } else if (cancelled) {
            this.ui?.showError?.('Ödeme işlemi iptal edildi. İstediğiniz zaman tekrar deneyebilirsiniz.');
            this.activeTab = 'overview';
        } else if (billingManaged) {
            this.ui?.showSuccess?.('Stripe abonelik panelinden döndünüz. Kart, fatura veya plan değişiklikleri kısa süre içinde yansır.');
            this.activeTab = 'overview';
            const user = this.auth?.getCurrentUser?.();
            if (user?.email) {
                enrollBillingHelp({
                    email: user.email,
                    user_id: user.id,
                    reason: 'billing_portal_return',
                    trigger_source: 'account_billing_return'
                }).catch(() => {});
            }
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
            if (this.subscription?.status === 'past_due') {
                enrollBillingHelp({
                    email: currentUser.email,
                    user_id: currentUser.id,
                    reason: 'past_due',
                    trigger_source: 'account_past_due'
                }).catch(() => {});
            }
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

        section.querySelectorAll('[data-dashboard-tab]').forEach((btn) => {
            const isActive = btn.dataset.dashboardTab === tabId;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-selected', String(isActive));
        });

        section.querySelectorAll('[data-dashboard-panel]').forEach((panel) => {
            const isActive = panel.dataset.dashboardPanel === tabId;
            panel.hidden = !isActive;
            panel.classList.toggle('is-active', isActive);
            if (isActive) panel.removeAttribute('tabindex');
            else panel.setAttribute('tabindex', '-1');
        });
    }

    bindEvents(app) {
        this.app = app;
        const section = document.getElementById('profil');
        if (!section || section.dataset.accountBound) return;
        section.dataset.accountBound = 'true';

        section.addEventListener('click', (event) => {
            const tabBtn = event.target.closest('[data-dashboard-tab]');
            if (tabBtn) {
                event.preventDefault();
                this.setTab(tabBtn.dataset.dashboardTab);
                this.toggleSidebar(false);
                return;
            }

            const favoriteTabBtn = event.target.closest('[data-favorites-tab]');
            if (favoriteTabBtn) {
                event.preventDefault();
                this.activeFavoritesTab = favoriteTabBtn.dataset.favoritesTab || 'arac';
                this.refresh(this.auth?.getCurrentUser?.());
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

            if (event.target.closest('#user-dashboard-menu-toggle')) {
                event.preventDefault();
                this.toggleSidebar(true);
            }

            if (event.target.closest('#user-dashboard-sidebar-backdrop')) {
                event.preventDefault();
                this.toggleSidebar(false);
            }

            const removeFavoriteBtn = event.target.closest('[data-dashboard-remove-favorite]');
            if (removeFavoriteBtn?.dataset.dashboardRemoveFavorite) {
                event.preventDefault();
                app.toggleFavorite(removeFavoriteBtn.dataset.dashboardRemoveFavorite);
                this.refresh(this.auth?.getCurrentUser?.());
            }

            const compareFavoriteBtn = event.target.closest('[data-dashboard-compare-favorite]');
            if (compareFavoriteBtn?.dataset.dashboardCompareFavorite) {
                event.preventDefault();
                app.addListingToComparison(compareFavoriteBtn.dataset.dashboardCompareFavorite);
                this.ui?.showSuccess?.('Favori karşılaştırma listesine eklendi.');
            }

            if (event.target.closest('#account-resend-verify')) {
                event.preventDefault();
                this.resendVerification(app);
            }
        });
        section.addEventListener('submit', (event) => {
            const settingsForm = event.target.closest('#account-settings-form');
            if (settingsForm) this.handleSettingsSubmit(event, app);
        });
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
        const dashboardData = this.buildDashboardData(user, profile, subMeta, hasPremium, emailVerified);
        root.innerHTML = `
            ${renderUserDashboard(dashboardData)}
            <section class="ud-panel-extra ${this.activeTab === 'comparisons' ? 'is-active' : ''}" data-dashboard-panel="comparisons" ${this.activeTab === 'comparisons' ? '' : 'hidden'}>
                <header class="account-panel-head">
                    <h2>Karşılaştırmalarım</h2>
                    <p>Kaydettiğiniz karşılaştırmaları tek merkezde yönetin.</p>
                </header>
                <p class="ud-empty-note">Karşılaştırma öğesi: ${dashboardData.comparisonsCount}</p>
                <div class="account-quick-actions">
                    <a href="/karsilastir" class="btn btn-primary">Karşılaştırma Merkezine Git</a>
                    <a href="/auto/" class="btn btn-outline">Yeni analiz başlat</a>
                </div>
            </section>
            <section class="ud-panel-extra ${this.activeTab === 'recommendations' ? 'is-active' : ''}" data-dashboard-panel="recommendations" ${this.activeTab === 'recommendations' ? '' : 'hidden'}>
                <header class="account-panel-head">
                    <h2>AI Önerilerim</h2>
                    <p>Kayıtlı analizlerinize göre bilgilendirme amaçlı öneriler.</p>
                </header>
                ${dashboardData.recommendations.length
                  ? `<div class="ud-side-stack">${dashboardData.recommendations.map((item) => `<article class="ud-rec-item"><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.description)}</p></article>`).join('')}</div>`
                  : '<p class="ud-empty-note">Henüz AI önerisi oluşturacak yeterli veri yok.</p>'}
            </section>
            <section class="ud-panel-extra ${this.activeTab === 'notifications' ? 'is-active' : ''}" data-dashboard-panel="notifications" ${this.activeTab === 'notifications' ? '' : 'hidden'}>
                <header class="account-panel-head">
                    <h2>Bildirimler</h2>
                    <p>Karar durum güncellemeleri ve sistem bildirimleri.</p>
                </header>
                <p class="ud-empty-note">Yeni bildirim yok. Analiz tamamlandığında veya favori durumu değiştiğinde burada listelenir.</p>
            </section>
            <section class="ud-panel-extra ${this.activeTab === 'settings' ? 'is-active' : ''}" data-dashboard-panel="settings" ${this.activeTab === 'settings' ? '' : 'hidden'}>
                <header class="account-panel-head">
                    <h2>Profil Ayarları</h2>
                    <p>Profil bilgileriniz ve bildirim tercihleriniz.</p>
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
                    <div class="form-row">
                        <div class="form-group">
                            <label for="account-location">Konum</label>
                            <input id="account-location" name="location" type="text" value="${escapeHtml(profile?.location || '')}" placeholder="İl / İlçe">
                        </div>
                        <div class="form-group">
                            <label for="account-notification-preference">Bildirim tercihi</label>
                            <select id="account-notification-preference" name="notification_preference">
                                <option value="all">Tüm bildirimler</option>
                                <option value="important">Sadece önemli bildirimler</option>
                                <option value="none">Kapalı</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="account-bio">Kısa not</label>
                        <textarea id="account-bio" name="bio" rows="3" maxlength="280" placeholder="İsteğe bağlı">${escapeHtml(profile?.bio || '')}</textarea>
                    </div>
                    <div class="account-quick-actions">
                        <button type="submit" class="btn btn-primary">Değişiklikleri kaydet</button>
                        <button type="button" class="btn btn-ghost" id="account-logout-btn">Çıkış yap</button>
                    </div>
                </form>
            </section>
            <section class="ud-panel-extra ${this.activeTab === 'security' ? 'is-active' : ''}" data-dashboard-panel="security" ${this.activeTab === 'security' ? '' : 'hidden'}>
                <header class="account-panel-head">
                    <h2>Hesap Güvenliği</h2>
                    <p>Şifre ve oturum güvenliği kontrolleri.</p>
                </header>
                <ul class="account-security-list">
                    <li>
                        <div>
                            <strong>Şifre</strong>
                            <p>Şifrenizi unuttuysanız güvenli sıfırlama bağlantısı alın.</p>
                        </div>
                        <button type="button" class="btn btn-outline btn-sm" id="account-reset-password">Şifre sıfırla</button>
                    </li>
                    <li>
                        <div>
                            <strong>E-posta doğrulaması</strong>
                            <p>${emailVerified ? 'E-posta doğrulandı.' : 'E-posta doğrulaması bekleniyor.'}</p>
                        </div>
                        ${emailVerified ? '<span class="account-plan-badge tone-success">Doğrulandı</span>' : '<button type="button" class="btn btn-outline btn-sm" id="account-resend-verify">Doğrulama e-postasını gönder</button>'}
                    </li>
                </ul>
            </section>
            <section class="ud-panel-extra ${this.activeTab === 'help' ? 'is-active' : ''}" data-dashboard-panel="help" ${this.activeTab === 'help' ? '' : 'hidden'}>
                <header class="account-panel-head">
                    <h2>Yardım & Destek</h2>
                    <p>Sık sorulan sorular ve destek kanalları.</p>
                </header>
                <div class="account-quick-actions">
                    <a href="/#landing-faq" class="btn btn-outline" data-home-anchor="landing-faq">SSS</a>
                    <a href="/iletisim.html" class="btn btn-outline">Destek Talebi</a>
                    <a href="/metodoloji/" class="btn btn-outline">Metodoloji</a>
                </div>
            </section>
        `;

        root.querySelector('#account-reset-password')?.addEventListener('click', () => {
            this.auth?.showForgotPasswordForm?.(user.email);
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

    toggleSidebar(open) {
        const sidebar = document.getElementById('user-dashboard-sidebar');
        const backdrop = document.getElementById('user-dashboard-sidebar-backdrop');
        const toggle = document.getElementById('user-dashboard-menu-toggle');
        if (!sidebar || !backdrop || !toggle) return;
        sidebar.classList.toggle('is-open', open);
        backdrop.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
    }

    buildDashboardData(user, profile, subMeta, hasPremium, emailVerified) {
        const history = this.readDecisionHistory(user.id);
        const favorites = this.readFavorites();
        const comparisons = this.readComparisons();
        const ongoingCards = this.buildOngoingCards(history);
        const resultCards = history.slice(0, 8).map((record) => mapHistoryRecordToResult(record));
        const housingAnalyses = history
            .filter((record) => record?.categoryId === 'konut' || record?.categoryId === 'housing')
            .slice(0, 12)
            .map((record) => mapHistoryRecordToResult(record));
        const groupedFavorites = this.groupFavoritesByCategory(favorites);
        const recommendations = this.buildRecommendations(resultCards, emailVerified);
        const initials = this.getInitials(profile);
        return {
            profile,
            user,
            initials,
            activeTab: this.activeTab,
            activeFavoritesTab: this.activeFavoritesTab,
            metrics: [
                { title: 'Tamamlanan Analizler', value: String(history.length), subtitle: 'Tüm kategorilerde', icon: 'clipboard-check', tone: 'success' },
                { title: 'Devam Edenler', value: String(ongoingCards.length), subtitle: 'Yarım kalan analizler', icon: 'timer-reset', tone: 'info' },
                { title: 'Favoriler', value: String(favorites.length), subtitle: 'Kaydedilen öğeler', icon: 'heart', tone: 'violet' },
                { title: 'Kaydedilen Sonuçlar', value: String(resultCards.length), subtitle: 'Önemli kararlar', icon: 'folder-kanban', tone: 'warning' }
            ],
            ongoingCards,
            resultCards,
            housingAnalyses,
            favorites: groupedFavorites,
            recommendations,
            notificationCount: recommendations.length,
            quickActions: [
                { title: 'Yeni Analiz Başlat', description: 'İstediğiniz kategoride yeni analiz yap', href: '/auto/', icon: 'plus-circle' },
                { title: 'Karşılaştırma Oluştur', description: 'Seçenekleri karşılaştır', href: '/karsilastir', icon: 'scale' },
                { title: 'Raporlarımı İndir', description: 'Tüm analiz raporlarını indir', href: '/gecmis', icon: 'download' },
                { title: 'Favori Listemi Gör', description: 'Kaydettiğiniz tüm öğeleri görüntüleyin', href: '/favoriler', icon: 'heart' }
            ],
            membershipLabel: subMeta.label,
            hasPremium,
            comparisonsCount: comparisons.length
        };
    }

    readDecisionHistory(userId) {
        if (!userId) return [];
        return readStoredJson(userScopedKey(STORAGE_KEYS.DECISION_HISTORY, userId), []);
    }

    readFavorites() {
        return readStoredJson(STORAGE_KEYS.FAVORITES, []);
    }

    readComparisons() {
        return readStoredJson(STORAGE_KEYS.COMPARISON_ITEMS, []);
    }

    buildOngoingCards(history = []) {
        const routeMap = {
            auto: { category: 'Auto', href: '/auto/' },
            konut: { category: 'Konut', href: '/konut/' },
            tatil: { category: 'Tatil', href: '/tatil/' },
            finans: { category: 'Finansman', href: '/finansman/' },
            finansman: { category: 'Finansman', href: '/finansman/' }
        };
        const recentRecords = history
            .filter((item) => item?.createdAt)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 4);

        return recentRecords.map((record) => {
            const key = record.categoryId === 'auto' ? 'auto' : record.categoryId;
            const meta = routeMap[key] || { category: record.categoryName || 'Karar', href: '/karar-asistani' };
            const score = Number(record?.topPick?.score) || 50;
            const progress = Math.max(20, Math.min(95, score));
            return {
                category: `${meta.category} Analizi`,
                title: record?.topPick?.name || `${meta.category} kararı`,
                description: record.summary || 'Analiz kaydınızdan devam edebilirsiniz.',
                progress,
                updatedAtLabel: record.createdAt ? new Date(record.createdAt).toLocaleDateString('tr-TR') : 'Tarih bilinmiyor',
                href: meta.href
            };
        });
    }

    normalizeFavoriteCategory(item = {}) {
        const raw = String(item.category || '').toLowerCase();
        if (raw === 'arac' || raw === 'auto') return 'arac';
        if (raw === 'ev' || raw === 'konut' || raw === 'housing') return 'konut';
        if (raw === 'tatil' || raw === 'vacation' || raw === 'travel') return 'tatil';
        if (raw === 'finans' || raw === 'finansman' || raw === 'finance') return 'finans';
        return 'arac';
    }

    groupFavoritesByCategory(favorites = []) {
        const groups = { arac: [], konut: [], tatil: [], finans: [] };
        favorites.forEach((item) => {
            const key = this.normalizeFavoriteCategory(item);
            groups[key].push({
                id: item.id,
                title: item.title || item.name || 'Kayıtlı Favori',
                categoryLabel: item.category || key,
                priceLabel: Number(item.price) > 0
                    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(item.price)
                    : 'Maliyet belirtilmedi',
                detail: item.location || item.description || 'Detay bilgisi yok'
            });
        });
        return groups;
    }

    buildRecommendations(resultCards = [], emailVerified = true) {
        const picks = resultCards.slice(0, 4);
        if (!picks.length) return [];
        const base = picks.map((item) => ({
            title: item.categoryLabel,
            description: item.score >= 80
                ? `${item.categoryLabel} skorunuz güçlü görünüyor. Maliyet ve risk dengesini koruyarak ilerleyin.`
                : `${item.categoryLabel} skorunuz geliştirmeye açık. Alternatif senaryolarla maliyet/risk dengesini gözden geçirin.`,
            href: '/gecmis'
        }));
        if (!emailVerified) {
            base.unshift({
                title: 'Hesap güvenliği',
                description: 'E-posta doğrulamanızı tamamladığınızda bildirim ve kayıt özellikleri daha sağlıklı çalışır.',
                href: '/profil/'
            });
        }
        return base.slice(0, 4);
    }
}

export default AccountManager;
