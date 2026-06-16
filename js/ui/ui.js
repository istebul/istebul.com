import { installListingsUI } from './listings-ui.js';
import { installComparisonUI } from './comparison-ui.js';
import { installAssistantUI } from './assistant-ui.js';
import { escapeHtml as escapeHtmlValue, safeImageUrl as sanitizeImageUrl, safeUrl } from '../core/security.js';
import { refreshLucideIcons, scheduleLucideIcons } from '../runtime/lucide-loader.js';
import { revenueManager } from '../features/monetization/revenue-manager.js';
import {
    AI_SCORE_DISCLAIMER,
    buildListingTrustStripHtml,
    hasPublicSourceUrl
} from './listing-trust-ui.js';

if (typeof document !== 'undefined') {
    document.addEventListener('ib:refresh-icons', () => {
        scheduleLucideIcons();
    });
}
// UI Manager
import { state } from '../core/state.js';
import { readStorageRaw, writeStorageRaw, STORAGE_KEYS } from '../core/storage-keys.js';
import { formatMoney, formatNumber, formatRelativeTime } from '../core/format.js';
import {
    renderListingSkeletonGrid,
    renderInlineSkeletonPanel
} from '../core/loading-skeleton.js';

export class UIManager {
    constructor() {
        this.notifications = [];
    }

    init() {
        installAssistantUI(this.constructor);
        this.setupTheme();
        this.setupGlobalUI();
        this.setupResponsiveNav();
        this.setupKeyboardShortcuts();
    }


