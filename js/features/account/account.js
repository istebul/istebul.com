import API from '../../core/api.js';
import { escapeHtml } from '../../core/security.js';
import config from '../../core/config.js';
import { enrollBillingHelp } from '../customer/customer-ops-client.js';
import { STORAGE_KEYS, readStoredJson, userScopedKey } from '../../core/storage-keys.js';
import { renderAccountHub } from '../../ui/components/account-hub.js';
import { mapHistoryRecordToResult } from '../../ui/components/user-result-card.js';
import {
    buildDashboardV2Data,
    bindDashboardV2,
    renderDashboardV2,
    renderDashboardV2Guest
} from './dashboard-v2.js';
import { addAnalysisToCompareSelection, removeCompareSelection } from './dashboard-v2-store.js';
import { bindPaywallV1 } from '../billing/paywall-v1.js';
import { resolvePlanTier } from '../billing/pro-features.js';
import { requestAccountDeletion } from '../auth/account-deletion.js';
import { resolveRouteSurface } from '../../runtime/route-surface.js';

const ONBOARDING_KEY = STORAGE_KEYS.ACCOUNT_ONBOARDING_DONE;
const NOTIFICATION_PREF_KEY = 'istebul_notification_preference';

const MAIN_DASHBOARD_TABS = ['overview', 'analyses', 'favorites'];
const ACCOUNT_HUB_TABS = ['settings', 'security', 'notifications', 'help'];

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
        this._openBillingPortal = false;
    }

    handleQueryParams(params = new URLSearchParams()) {
        const subscribed = params.get('subscribed') === 'true';
        const cancelled = params.get('cancelled') === 'true';
        const billingManaged = params.get('billing') === 'managed';
        const billingPortal = params.get('billing') === 'portal';
        const paymentSuccess = params.get('payment') === 'success';
        const paymentFailed = params.get('payment') === 'failed';
        const tab = params.get('tab');

        const allowedTabs = ['overview', 'analyses', 'favorites', 'comparisons', 'recommendations', 'notifications', 'settings', 'security', 'help'];
        if (tab === 'subscription') {
            this.activeTab = 'settings';
        } else if (tab && allowedTabs.includes(tab)) {
            this.activeTab = tab;
        } else if (!ACCOUNT_HUB_TABS.includes(this.activeTab) && !MAIN_DASHBOARD_TABS.includes(this.activeTab)) {
            this.activeTab = 'settings';
        }

        if (billingPortal) {
            this._openBillingPortal = true;
        }

        if (paymentSuccess) {
            this.ui?.showSuccess?.('Ödeme başarılı. Abonelik/rapor hakkınız güncellendi.');
            this.activeTab = 'overview';
        } else if (paymentFailed) {
            this.ui?.showError?.('Ödeme tamamlanamadı.');
            this.activeTab = 'overview';
        } else if (subscribed) {
            this.ui?.showSuccess?.('Ödemeniz alındı. Premium aboneliğiniz birkaç dakika içinde hesabınıza yansır.');
            this.activeTab = 'overview';
        } else if (cancelled) {
            this.ui?.showError?.('Ödeme işlemi iptal edildi. İstediğiniz zaman tekrar deneyebilirsiniz.');
            this.activeTab = 'overview';
        } else if (billingManaged) {
            this.ui?.showSuccess?.('Abonelik ayarlarınızdan döndünüz. Değişiklikler kısa süre içinde yansır.');
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

        if (subscribed || cancelled || billingManaged || billingPortal || paymentSuccess || paymentFailed || tab) {
            const cleanUrl = `${window.location.pathname}`;
            window.history.replaceState(null, '', cleanUrl);
        }
    }

    async refresh(user = null) {
        const section = document.getElementById('profil');
        if (!section) return;

        const currentUser = user || this.auth?.getCurrentUser?.();
        const onProfilRoute = resolveRouteSurface(window.location.pathname) === 'profil';

        if (!currentUser) {
            if (onProfilRoute) this.renderGuest();
            return;
        }

        if (!onProfilRoute) {
            return;
        }

        this.loading = true;
        this.renderLoading(currentUser);

        try {
            const profile = await API.getProfile(currentUser.id);
            currentUser.profile = profile;

            let entitlements = [];
            try {
                this.subscription = await API.getSubscription(currentUser.id);
            } catch (subError) {
                console.warn('Subscription could not be loaded:', subError);
                this.subscription = null;
            }

            try {
                entitlements = await API.getUserEntitlements(currentUser.id);
                if (typeof window !== 'undefined') {
                    window.__ibPaymentEntitlements = entitlements;
                }
            } catch (entError) {
                console.warn('Entitlements could not be loaded:', entError);
            }

            this.renderAccount(currentUser, profile, entitlements);
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

    /** Dashboard panels expose role="tabpanel"; tab buttons use role="tab". */
    setTab(tabId) {
        this.activeTab = tabId;
        const section = document.getElementById('profil');
        if (!section) return;

        section.querySelectorAll('[data-dashboard-tab]').forEach((btn) => {
            const isActive = btn.dataset.dashboardTab === tabId;
            btn.classList.toggle('is-active', isActive);
            if (btn.matches('.account-hub-tab, .ud-nav-item')) {
                btn.setAttribute('role', 'tab');
                btn.setAttribute('aria-selected', String(isActive));
            }
        });

        section.querySelectorAll('[data-dashboard-overview]').forEach((el) => {
            const part = el.dataset.dashboardOverview;
            let visible = false;
            if (part === 'header') visible = true;
            if (part === 'summary') visible = tabId === 'overview';
            if (part === 'grid') visible = MAIN_DASHBOARD_TABS.includes(tabId);
            if (part === 'side') visible = tabId === 'overview';
            el.hidden = !visible;
        });

        section.querySelectorAll('[data-dashboard-panel]').forEach((panel) => {
            const isActive = panel.dataset.dashboardPanel === tabId;
            panel.setAttribute('role', 'tabpanel');
            panel.hidden = !isActive;
            panel.classList.toggle('is-active', isActive);
            if (isActive) panel.removeAttribute('tabindex');
            else panel.setAttribute('tabindex', '-1');
        });

        if (ACCOUNT_HUB_TABS.includes(tabId)) {
            const hub = section.querySelector('.account-hub');
            hub?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
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

            const removeComparisonBtn = event.target.closest('[data-comparison-remove]');
            if (removeComparisonBtn?.dataset.comparisonRemove) {
                event.preventDefault();
                app.removeComparisonItem?.(removeComparisonBtn.dataset.comparisonRemove);
                this.refresh(this.auth?.getCurrentUser?.());
                return;
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

        section.addEventListener('change', (event) => {
            const pref = event.target.closest(
                '#account-notification-preference, #account-notification-preference-inline'
            );
            if (!pref) return;
            const user = app.currentUser;
            if (!user?.id) return;
            try {
                localStorage.setItem(userScopedKey(NOTIFICATION_PREF_KEY, user.id), pref.value);
            } catch {}
            const other = section.querySelector(
                pref.id === 'account-notification-preference'
                    ? '#account-notification-preference-inline'
                    : '#account-notification-preference'
            );
            if (other) other.value = pref.value;
            this.ui?.showSuccess?.('Bildirim tercihi kaydedildi.');
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

        const statusEl = form.querySelector('#account-settings-status');

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Kaydediliyor...';
            if (statusEl) {
                statusEl.textContent = 'Kaydediliyor…';
                statusEl.classList.remove('is-error');
            }

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
            if (statusEl) statusEl.textContent = 'Profil bilgileriniz kaydedildi.';
            await this.refresh(app.currentUser);
        } catch (error) {
            console.error('Settings save failed:', error);
            this.ui?.showError?.('Profil güncellenemedi. Lütfen tekrar deneyin.');
            if (statusEl) {
                statusEl.textContent = 'Kayıt başarısız. Lütfen tekrar deneyin.';
                statusEl.classList.add('is-error');
            }
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

        document.getElementById('profil')?.classList.remove('profil-has-dashboard');

        root.innerHTML = renderDashboardV2Guest() + `
            <div class="account-guest dashboard-v2-legacy-guest hidden" hidden>
                <div class="account-guest-copy">
                    <span class="account-eyebrow"><i data-lucide="shield-check"></i> Güvenli hesap alanı</span>
                    <h2>Hesabınızı tek yerden yönetin</h2>
                    <p>Karar geçmişinizi saklayın, profil bilgilerinizi güncelleyin ve Premium aboneliğinizi görün.</p>
                    <ul class="account-trust-list">
                        <li><i data-lucide="lock"></i> Oturumlar şifreli bağlantı üzerinden korunur</li>
                        <li><i data-lucide="mail-check"></i> E-posta doğrulama ve şifre sıfırlama desteği</li>
                        <li><i data-lucide="credit-card"></i> iyzico / PayTR ile güvenli ödeme</li>
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

        bindDashboardV2(root.querySelector('[data-dashboard-v2]'), {
            ui: this.ui,
            onRefresh: () => this.refresh(this.auth?.getCurrentUser?.())
        });
        bindPaywallV1(root);
        this.ui?.loadIcons?.();

        if (this._openBillingPortal) {
            this._openBillingPortal = false;
            queueMicrotask(() => this.auth?.showLoginModal?.());
        }
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

    renderAccount(user, profile, entitlements = []) {
        const root = document.getElementById('account-root');
        if (!root) return;

        const emailVerified = Boolean(user.email_confirmed_at || user.confirmed_at);
        const sub = this.subscription;
        const subMeta = SUBSCRIPTION_LABELS[sub?.status] || { label: 'Ücretsiz', tone: 'muted' };
        const hasPremiumReport = entitlements.some(
            (e) => e.entitlement_code === 'premium_report' && e.status === 'active'
        );
        const { isPro: hasPremium } = resolvePlanTier(user, {
            profile,
            subscription: sub,
            isAuthenticated: true
        });
        const membershipLabel = hasPremium
            ? subMeta.label
            : hasPremiumReport
                ? 'Premium rapor'
                : subMeta.label;
        const dashboardData = this.buildDashboardData(user, profile, subMeta, hasPremium, emailVerified);
        const v2Data = buildDashboardV2Data({
            user,
            profile,
            userId: user.id,
            history: this.readDecisionHistory(user.id),
            favorites: this.readFavorites(),
            hasPremium,
            membershipLabel
        });
        document.getElementById('profil')?.classList.add('profil-has-dashboard');
        const hubTab = ACCOUNT_HUB_TABS.includes(this.activeTab) ? this.activeTab : 'settings';
        root.innerHTML = `
            ${renderDashboardV2(v2Data)}
            ${renderAccountHub({
                activeTab: hubTab,
                profile,
                emailVerified,
                notificationPreference: dashboardData.notificationPreference,
                comparisons: dashboardData.comparisons,
                recommendations: dashboardData.recommendations,
                membershipLabel,
                hasPremium
            })}`;

        bindDashboardV2(root.querySelector('[data-dashboard-v2]'), {
            userId: user.id,
            ui: this.ui,
            pdfReports: v2Data.pdfReports,
            store: { addAnalysisToCompareSelection, removeCompareSelection },
            onRefresh: () => this.refresh(user)
        });

        bindPaywallV1(root, {
            onCheckoutError: () => this.ui?.showError?.('Pro ödeme oturumu başlatılamadı.')
        });

        root.querySelector('#account-reset-password')?.addEventListener('click', () => {
            this.auth?.showForgotPasswordForm?.(user.email);
        });

        root.querySelector('#account-delete-self-serve')?.addEventListener('click', async () => {
            const confirmed = window.confirm(
                'Hesabınız ve ilişkili veriler kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?'
            );
            if (!confirmed) return;

            const deleteBtn = root.querySelector('#account-delete-self-serve');
            const statusEl = root.querySelector('#account-delete-status');
            if (statusEl) {
                statusEl.textContent = 'Silme işlemi başlatılıyor…';
                statusEl.classList.remove('is-error');
            }
            if (deleteBtn) {
                deleteBtn.disabled = true;
                deleteBtn.setAttribute('aria-busy', 'true');
            }

            const result = await requestAccountDeletion({ confirm: true });
            if (result.ok) {
                window.location.href = '/?account_deleted=1';
                return;
            }

            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.removeAttribute('aria-busy');
            }
            if (statusEl) {
                statusEl.textContent = result.error || 'Silme işlemi tamamlanamadı.';
                statusEl.classList.add('is-error');
            } else {
                this.ui?.showError?.(result.error || 'Silme işlemi tamamlanamadı.');
            }
        });

        this.setTab(ACCOUNT_HUB_TABS.includes(this.activeTab) ? this.activeTab : hubTab);
        this.ui?.loadIcons?.();

        if (this._openBillingPortal && this.app?.openBillingPortal) {
            this._openBillingPortal = false;
            queueMicrotask(() => {
                this.app.openBillingPortal();
            });
        }
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
        const notificationPreference = this.readNotificationPreference(user.id);
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
            comparisonsCount: comparisons.length,
            comparisons,
            emailVerified,
            notificationPreference
        };
    }

    readNotificationPreference(userId) {
        if (!userId) return 'all';
        try {
            return localStorage.getItem(userScopedKey(NOTIFICATION_PREF_KEY, userId)) || 'all';
        } catch {
            return 'all';
        }
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
            finans: { category: 'Finansman', href: '/finans/' },
            finansman: { category: 'Finansman', href: '/finans/' }
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