    setupTheme() {
        const savedTheme = readStorageRaw(STORAGE_KEYS.THEME);
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
        this.applyTheme(initialTheme);

        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
                writeStorageRaw(STORAGE_KEYS.THEME, nextTheme);
                this.applyTheme(nextTheme);
            });
        }
    }

    applyTheme(theme) {
        const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.dataset.theme = normalizedTheme;
        document.documentElement.style.colorScheme = normalizedTheme;

        const themeMeta = document.getElementById('theme-color-meta');
        if (themeMeta) {
            themeMeta.setAttribute('content', normalizedTheme === 'dark' ? '#0f172a' : '#2563eb');
        }

        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const isDark = normalizedTheme === 'dark';
            themeToggle.setAttribute('aria-label', isDark ? 'Aydınlık modu aç' : 'Koyu modu aç');
            themeToggle.setAttribute('aria-pressed', String(isDark));
            themeToggle.setAttribute("title", isDark ? "Aydınlık moda geç" : "Koyu moda geç");
            themeToggle.innerHTML = `
                <i data-lucide="${isDark ? "sun" : "moon"}"></i>
                <span class="sr-only">${isDark ? "Aydınlık modu aç" : "Koyu modu aç"}</span>
            `;
            this.loadIcons();
        }
    }

    setupGlobalUI() {
        // Close modals on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Setup lucide icons
        this.loadIcons();
    }

    setupResponsiveNav() {
        const navMenu = document.getElementById('nav-menu');
        const navAuth = document.getElementById('nav-auth');
        const navMoreMenu = document.getElementById('nav-more-menu');
        const navMoreButton = document.getElementById('nav-more-btn');
        const navMoreList = document.getElementById('nav-more-list');
        const navProductMenu = document.getElementById('nav-product-menu');
        const navProductButton = document.getElementById('nav-product-btn');
        const navProductList = document.getElementById('nav-product-list');
        const closeDropdown = (button, list) => {
            if (!button || !list) return;
            button.setAttribute('aria-expanded', 'false');
            list.classList.remove('is-open');
            list.hidden = true;
        };
        const toggleDropdown = (button, list) => {
            if (!button || !list) return;
            const isOpen = button.getAttribute('aria-expanded') === 'true';
            button.setAttribute('aria-expanded', String(!isOpen));
            list.classList.toggle('is-open', !isOpen);
            list.hidden = isOpen;
        };
        const closeMoreMenu = () => closeDropdown(navMoreButton, navMoreList);
        const closeProductMenu = () => closeDropdown(navProductButton, navProductList);
        const toggleMoreMenu = () => {
            closeProductMenu();
            toggleDropdown(navMoreButton, navMoreList);
        };
        const toggleProductMenu = () => {
            closeMoreMenu();
            toggleDropdown(navProductButton, navProductList);
        };
        const navToggle = document.createElement('button');
        navToggle.className = 'nav-toggle';
        navToggle.type = 'button';
        navToggle.setAttribute('aria-label', 'Menüyü aç');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.innerHTML = `
            <span class="nav-toggle-burger" aria-hidden="true">
                <span></span><span></span><span></span>
            </span>
        `;
        navToggle.style.display = 'none';

        document.querySelector('.nav-container').insertBefore(navToggle, navMenu);

        if (navMenu && navAuth && !document.getElementById('mobile-auth-actions')) {
            const mobileAuthActions = document.createElement('div');
            mobileAuthActions.id = 'mobile-auth-actions';
            mobileAuthActions.className = 'mobile-auth-actions';
            mobileAuthActions.innerHTML = `
                <a href="/karar-asistani/" class="btn btn-primary" data-native-route data-analytics-cta="cta_decision_nav_mobile" data-analytics-placement="nav_mobile" data-i18n="home.ctaAnalyze">Ön değerlendirmeye başla</a>
                <button type="button" class="btn btn-outline" data-auth-open="login" data-mobile-login>Üye Girişi</button>
                <button type="button" class="btn btn-primary" data-auth-open="register" data-mobile-register>Üye Ol</button>
            `;
            navMenu.append(mobileAuthActions);
        }

        navToggle.addEventListener('click', () => {
            const isOpen = navMenu.classList.toggle('show');
            navToggle.setAttribute('aria-expanded', String(isOpen));
            navToggle.setAttribute('aria-label', isOpen ? 'Menüyü kapat' : 'Menüyü aç');
            if (!isOpen) {
                closeMoreMenu();
                closeProductMenu();
            }
        });

        if (navMoreButton && navMoreList && navMoreMenu) {
            navMoreButton.addEventListener('click', (event) => {
                event.preventDefault();
                toggleMoreMenu();
            });
            document.addEventListener('click', (event) => {
                if (!navMoreMenu.contains(event.target)) {
                    closeMoreMenu();
                }
                if (navProductMenu && !navProductMenu.contains(event.target)) {
                    closeProductMenu();
                }
            });
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    closeMoreMenu();
                    closeProductMenu();
                }
            });
        }

        if (navProductButton && navProductList && navProductMenu) {
            navProductButton.addEventListener('click', (event) => {
                event.preventDefault();
                toggleProductMenu();
            });
        }

        // Show/hide toggle based on screen size
        const navCompactBreakpoint = 1280;
        const checkScreenSize = () => {
            if (window.innerWidth < navCompactBreakpoint) {
                navToggle.style.display = 'inline-flex';
                navToggle.setAttribute('aria-expanded', 'false');
                navToggle.setAttribute('aria-label', 'Menüyü aç');
                navMenu.classList.remove('show');
                closeMoreMenu();
                closeProductMenu();
            } else {
                navToggle.style.display = 'none';
                navMenu.classList.add('show');
            }
        };

        window.addEventListener('resize', checkScreenSize);
        checkScreenSize();

        this.loadIcons();
        this.setupUserMenu();
    }

    setupUserMenu() {
        const userMenu = document.getElementById('user-menu');
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userDropdown = document.getElementById('user-dropdown');
        if (!userMenu || !userMenuBtn || userMenu.dataset.userMenuBound === 'true') return;

        userMenu.dataset.userMenuBound = 'true';

        const closeUserMenu = () => {
            userMenu.classList.remove('is-open');
            userMenuBtn.setAttribute('aria-expanded', 'false');
        };

        const toggleUserMenu = () => {
            const isOpen = userMenu.classList.toggle('is-open');
            userMenuBtn.setAttribute('aria-expanded', String(isOpen));
        };

        userMenuBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleUserMenu();
        });

        userDropdown?.addEventListener('click', (event) => {
            const accountLink = event.target.closest('a[href="/profil/"], a[href="/profil"]');
            if (accountLink) {
                event.preventDefault();
                closeUserMenu();
                window.app?.router?.navigate?.('/profil');
                return;
            }

            if (event.target.closest('a[href], button')) {
                closeUserMenu();
            }
        });

        document.addEventListener('click', (event) => {
            if (!userMenu.contains(event.target)) {
                closeUserMenu();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeUserMenu();
            }
        });

        document.getElementById('nav-dashboard-quick')?.addEventListener('click', (event) => {
            event.preventDefault();
            closeUserMenu();
            window.app?.router?.navigate?.('/profil');
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.focus();
                }
            }

            // Ctrl/Cmd + / for help
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.showHelpModal();
            }
        });
    }

    loadIcons() {
        scheduleLucideIcons();
    }

    async refreshIcons() {
        await refreshLucideIcons();
    }

    updateCollectionBadges({ favorites = 0, comparisons = 0 } = {}) {
        this.setNavCount('favorites-count', favorites);
        this.setNavCount('comparison-count', comparisons);
    }

    setNavCount(elementId, count = 0) {
        const badge = document.getElementById(elementId);
        if (!badge) return;

        const normalizedCount = Math.max(0, Number(count) || 0);
        badge.textContent = normalizedCount > 9 ? '9+' : String(normalizedCount);
        badge.hidden = normalizedCount === 0;
        badge.setAttribute('aria-label', normalizedCount + ' kayıt');
    }

    updateAuthUI(user) {
        const navAuth = document.getElementById('nav-auth');
        const navAuthMobile = document.getElementById('nav-auth-mobile');
        const navUser = document.getElementById('nav-user');
        const navLinksAnon = document.getElementById('nav-links-anon');
        const navLinksAuth = document.getElementById('nav-links-auth');
        const mainNav = document.getElementById('main-nav');
        const dashboardQuick = document.getElementById('nav-dashboard-quick');

        if (!navAuth || !navUser) return;

        if (user) {
            document.body.classList.add('nav-signed-in');
            mainNav?.classList.add('is-authenticated');

            navAuth.classList.add('hidden');
            navAuth.style.display = 'none';

            navAuthMobile?.classList.add('hidden');
            navAuthMobile?.setAttribute('hidden', '');

            navUser.classList.remove('hidden');
            navUser.style.display = 'flex';

            navLinksAnon?.classList.remove('hidden');
            navLinksAuth?.classList.add('hidden');

            dashboardQuick?.classList.remove('hidden');

            document.getElementById('user-menu')?.classList.remove('is-open');
            document.getElementById('user-menu-btn')?.setAttribute('aria-expanded', 'false');
        } else {
            document.body.classList.remove('nav-signed-in');
            mainNav?.classList.remove('is-authenticated');

            navAuth.classList.remove('hidden');
            navAuth.style.display = 'flex';

            navAuthMobile?.classList.remove('hidden');
            navAuthMobile?.removeAttribute('hidden');

            navUser.classList.add('hidden');
            navUser.style.display = 'none';

            navLinksAnon?.classList.remove('hidden');
            navLinksAuth?.classList.add('hidden');

            dashboardQuick?.classList.add('hidden');

            document.getElementById('user-menu')?.classList.remove('is-open');
            document.getElementById('user-menu-btn')?.setAttribute('aria-expanded', 'false');
        }
    }

    updateUserUI(profile) {
        const userName = document.getElementById('user-name');
        if (userName && profile) {
            userName.textContent = profile.full_name || profile.email;
        }
    }

    /** @deprecated Profile shell is rendered by AccountManager (#account-root). */
    renderProfile(profile) {
        const profileSection = document.getElementById('profil');
        if (!profileSection) return;

        const profileCard = profileSection.querySelector('.profile-card')
            || profileSection.querySelector('#account-root');
        if (!profileCard) return;

        if (profile && (profile.full_name || profile.email)) {
            profileCard.innerHTML = `
                <h3>Merhaba, ${this.escapeHtml(profile.full_name || profile.email)}</h3>
                <p>Hesabınız hazır. Profil bilgilerinizi güncelleyebilir, seçeneklerinizi yönetebilir ve favorilerinizi takip edebilirsiniz.</p>
                ${revenueManager.renderProfileSubscriptionBlock()}
                <div class="profile-summary">
                    <div><strong>Ad Soyad:</strong> ${this.escapeHtml(profile.full_name || 'Bilinmiyor')}</div>
                    <div><strong>E-posta:</strong> ${this.escapeHtml(profile.email || 'Bilinmiyor')}</div>
                    <div><strong>Rol:</strong> ${this.escapeHtml(profile.role || 'Kullanıcı')}</div>
                </div>
                <div class="profile-actions">
                    <button class="btn btn-primary" id="edit-profile-btn">Profili Düzenle</button>
                    <button class="btn btn-outline" id="profile-logout-btn">Çıkış Yap</button>
                </div>
            `;
        } else {
            profileCard.innerHTML = `
                <h3>Profiliniz hazır değil</h3>
                <p>Giriş yaparak profil bilgilerinizi görebilir ve seçenek ekleyebilirsiniz.</p>
                <button class="btn btn-primary" id="profile-login-btn">Hesabına gir veya analizini kaydet</button>
            `;
        }

        this.loadIcons();
        revenueManager.initProfileBillingControls(profileSection);
    }

    showAdminLink(user = null) {
        const adminLink = document.getElementById('admin-link');
        if (!adminLink) return;

        const role = user?.role?.toLowerCase?.() || '';
        const isAdmin = role === 'admin' || role === 'super_admin';

        adminLink.style.display = isAdmin ? 'block' : 'none';
    }

    renderCategories(categories, activeCategory = null) {
        const container = document.getElementById('categories-grid');
        if (!container) return;

        container.innerHTML = categories.map(category => this.getCategoryCardMarkup(category, activeCategory)).join('');
        this.loadIcons();
    }

    renderHeroCategories(categories, activeCategory = null) {
        const container = document.getElementById('hero-categories');
        if (!container) return;

        container.innerHTML = categories.slice(0, 6).map(category => this.getCategoryButtonMarkup(category, activeCategory)).join('');
        this.loadIcons();
    }

    renderCategoryMenu(categories, activeCategory = null) {
        const container = document.getElementById('category-menu');
        if (!container) return;

        container.innerHTML = categories.map(category => `
            <a href="/secenekler/" data-category="${this.escapeHtml(category.id)}" class="${category.id === activeCategory ? 'active' : ''}">${this.escapeHtml(category.name)} Seçenekleri</a>
        `).join('');
    }

    renderCategorySelect(categories) {
        const select = document.getElementById('listing-category');
        if (!select) return;

        select.innerHTML = categories.map(category => `
            <option value="${this.escapeHtml(category.id)}">${this.escapeHtml(category.name)}</option>
        `).join('');
    }


    clearDecisionResults() {
        const container = document.getElementById('assistant-results');
        if (container) {
            container.innerHTML = '';
        }
    }


    getListingLocationLabel(listing = {}) {
        if (listing.province) return listing.province + (listing.district ? '/' + listing.district : ' geneli');
        return listing.location || 'Konum belirtilmemiş';
    }

    getListingPrimaryActionLabel(categoryId) {
        const labels = {
            arac: 'Seçeneği İncele',
            ev: 'Seçeneği İncele',
            tatil: 'Seçeneği İncele',
            finansman: 'Seçeneği İncele',
            sigorta: 'Seçeneği İncele',
            kasko: 'Seçeneği İncele'
        };
        return labels[categoryId] || 'Seçeneği İncele';
    }

    getListingInsightItems(listing = {}, aiScore = 0) {
        const base = Array.isArray(listing.decisionHighlights) && listing.decisionHighlights.length
            ? listing.decisionHighlights.slice(0, 3)
            : [];

        if (!base.length && listing.category === 'arac') {
            base.push(listing.vehicleBrand || 'Marka uygun', listing.vehicleFuel || 'Maliyet kontrollü', 'Kredi kontrolü');
        }

        if (!base.length && listing.category === 'ev') {
            base.push('Konut analizi', 'Tapu kontrolü', 'Kredi simülasyonu');
        }

        if (!base.length && listing.category === 'tatil') {
            base.push('Tatil analizi', 'Paket kontrolü', 'İptal koşulu');
        }

        const items = [...base];
        const displayScore = this.resolveListingQualityScoreDisplay(listing, aiScore);
        if (displayScore !== null) {
            items.push('Uyum skoru ' + displayScore + '/100');
        }
        return items.slice(0, 4);
    }

    getListingInsightsMarkup(listing = {}, aiScore = 0) {
        return '<div class="listing-insights">' + this.getListingInsightItems(listing, aiScore).map((item) => '<span>' + this.escapeHtml(item) + '</span>').join('') + '</div>';
    }

    getListingQualityScore(listing = {}) {
        const explicitScore =
            Number(listing.score || listing.decisionScore || listing.matchScore || 0);

        if (explicitScore > 0) {
            return Math.max(0, Math.min(100, explicitScore));
        }

        return null;
    }

    /**
     * @param {Record<string, unknown>} [listing]
     * @param {number|null|undefined} [overrideScore]
     * @returns {number|null}
     */
    resolveListingQualityScoreDisplay(listing = {}, overrideScore) {
        const raw = overrideScore !== undefined && overrideScore !== null
            ? overrideScore
            : this.getListingQualityScore(listing);
        if (raw === null || raw === undefined || raw === '') return null;
        const num = Number(raw);
        if (!Number.isFinite(num) || num <= 0) return null;
        return Math.max(0, Math.min(100, Math.round(num)));
    }

    getListingComparisonSignature(listing = {}) {
        return 'listing:' + (listing.category || 'genel') + ':' + (listing.id || '');
    }

    renderListingToolbar({ count = 0, options = {}, sort = 'aiScore', view = 'grid' } = {}) {
        const toolbar = document.getElementById('marketplace-results-toolbar');
        if (!toolbar) return;

        const countLabel = document.getElementById('listing-result-count');
        const contextLabel = document.getElementById('listing-result-context');
        const sortSelect = document.getElementById('listing-sort');

        toolbar.hidden = false;
        if (countLabel) {
            countLabel.textContent =
                count === 0
                    ? 'Size uygun seçenekler hazırlanıyor'
                    : count === 1
                      ? '1 sonuç'
                      : `${this.formatNumberPlain(count)} sonuç`;
        }
        if (contextLabel) {
            contextLabel.textContent =
                count === 0 ? 'Karar skoruna göre listeleniyor' : this.getListingToolbarContext(options, count);
            contextLabel.hidden = false;
        }
        if (sortSelect && sortSelect.value !== sort) {
            sortSelect.value = sort;
        }
        this.setListingView(view);
    }

    getListingToolbarContext(options = {}, count = 0) {
        const parts = [];
        const propertyLabels = { daire: 'Daire', yazlik: 'Yazlık', mustakil: 'Müstakil ev', villa: 'Villa' };
        const vacationLabels = {
            familyResort: 'Aile / her şey dahil',
            luxury: 'Lüks / premium',
            nature: 'Doğa / sakinlik',
            culture: 'Kültür / deneyim'
        };
        if (options.category) parts.push(this.getCategoryLabel(options.category));
        if (options.province) parts.push(options.province + (options.district ? '/' + options.district : ' geneli'));
        if (options.vehicleBrand) parts.push(options.vehicleBrand);
        if (options.propertyType) parts.push(propertyLabels[options.propertyType] || options.propertyType);
        if (options.vacationType) parts.push(vacationLabels[options.vacationType] || options.vacationType);
        if (options.search) parts.push('Arama: ' + options.search);

        if (options.ownedOnly || options.userId) return count ? 'Yayınladığınız seçenekler' : 'Henüz seçenek yayınlamadınız';
        if (!count) return 'Henüz değerlendirilebilir seçenek yok. İlk seçenek eklendiğinde burada görünecek.';
        return parts.length ? parts.join(' · ') : 'Türkiye geneli · karar skoruna göre keşif';
    }

    setListingView(view = 'grid') {
        const normalizedView = view === 'compact' ? 'compact' : 'grid';
        const grid = document.getElementById('listings-grid');
        if (grid) {
            grid.classList.toggle('is-compact', normalizedView === 'compact');
        }

        document.querySelectorAll('[data-listing-view]').forEach((button) => {
            const isActive = button.dataset.listingView === normalizedView;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
    }


    async renderListings(...args) {
        installListingsUI(this.constructor);
        return this.renderListings(...args);
    }

    filterByCategory(categoryId) {
        state.setFilters({ category: categoryId });
        // Trigger listings reload with filter
        document.dispatchEvent(new CustomEvent('filterChanged', {
            detail: { category: categoryId }
        }));
    }

    showListingDetail(listingId) {
        const path = `/ilan/${listingId}`;
        if (window.history?.pushState) {
            window.history.pushState({}, '', path);
            document.dispatchEvent(new CustomEvent('routeChanged', {
                detail: { route: 'listing-detail', params: { id: listingId } }
            }));
            return;
        }
        window.location.href = path;
    }

    renderListingDetailLoading() {
        const section = document.getElementById('listing-detail-content');
        if (!section) return;
        section.innerHTML = `
            <div class="listing-detail-card listing-detail-premium">
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Seçenek detayı hazırlanıyor...</p>
                </div>
            </div>
        `;
    }

    renderListingDetailEmpty(message = 'Seçenek detayı bulunamadı.') {
        const section = document.getElementById('listing-detail-content');
        if (!section) return;

        section.innerHTML = `
            <div class="listing-detail-card listing-detail-premium">
                <div class="empty-state">
                    <i data-lucide="search-x"></i>
                    <h3>Seçenek bulunamadı</h3>
                    <p>${this.escapeHtml(message)}</p>
                    <div class="listing-actions">
                        <a href="/" class="btn btn-outline" data-native-route>Ana sayfaya dön</a>
                        <a href="/secenekler/" class="btn btn-primary" data-native-route>Seçenekleri incele</a>
                    </div>
                </div>
            </div>
        `;

        this.loadIcons();
    }

    async renderListingDetail(listing, favoriteIds = [], decisionProfile = null, comparisonSignatures = [], userDecisionContext = null) {
        const section = document.getElementById('listing-detail-content');
        if (!section) return;

        const { renderListingGalleryHtml, bindListingGallery, bindListingVehicleImageFallbacks } =
            await import('./listing-gallery-ui.js');
        const listingId = this.escapeHtml(listing.id);
        const galleryHtml = renderListingGalleryHtml(listing, (s) => this.escapeHtml(s), (u) => this.safeImageUrl(u));
        const hasExternalSource = hasPublicSourceUrl(listing);
        const externalUrl = hasExternalSource
            ? this.safeExternalUrl(listing.source_url ?? listing.external_url, {
                content: listing.id || 'listing_detail',
                campaign: listing.category || 'marketplace'
            })
            : '';
        const isFavorite = favoriteIds.includes(listing.id.toString());
        const isCompared = (Array.isArray(comparisonSignatures) ? comparisonSignatures : []).map(String).includes(this.getListingComparisonSignature(listing));
        const locationLabel = this.getListingLocationLabel(listing);
        const categoryLabel = this.getCategoryLabel(listing.category || '');
        const profileScore = decisionProfile?.score;
        const aiScoreDisplay = this.resolveListingQualityScoreDisplay(
            listing,
            profileScore !== undefined && profileScore !== null ? profileScore : undefined
        );
        const actionLabel = this.getListingPrimaryActionLabel(listing.category || '');
        section.innerHTML = `
            <div class="listing-detail-card listing-detail-premium">
                <div class="listing-detail-header">
                    <div>
                        <span class="assistant-kicker">${this.escapeHtml(categoryLabel || 'Seçenek')} detay analizi</span>
                        <h2>${this.escapeHtml(listing.title)}</h2>
                        <div class="listing-detail-badges">
                            ${aiScoreDisplay !== null ? `<span title="${this.escapeHtml(AI_SCORE_DISCLAIMER)}" aria-label="Uyum skoru ${this.escapeHtml(aiScoreDisplay)}/100. ${this.escapeHtml(AI_SCORE_DISCLAIMER)}"><i data-lucide="sparkles"></i> Uyum skoru ${this.escapeHtml(aiScoreDisplay)}/100</span>` : ''}
                            <span><i data-lucide="map-pin"></i> ${this.escapeHtml(locationLabel)}</span>
                            <span><i data-lucide="clock-3"></i> ${this.formatDate(listing.created_at)}</span>
                        </div>
                    </div>
                    <p class="listing-price">${this.formatPrice(listing.price)}</p>
                </div>
                <div class="listing-detail-body listing-detail-body-gallery">
                    ${galleryHtml}
                    <div class="listing-detail-info">
                        ${this.getListingInsightsMarkup(listing, aiScoreDisplay ?? undefined)}
                        ${buildListingTrustStripHtml(listing, { escapeHtml: (value) => this.escapeHtml(value) })}
                        <p><strong>Açıklama:</strong></p>
                        <p>${this.escapeHtml(listing.description || 'Açıklama bulunamadı.')}</p>
                        <div class="listing-actions">
                            <button class="btn ${isFavorite ? 'btn-primary' : 'btn-outline'}" data-action="favorite" data-listing-id="${listingId}"><i data-lucide="heart"></i> ${isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}</button>
                            <button class="btn ${isCompared ? 'btn-primary' : 'btn-outline'}" data-action="compare" data-listing-id="${listingId}"><i data-lucide="${isCompared ? 'check' : 'columns-3'}"></i> ${isCompared ? 'Karşılaştırmada' : 'Karşılaştır'}</button>
                            <a href="/karar-asistani/" class="btn btn-outline"><i data-lucide="sparkles"></i> Ön değerlendirmeye başla</a>
                            ${hasExternalSource ? `<a href="${externalUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary"><i data-lucide="external-link"></i> ${this.escapeHtml(actionLabel)}</a>` : ''}
                        </div>
                    </div>
                </div>
                ${this.getListingDetailDecisionMarkup(decisionProfile, listing)}
                <div class="listing-detail-decision-center">${await this.getUserDecisionCenterMarkup(userDecisionContext, listing)}</div>
            </div>
        `;

        bindListingGallery(section);
        bindListingVehicleImageFallbacks(section, listing);
        this.loadIcons();
    }

    async getUserDecisionCenterMarkup(ctx, listing = {}) {
        const { buildUserDecisionCenterHtml, buildUserDecisionCenterEmptyHtml } = await import(
            '../user-decision-center/index.js'
        );
        if (!ctx) {
            return buildUserDecisionCenterEmptyHtml('Bu seçenek için karar analizi henüz hazır değil.');
        }
        return buildUserDecisionCenterHtml({ ...ctx, listing: ctx.listing ?? listing });
    }

    getListingDetailDecisionMarkup(profile, listing = {}) {
        if (!profile) return '';
        const maxValues = {
            price: Math.max(Number(profile.price || 0), 1),
            periodicCost: Math.max(Number(profile.periodicCost || 0), 1),
            monthlyPayment: Math.max(Number(profile.monthlyPayment || 0), 1)
        };
        return '<section class="listing-detail-decision">' +
            '<div class="listing-detail-decision-head">' +
                '<div><span class="assistant-kicker">Karar değerlendirmesi</span><h3>' + this.escapeHtml(profile.riskLevel || 'Karar analizi') + '</h3><p>' + this.escapeHtml(profile.comment || '') + '</p></div>' +
                '<div class="listing-detail-score"><strong>' + this.escapeHtml(profile.score || '-') + '</strong><span>/100</span></div>' +
            '</div>' +
            '<div class="comparison-metrics listing-detail-metrics">' +
                '<div><span>Ana bedel</span><strong>' + this.formatPrice(profile.price || 0) + '</strong></div>' +
                '<div><span>Dönemsel maliyet</span><strong>' + this.formatPrice(profile.periodicCost || 0) + '</strong></div>' +
                '<div><span>Aylık ödeme</span><strong>' + this.formatPrice(profile.monthlyPayment || 0) + '</strong></div>' +
                '<div><span>Toplam geri ödeme</span><strong>' + this.formatPrice(profile.totalPayment || 0) + '</strong></div>' +
            '</div>' +
            this.getCostBreakdownMarkup(profile) +
            this.getComparisonGraphMarkup(profile, maxValues) +
            (profile.tags?.length ? '<div class="comparison-tags">' + profile.tags.map((tag) => '<span>' + this.escapeHtml(tag) + '</span>').join('') + '</div>' : '') +
            this.getListingDetailRowsMarkup(profile.calculationRows) +
            this.getRecommendationActionPlanMarkup(profile.categoryId || listing.category, listing) +
        '</section>';
    }

    getListingDetailRowsMarkup(rows = []) {
        if (!Array.isArray(rows) || !rows.length) return '';
        return '<div class="listing-detail-rows">' + rows.slice(0, 6).map((row) =>
            '<div><span>' + this.escapeHtml(row.label) + '</span><strong>' + this.formatPrice(row.value || 0) + '</strong><small>' + this.escapeHtml(row.note || '') + '</small></div>'
        ).join('') + '</div>';
    }

    renderFavorites(favorites) {
        const container = document.getElementById('favorites-grid');
        if (!container) return;

        if (!favorites.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="heart"></i>
                    <h3>Henüz favori seçenek yok</h3>
                    <p>Karar skoruna göre seçenekleri keşfedin; beğendiklerinizi favorilere ekleyin.</p>
                    <div class="empty-state-actions">
                        <a href="/karar-asistani/" class="btn btn-primary">Ön değerlendirme başlat</a>
                        <a href="/secenekler" class="btn btn-outline" data-native-route>Seçenekleri gör</a>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = favorites.map(listing => {
            const hasExternalSource = hasPublicSourceUrl(listing);
            const externalUrl = hasExternalSource
                ? this.safeExternalUrl(listing.source_url ?? listing.external_url)
                : '';
            return `
            <div class="favorite-card">
                <div class="favorite-card-body">
                    <h4>${this.escapeHtml(listing.title)}</h4>
                    <p>${this.escapeHtml(listing.location || 'Konum belirtilmemiş')}</p>
                    <p class="listing-price">${this.formatPrice(listing.price)}</p>
                    <div class="listing-actions">
                        <button class="btn btn-outline" data-favorite-id="${this.escapeHtml(listing.id)}"><i data-lucide="heart-off"></i> Kaldır</button>
                        <button class="btn btn-outline" data-action="detail" data-listing-id="${this.escapeHtml(listing.id)}"><i data-lucide="eye"></i> Detay</button>
                        <button class="btn btn-outline" data-action="compare" data-listing-id="${this.escapeHtml(listing.id)}"><i data-lucide="columns-3"></i> Karşılaştır</button>
                        ${hasExternalSource ? `<a href="${externalUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary"><i data-lucide="external-link"></i> Seçeneği İncele</a>` : ''}
                    </div>
                </div>
            </div>
        `;
        }).join('');

        this.loadIcons();
    }



    async renderComparison(...args) {
        installComparisonUI(this.constructor);
        return this.renderComparison(...args);
    }

    renderAdminDashboard(decisionAssistant, financeProducts, stats, marketData = {}, sourceHealth = {}) {
        const adminCard = document.querySelector('#admin .admin-card');
        if (!adminCard) return;

        const sources = Array.isArray(marketData.sourceRegistry) ? marketData.sourceRegistry : [];
        const updatedAt = sourceHealth.updatedAt ? new Date(sourceHealth.updatedAt).toLocaleString('tr-TR') : 'Henüz yok';

        adminCard.innerHTML = `
            <div class="admin-dashboard">
                <div class="admin-stat-grid">
                    <div class="admin-stat"><strong>${this.escapeHtml(stats.categories)}</strong><span>Kategori</span></div>
                    <div class="admin-stat"><strong>${this.escapeHtml(stats.questions)}</strong><span>Soru</span></div>
                    <div class="admin-stat"><strong>${this.escapeHtml(stats.options)}</strong><span>Öneri seçeneği</span></div>
                    <div class="admin-stat"><strong>${this.escapeHtml(stats.financeProducts)}</strong><span>Kredi ürünü</span></div>
                    <div class="admin-stat"><strong>${this.escapeHtml(stats.provinces)}</strong><span>İl</span></div>
                    <div class="admin-stat"><strong>${this.escapeHtml(stats.districts)}</strong><span>İlçe</span></div>
                    <div class="admin-stat"><strong>${this.escapeHtml(stats.carModels)}</strong><span>Marka/model</span></div>
                    <div class="admin-stat"><strong>${this.escapeHtml(stats.vacationPlaces)}</strong><span>Tatil yeri</span></div>
                    <div class="admin-stat"><strong>${this.escapeHtml(stats.decisions)}</strong><span>Kaydedilen karar</span></div>
                    <div class="admin-stat"><strong>${this.escapeHtml(stats.dataSources || 0)}</strong><span>Veri kaynağı</span></div>
                </div>
                <section class="admin-data-center">
                    <div class="admin-data-heading">
                        <div>
                            <span class="assistant-kicker">Veri merkezi</span>
                            <h3>Pazaryeri ölçeği için kaynak ve fiyat altyapısı</h3>
                            <p>${this.escapeHtml(marketData.integrations?.note || 'Dış veri kaynakları yönetilebilir hale getirildi.')}</p>
                        </div>
                        <div class="admin-data-actions">
                            <button type="button" class="btn btn-outline" data-admin-market-action="refresh"><i data-lucide="refresh-cw"></i> Yenile</button>
                            <button type="button" class="btn btn-outline" data-admin-market-action="export"><i data-lucide="download"></i> Dışa aktar</button>
                            <button type="button" class="btn btn-primary" data-admin-market-action="reset"><i data-lucide="database"></i> Varsayılanı yükle</button>
                        </div>
                    </div>
                    <div class="admin-panel-meta">
                        <span>${this.escapeHtml(sourceHealth.readySources || 0)} hazır kaynak</span>
                        <span>${this.escapeHtml(sourceHealth.financeSources || 0)} finans kaynağı</span>
                        <span>${sourceHealth.liveProvidersEnabled ? 'Canlı sağlayıcı açık' : 'Canlı sağlayıcı bekliyor'}</span>
                        <span>Güncelleme: ${this.escapeHtml(updatedAt)}</span>
                    </div>
                    <div class="admin-source-grid">
                        ${sources.map((source) => `
                            <a class="admin-source-card" href="${this.safeExternalUrl(source.url)}" target="_blank" rel="noopener noreferrer">
                                <span>${this.escapeHtml(source.category)}</span>
                                <strong>${this.escapeHtml(source.name)}</strong>
                                <small>${this.escapeHtml(source.type)} · ${this.escapeHtml(source.mode)} · ${this.escapeHtml(source.status)}</small>
                            </a>
                        `).join('')}
                    </div>
                </section>
                ${this.getAdminMarketEditorMarkup(financeProducts, marketData)}
                <div class="admin-grid">
                    ${Object.entries(decisionAssistant).map(([categoryId, category]) => `
                        <article class="admin-panel-card">
                            <div class="admin-panel-heading">
                                <i data-lucide="${this.escapeHtml(category.icon)}"></i>
                                <div>
                                    <h3>${this.escapeHtml(category.name)}</h3>
                                    <p>${this.escapeHtml(category.description)}</p>
                                </div>
                            </div>
                            <div class="admin-panel-meta">
                                <span>${this.escapeHtml(category.questions.length)} soru</span>
                                <span>${this.escapeHtml(category.options.length)} öneri</span>
                                <span>${this.escapeHtml((financeProducts[categoryId] || []).length)} kredi ürünü</span>
                            </div>
                            <div class="admin-finance-list">
                                ${(financeProducts[categoryId] || []).map((product) => `
                                    <div>
                                        <strong>${this.escapeHtml(product.bank)}</strong>
                                        <span>%${this.escapeHtml(product.rate)} aylık, ${this.escapeHtml(product.term)} ay, kredi oranı %${this.escapeHtml(Math.round(product.ratio * 100))}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </article>
                    `).join('')}
                </div>
            </div>
        `;

        this.loadIcons();
    }

    getAdminMarketEditorMarkup(financeProducts, marketData = {}) {
        return `
            <form class="admin-editor-form" data-admin-market-form="market-data">
                <div class="admin-editor-head">
                    <div>
                        <span class="assistant-kicker">Yönetilebilir veri</span>
                        <h3>Kredi, maliyet ve kaynak ayarları</h3>
                    </div>
                    <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Değişiklikleri kaydet</button>
                </div>
                ${this.getAdminFinanceEditorMarkup(financeProducts)}
                ${this.getAdminCostEditorMarkup(marketData.costProfiles || {})}
                ${this.getAdminSourceEditorMarkup(marketData.sourceRegistry || [])}
            </form>
        `;
    }

    getAdminFinanceEditorMarkup(financeProducts = {}) {
        return `
            <section class="admin-editor-section">
                <div class="admin-editor-section-head">
                    <h4>Kredi ürünleri</h4>
                    <p>Banka adı, aylık oran, vade ve kullanılacak kredi oranı karar sonucundaki ödeme hesaplarını doğrudan etkiler.</p>
                </div>
                <div class="admin-editor-grid">
                    ${Object.entries(financeProducts).map(([categoryId, products]) => `
                        <div class="admin-editor-card">
                            <h5>${this.escapeHtml(this.getCategoryLabel(categoryId))}</h5>
                            ${(products || []).map((product, index) => `
                                <div class="admin-market-row">
                                    <input type="hidden" name="finance:${this.escapeHtml(categoryId)}:${this.escapeHtml(index)}:id" value="${this.escapeHtml(product.id)}">
                                    <label>Banka
                                        <input name="finance:${this.escapeHtml(categoryId)}:${this.escapeHtml(index)}:bank" value="${this.escapeHtml(product.bank)}" required>
                                    </label>
                                    <label>Tür
                                        <input name="finance:${this.escapeHtml(categoryId)}:${this.escapeHtml(index)}:type" value="${this.escapeHtml(product.type)}" required>
                                    </label>
                                    <label>Aylık oran (%)
                                        <input type="number" step="0.01" min="0" name="finance:${this.escapeHtml(categoryId)}:${this.escapeHtml(index)}:rate" value="${this.escapeHtml(product.rate)}" required>
                                    </label>
                                    <label>Vade (ay)
                                        <input type="number" step="1" min="1" name="finance:${this.escapeHtml(categoryId)}:${this.escapeHtml(index)}:term" value="${this.escapeHtml(product.term)}" required>
                                    </label>
                                    <label>Kredi oranı (0-1)
                                        <input type="number" step="0.01" min="0" max="1" name="finance:${this.escapeHtml(categoryId)}:${this.escapeHtml(index)}:ratio" value="${this.escapeHtml(product.ratio)}" required>
                                    </label>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    getAdminCostEditorMarkup(costProfiles = {}) {
        return `
            <section class="admin-editor-section">
                <div class="admin-editor-section-head">
                    <h4>Maliyet katsayıları</h4>
                    <p>Yakıt, kasko, bakım, emlak ve tatil maliyetleri bu katsayılardan üretilir.</p>
                </div>
                <div class="admin-editor-grid">
                    ${Object.entries(costProfiles).map(([categoryId, profile]) => `
                        <div class="admin-editor-card">
                            <h5>${this.escapeHtml(this.getCategoryLabel(categoryId))}</h5>
                            <div class="admin-cost-grid">
                                ${Object.entries(profile || {}).map(([key, value]) => `
                                    <label>${this.escapeHtml(this.getCostProfileLabel(key))}
                                        <input type="number" step="${this.escapeHtml(this.getMarketNumberStep(key))}" min="0" name="cost:${this.escapeHtml(categoryId)}:${this.escapeHtml(key)}" value="${this.escapeHtml(value)}" required>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    getAdminSourceEditorMarkup(sources = []) {
        return `
            <section class="admin-editor-section">
                <div class="admin-editor-section-head">
                    <h4>Kaynak kayıtları</h4>
                    <p>Dış kaynak adı, URL ve durum bilgisi admin tarafından yönetilir. Canlı API bağlandığında bu kayıtlar sağlayıcı ayarlarına dönüşecek.</p>
                </div>
                <div class="admin-source-editor-grid">
                    ${sources.map((source, index) => `
                        <div class="admin-editor-card">
                            <div class="admin-source-editor-head">
                                <strong>${this.escapeHtml(source.name)}</strong>
                                <span>${this.escapeHtml(source.category)}</span>
                            </div>
                            <input type="hidden" name="source:${this.escapeHtml(index)}:id" value="${this.escapeHtml(source.id)}">
                            <input type="hidden" name="source:${this.escapeHtml(index)}:category" value="${this.escapeHtml(source.category)}">
                            <input type="hidden" name="source:${this.escapeHtml(index)}:type" value="${this.escapeHtml(source.type)}">
                            <input type="hidden" name="source:${this.escapeHtml(index)}:mode" value="${this.escapeHtml(source.mode)}">
                            <input type="hidden" name="source:${this.escapeHtml(index)}:cadence" value="${this.escapeHtml(source.cadence)}">
                            <label>Kaynak adı
                                <input name="source:${this.escapeHtml(index)}:name" value="${this.escapeHtml(source.name)}" required>
                            </label>
                            <label>URL
                                <input type="url" name="source:${this.escapeHtml(index)}:url" value="${this.escapeHtml(source.url)}" required>
                            </label>
                            <label>Durum
                                <select name="source:${this.escapeHtml(index)}:status">
                                    <option value="ready" ${source.status === 'ready' ? 'selected' : ''}>Hazır</option>
                                    <option value="pending" ${source.status === 'pending' ? 'selected' : ''}>Bekliyor</option>
                                    <option value="disabled" ${source.status === 'disabled' ? 'selected' : ''}>Kapalı</option>
                                </select>
                            </label>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    getCategoryLabel(categoryId) {
        const labels = {
            arac: 'Araç',
            ev: 'Ev',
            tatil: 'Tatil',
            finansman: 'Finansman',
            sigorta: 'Sigorta',
            kasko: 'Kasko'
        };

        return labels[categoryId] || categoryId;
    }

    getMarketNumberStep(key) {
        if (/Rate|Ratio/i.test(key)) return '0.0001';
        if (/Multiplier/i.test(key)) return '0.01';
        return '1000';
    }

    getCostProfileLabel(key) {
        const labels = {
            basePrice: 'Baz araç fiyatı',
            modelStep: 'Model fiyat adımı',
            premiumPriceExtra: 'Premium fiyat ek katsayısı',
            electricPriceExtra: 'Elektrikli fiyat ek katsayısı',
            suvPriceExtra: 'SUV fiyat ek katsayısı',
            electricEnergyCost: 'Elektrik enerji/yıl',
            hybridFuelCost: 'Hibrit yakıt/yıl',
            dieselFuelCost: 'Dizel yakıt/yıl',
            gasolineFuelCost: 'Benzin yakıt/yıl',
            insuranceStandardRate: 'Standart kasko oranı',
            insurancePremiumRate: 'Premium kasko oranı',
            trafficInsuranceBase: 'Trafik sigortası baz',
            trafficInsurancePremiumExtra: 'Premium trafik ek',
            maintenanceElectric: 'Elektrikli bakım',
            maintenanceStandard: 'Standart bakım',
            maintenancePremium: 'Premium bakım',
            metroBasePrice: 'Büyükşehir baz fiyat',
            standardBasePrice: 'Standart il baz fiyat',
            yazlikMultiplier: 'Yazlık çarpanı',
            mustakilMultiplier: 'Müstakil çarpanı',
            villaMultiplier: 'Villa çarpanı',
            indexStep: 'Alternatif fiyat adımı',
            apartmentDues: 'Daire aidat/yıl',
            detachedMaintenance: 'Müstakil bakım/yıl',
            villaMaintenance: 'Villa bakım/yıl',
            insuranceRate: 'Konut sigorta oranı',
            propertyTaxRate: 'Emlak vergisi oranı',
            apartmentRenewal: 'Daire yenileme payı',
            houseRenewal: 'Ev/villa yenileme payı',
            familyBasePrice: 'Aile tatili baz',
            luxuryBasePrice: 'Lüks tatil baz',
            natureBasePrice: 'Doğa tatili baz',
            cultureBasePrice: 'Kültür tatili baz',
            placeStep: 'Tatil yeri fiyat adımı',
            accommodationRatio: 'Konaklama oranı',
            transportRatio: 'Ulaşım oranı',
            activityRatio: 'Aktivite oranı',
            insuranceRatio: 'Seyahat sigortası oranı'
        };

        return labels[key] || key;
    }

    renderQuiz(questions) {
        const container = document.getElementById('quiz-content');
        if (!container) return;

        if (!questions.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="help-circle"></i>
                    <h3>Henüz soru yok</h3>
                    <p>Quiz soruları eklendiğinde burada görünecek.</p>
                </div>
            `;
            this.loadIcons();
            return;
        }

        container.innerHTML = questions.map((question) => {
            const options = this.normalizeQuizOptions(question.options);
            return `
                <article class="quiz-question" data-question-id="${this.escapeHtml(question.id)}">
                    <div class="quiz-question-header">
                        <span>${this.escapeHtml(question.category || 'Genel')}</span>
                        <strong>${this.escapeHtml(question.difficulty || 'medium')}</strong>
                    </div>
                    <h3>${this.escapeHtml(question.question)}</h3>
                    <div class="quiz-options">
                        ${options.map((option, index) => `
                            <button type="button" class="quiz-option" data-question-id="${this.escapeHtml(question.id)}" data-quiz-answer="${index}">
                                ${this.escapeHtml(option)}
                            </button>
                        `).join('')}
                    </div>
                </article>
            `;
        }).join('');
    }

    markQuizAnswer(questionId, answer, isCorrect) {
        const question = document.querySelector(`[data-question-id="${CSS.escape(questionId)}"]`);
        if (!question) return;

        question.querySelectorAll('.quiz-option').forEach((button) => {
            button.disabled = true;
            if (Number(button.dataset.quizAnswer) === Number(answer)) {
                button.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
            }
        });
    }

    normalizeQuizOptions(options) {
        if (Array.isArray(options)) return options;

        if (typeof options === 'string') {
            try {
                const parsed = JSON.parse(options);
                return Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                return [];
            }
        }

        return [];
    }

    showLoading(container) {
        const element = document.querySelector(container);
        if (!element) return;

        element.setAttribute('aria-busy', 'true');

        if (container === '#listings-grid' || element.id === 'listings-grid') {
            element.innerHTML = renderListingSkeletonGrid(6);
            return;
        }

        element.innerHTML = `<div class="loading ib-loading-legacy">${renderInlineSkeletonPanel(4)}</div>`;
    }

    hideLoading(container) {
        const element = typeof container === 'string' ? document.querySelector(container) : container;
        element?.removeAttribute('aria-busy');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', type === 'error' ? 'alert' : 'status');
        notification.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

        const messageText = document.createElement('span');
        messageText.textContent = message;

        const closeButton = document.createElement('button');
        closeButton.className = 'notification-close';
        closeButton.type = 'button';
        closeButton.setAttribute('aria-label', 'Bildirimi kapat');
        closeButton.innerHTML = '&times;';

        notification.append(messageText, closeButton);
        document.body.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);

        // Manual close
        closeButton.addEventListener('click', () => {
            notification.remove();
        });
    }

    closeAllModals() {
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.classList.remove('show');
        });
        state.setModal(null);
    }

    showHelpModal() {
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Kısayollar</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="shortcuts">
                        <div class="shortcut">
                            <kbd>Ctrl+K</kbd>
                            <span>Arama kutusuna odaklan</span>
                        </div>
                        <div class="shortcut">
                            <kbd>Ctrl+/</kbd>
                            <span>Yardım menüsünü aç</span>
                        </div>
                        <div class="shortcut">
                            <kbd>Esc</kbd>
                            <span>Açık modal pencereyi kapat</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Utility functions
    escapeHtml(text) {
        return escapeHtmlValue(text);
    }

    safeImageUrl(url) {
        return sanitizeImageUrl(url);
    }

    safeExternalUrl(url, tracking = {}) {
        return revenueManager.buildAffiliateUrl(safeUrl(url), tracking);
    }

    formatPrice(price) {
        return formatMoney(price);
    }

    formatNumberPlain(value) {
        return formatNumber(value);
    }

    formatDate(dateString) {
        return formatRelativeTime(dateString);
    }

    // Scroll to element
    scrollToElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Update page title
    setPageTitle(title) {
        document.title = title;
    }

    showMessaging(_userId) {
        const modal = document.getElementById('messaging-modal') || this.createMessagingModal();
        modal.classList.add('show');
        state.setModal('messaging');
    }

    createMessagingModal() {
        const modal = document.createElement('div');
        modal.id = 'messaging-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Mesajlar</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="messages-list" class="messages-list"></div>
                    <form id="message-form" class="message-form">
                        <input type="text" name="content" placeholder="Mesajınızı yazın..." required>
                        <button type="submit" class="btn btn-primary">Gönder</button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.classList.remove('show');
            state.setModal(null);
        });
        return modal;
    }

    renderMessages(messages, currentUserId) {
        const list = document.getElementById('messages-list');
        if (!list) return;
        if (!messages.length) {
            list.innerHTML = `
                <div class="empty-state messages-empty-state">
                    <i data-lucide="message-square"></i>
                    <h3>Henüz mesaj yok</h3>
                    <p>Karar süreci ve seçenek inceleme mesajlarınız burada görünür.</p>
                </div>
            `;
            this.loadIcons?.();
            return;
        }
        list.innerHTML = messages.map(msg => `
            <div class="message ${msg.sender_id === currentUserId ? 'sent' : 'received'}">
                <div class="message-content">${this.escapeHtmlValue(msg.content)}</div>
                <div class="message-time">${new Date(msg.created_at).toLocaleTimeString()}</div>
            </div>
        `).join('');
        list.scrollTop = list.scrollHeight;
    }
}

installAssistantUI(UIManager);
installListingsUI(UIManager);
installComparisonUI(UIManager);

export default UIManager;
