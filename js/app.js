// isteBul v2 - Main Application
import './runtime/locale-bootstrap.js';
import { completeOAuthIfPresent } from './runtime/auth-oauth-callback.js';
import {
  captureAuthReturnFromUrl,
  handleAuthRouteEntry
} from './runtime/auth-return.js';
import { initDecisionSurfaceBanners } from './runtime/decision-surface-banners.js';
import { stripLocalePrefix } from './platform/locale-registry.js';
import './features/auth/auth-click-bindings.js';
import './runtime/growth-bootstrap.js';
import { trackPricingView, getGrowthContext } from './features/growth/growth-engine.js';
import { trackCheckoutComplete, trackCheckoutStart } from './features/growth/growth-funnel.js';
import { trackPaidFunnelStep } from './features/growth/paid-acquisition.js';
import { sendServerPaidConversion } from './features/growth/paid-capi-bridge.js';
import {
    enrollCheckoutAbandonRecovery,
    enrollNewsletterWelcome
} from './features/lifecycle/lifecycle-client.js';
import { trackPricingViewForUpgrade } from './features/revenue/revenue-ops-client.js';
import { mountHelpCenterWidget } from './ui/help-center-widget.js';
import {
    bindContextualUpsell,
    flushUpsellConversion,
    openUpsellCheckout,
    renderContextualUpsellCard,
    shouldShowUpsell,
    trackUpsellClick
} from './features/monetization/upsell-engine.js';
import { initHomeCategories } from './runtime/home-categories.js';
import { initPricingCardsMotion } from './runtime/pricing-cards-motion.js';
import { CONVERSION_COPY } from './core/conversion-copy.js';
import { revenueManager } from './features/monetization/revenue-manager.js';
import { renderHomePricingTeaser } from './features/monetization/pricing-home-teaser.js';
import { renderTrustLayerCompact } from './features/moat/decision-insight-panels.js';
import { AuthManager } from './features/auth/auth.js';
import { UIManager } from './ui/ui.js';
import { Router } from './core/router.js';
import { state } from './core/state.js';
import { supabase } from './core/supabase.js';
import API from './core/api.js';
import { monitoring } from './core/monitoring.js';
import { trackOpsEvent } from './core/operational-telemetry.js';
import { analytics } from './core/analytics.js';
import { canCallAiNarration, hasAiNarrationBudget } from './core/scale-limits.js';
import { errorBoundary } from './core/error-boundary.js';
import { wireAutoListingFilters } from './features/listings/auto-listing-filters.js';
import { ListingManager } from './features/ilan/ilan.js';
import { ProfileManager } from './features/profil/profil.js';
import AccountManager from './features/account/account.js';
import {
    mapBillingPortalError,
    setBillingPortalButtonsLoading
} from './core/billing-portal.js';
import './features/i18n/i18n.js';
import { formatMoney } from './core/format.js';
import {
    resolveRouteSurface,
    syncHtmlRouteSurface,
    tryExternalRouteRedirect
} from './runtime/route-surface.js';

window.lucide = window.lucide || {
    createIcons() {},
    icons: {}
};

import {
    PROPERTY_TYPES,
    VACATION_PLACES,
    flattenCarModels,
    getCarModelOptions,
    getDistrictOptions,
    getProvinceOptions,
    getVacationPlaceOptions
} from './data/catalog.js';
import {
    getCostProfileForCategory,
    getFinanceProductsForCategory,
    getMarketData,
    getMarketStats,
    getSourceHealth,
    resetMarketData,
    saveMarketData
} from './data/market-data.js';
import { estimateListingPeriodicCost } from './engines/cost-engine.js';
import { STORAGE_KEYS, readStorageRaw, writeStorageRaw } from './core/storage-keys.js';
import {
    buildCheckoutTriggerEvent,
    clearCheckoutIntent,
    mapCheckoutApiError,
    peekCheckoutIntent,
    storeCheckoutIntentPayload
} from './core/checkout-intent.js';

class App {
    constructor() {
        this.auth = new AuthManager();
        this.ui = new UIManager();
        this.router = new Router();
        /** @deprecated ListingManager not wired — listings live in App methods until extracted. */
        this.ilan = new ListingManager(this.ui, this.router);
        /** @deprecated ProfileManager not wired — profile UI via App + UIManager. */
        this.profil = new ProfileManager(this.ui);
        this.account = new AccountManager(this.ui, this.auth);
        this.messagingModule = null;
        this._billingPortalInFlight = false;
        this.currentUser = null;
        this.currentListings = [];
        this.currentDetailListing = null;
        this.lastListingOptions = {};
        this.listingSort = 'aiScore';
        this.listingView = 'grid';
        this.categories = [];
        this.activeCategory = null;
        this.quizQuestions = [];
        this.favorites = [];
        this.comparisonItems = [];
        this.comingSoonCategories = [];
        this.decisionHistory = [];
        this.localListings = [];
        this.previewCategory = 'arac';
        this.catalog = this.createDecisionCatalog();
        this.marketData = this.createMarketData();
        this.decisionAssistant = this.createDecisionAssistantConfig();
        this.assistantCategory = 'arac';
        this.assistantAnswers = {};
        this.assistantStep = 0;
        this.lastDecisionResult = null;
        this._sessionBootstrapDone = false;
    }

    async init() {
        try {
            const { initEnterpriseUx } = await import('./runtime/enterprise-ux.js');
            initEnterpriseUx();
            initHomeCategories();

            const deferNonCritical = (work, timeout = 1200) => {
                if ('requestIdleCallback' in window) {
                    requestIdleCallback(work, { timeout });
                    return;
                }
                setTimeout(work, 220);
            };

            deferNonCritical(() => {
                mountHelpCenterWidget({
                    getUserContext: () => ({
                        email: this.currentUser?.email,
                        user_id: this.currentUser?.id
                    })
                });
            });

            // Keep initial route paint responsive; monitor/error handlers can initialize shortly after.
            deferNonCritical(() => monitoring.init());
            deferNonCritical(() => errorBoundary.init());

            // Initialize UI
            this.ui.init();

            // Register service worker for PWA
            this.registerServiceWorker();

            // Setup event listeners before routing so initial route changes are handled
            this.setupEventListeners();

            // Initialize router
            this.router.init();
            initDecisionSurfaceBanners();

            this.setupCookieConsent();
            this.renderHeroDecisionPreview();
            const trustMount = document.getElementById('home-trust-layer-mount');
            if (trustMount && resolveRouteSurface(window.location.pathname) !== 'home') {
                trustMount.innerHTML = renderTrustLayerCompact('home');
                this.ui.loadIcons?.();
            }
            this.renderPricingSection();

            document.addEventListener('ib:locale-changed', () => {
                this.renderPricingSection();
            });

            document.addEventListener('routeChanged', (event) => {
                if (readStorageRaw(STORAGE_KEYS.COOKIE_CONSENT) !== 'accepted') return;
                analytics.track('route_change', {
                    route: event.detail?.route,
                    path: event.detail?.path
                }, {
                    category: 'page',
                    funnel: 'site',
                    funnel_step: event.detail?.route || 'unknown',
                    page_path: event.detail?.path
                });
                analytics.trackPageView(event.detail?.path || analytics.getPagePath());
                void this.handlePremiumRoute(event.detail?.route);
            });

            await this.checkAuth();
            captureAuthReturnFromUrl();
            this.handleBillingReturnParams();
            this.handleCheckoutDeepLink();
            this.checkForNewDeployment();

            if (this.currentUser) {
                await revenueManager.refresh(this.currentUser.id);
                this.initMessaging(this.currentUser.id);
            }

            const deferHeavyWork = () => {
                const surface = resolveRouteSurface(window.location.pathname);
                const appSurfaces = new Set([
                    'ilanlar',
                    'listing-detail',
                    'compare',
                    'favoriler',
                    'history',
                    'quiz',
                    'profil',
                    'messages',
                    'add-listing'
                ]);

                if (!appSurfaces.has(surface)) {
                    return;
                }

                this.loadListings().catch((error) => {
                    console.error('Failed to load listings:', error);
                });

                Promise.allSettled([
                    this.loadCategories(),
                    this.loadFavorites()
                ]);

                this.loadComparisonItems();
                try {
                    this.loadDecisionHistory();
                } catch (error) {
                    console.warn('Deferred loadDecisionHistory failed:', error);
                }
                this.loadComparisonHistory();
                try {
                    this.renderDecisionAssistant();
                } catch (error) {
                    console.warn('Deferred renderDecisionAssistant failed:', error);
                }
            };

            if ('requestIdleCallback' in window) {
                requestIdleCallback(deferHeavyWork, { timeout: 800 });
            } else {
                setTimeout(deferHeavyWork, 200);
            }

        } catch (error) {
            console.error('Failed to initialize app:', error);
            window.__initError = error;
            throw error;
        }
    }

    async initMessaging(userId) {
        if (!userId || this.messagingModule) {
            return;
        }

        try {
            const { messaging } = await import('./features/messaging.js');
            this.messagingModule = messaging;

            messaging.subscribeToMessages(userId, (msg) => {
                this.ui.showNotification(`Yeni mesaj: ${msg.content.substring(0, 30)}...`);
                if (state.getModal() === 'messaging') {
                    messaging.loadMessages(userId).then((msgs) => {
                        this.ui.renderMessages(msgs, userId);
                    });
                }
            });
        } catch (error) {
            console.error('Messaging init failed:', error);
        }
    }

    registerServiceWorker() {
        const enableServiceWorker = window.ISTEBU_ENABLE_SW === true;

        if (!enableServiceWorker) {
            this.setupInstallPrompt();
            return;
        }

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    // Handle updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    this.showUpdateNotification();
                                }
                            });
                        }
                    });

                    // Setup install prompt
                    this.setupInstallPrompt();
                })
                .catch(() => undefined);
        }
    }

    setupInstallPrompt() {
        let deferredPrompt;

        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later
            deferredPrompt = e;

            // Show install button
            this.showInstallButton(deferredPrompt);
        });

        // Listen for successful installation
        window.addEventListener('appinstalled', (_evt) => {
            // Hide install button
            this.hideInstallButton();
        });
    }

    showInstallButton(deferredPrompt) {
        // Remove existing install button
        this.hideInstallButton();

        // Create install button
        const installBtn = document.createElement('button');
        installBtn.id = 'pwa-install-btn';
        installBtn.className = 'pwa-install-btn';
        installBtn.innerHTML = `
            <i data-lucide="download"></i>
            <span>Uygulamayı Yükle</span>
        `;
        installBtn.onclick = async () => {
            // Hide the button
            installBtn.style.display = 'none';

            // Show the install prompt
            deferredPrompt.prompt();

            // Wait for the user to respond to the prompt
            await deferredPrompt.userChoice;

            // Reset the deferred prompt
            deferredPrompt = null;

        };

        // Add to header
        const header = document.querySelector('.header');
        if (header) {
            header.appendChild(installBtn);
        }

        // Load icons
        if (typeof lucide !== 'undefined') {
            window.lucide?.createIcons();
        }
    }

    hideInstallButton() {
        const existingBtn = document.getElementById('pwa-install-btn');
        if (existingBtn) {
            existingBtn.remove();
        }
    }

    showUpdateNotification() {
        // Create update notification
        const updateDiv = document.createElement('div');
        updateDiv.className = 'update-notification';
        updateDiv.innerHTML = `
            <div class="update-content">
                <i data-lucide="refresh-cw"></i>
                <div class="update-text">
                    <strong>Yeni sürüm mevcut!</strong>
                    <span>Uygulamayı güncellemek için sayfayı yenileyin.</span>
                </div>
                <button type="button" data-action="reload-page" class="btn btn-primary btn-sm">
                    Güncelle
                </button>
                <button type="button" data-action="dismiss-parent-card" class="btn-close">
                    <i data-lucide="x"></i>
                </button>
            </div>
        `;

        document.body.appendChild(updateDiv);

        // Load icons
        if (typeof lucide !== 'undefined') {
            window.lucide?.createIcons();
        }

        // Auto remove after 30 seconds
        setTimeout(() => {
            if (updateDiv.parentNode) {
                updateDiv.remove();
            }
        }, 30000);
    }

    setupCookieConsent() {
        const banner = document.getElementById('cookie-consent');
        if (!banner) return;

        const preference = readStorageRaw(STORAGE_KEYS.COOKIE_CONSENT);
        if (preference) {
            if (preference === 'accepted') {
                this.loadAnalytics();
                monitoring.init(true);
            }
            banner.hidden = true;
            return;
        }

        const savePreference = (value) => {
            writeStorageRaw(STORAGE_KEYS.COOKIE_CONSENT, value);
            if (value === 'accepted') {
                this.loadAnalytics();
                analytics.init();
                monitoring.init(true);
                document.dispatchEvent(new CustomEvent('cookieConsentAccepted'));
            }
            banner.hidden = true;
        };

        if (readStorageRaw(STORAGE_KEYS.COOKIE_CONSENT) === 'accepted') {
            analytics.init();
        }

        banner.querySelector('[data-cookie-accept]')?.addEventListener('click', () => savePreference('accepted'));
        banner.querySelector('[data-cookie-decline]')?.addEventListener('click', () => savePreference('declined'));
    }

    loadAnalytics() {
        if (document.querySelector('script[data-analytics-provider="plausible"]')) return;

        const script = document.createElement('script');
        script.async = true;
        script.defer = true;
        script.dataset.analyticsProvider = 'plausible';
        script.dataset.domain = 'istebul.com';
        script.src = 'https://plausible.io/js/plausible.js';
        document.head.appendChild(script);
    }

    async checkAuth() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                this.currentUser = user;
                state.setUser(user);
                this.ui.updateAuthUI(user);
                await this.loadUserProfile(user.id);
                await revenueManager.refresh(user.id);
                await this.initMessaging(user.id);
            } else {
                await revenueManager.refresh(null);
                this.currentUser = null;
                this.ui.updateAuthUI(null);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    }

    async loadUserProfile(userId) {
        try {
            const profile = await API.getProfile(userId);

            if (profile) {
                this.currentUser.profile = profile;
                this.ui.updateUserUI(profile);
                await this.account?.refresh?.(this.currentUser);
                
                // Set user in monitoring
                monitoring.setUser({
                    id: userId,
                    email: this.currentUser.email,
                    full_name: profile.full_name
                });

                // Check if user is admin
                if (profile.role === 'admin') {
                    this.ui.showAdminLink(this.currentUser || this.user || profile);
                }
            }
        } catch (error) {
            console.error('Failed to load user profile:', error);
            monitoring.captureException(error, { context: 'loadUserProfile' });
        }
    }

    async loadCategories() {
        const supportedCategoryIds = ['arac'];
        const fallbackCategories = [
            { id: 'arac', name: 'Araç', icon: 'car', count: 0 }
        ];
        this.comingSoonCategories = [
            { id: 'ev', name: 'Konut', icon: 'home', comingSoon: true }
        ];

        try {
            const categories = await API.getCategories();
            const counts = {};
            const normalizedCategories = (categories || [])
                .filter((category) => category.active !== false)
                .map((category) => {
                    const id = category.slug || category.id;
                    return {
                        id,
                        name: category.name,
                        icon: category.icon || 'tag',
                        count: counts[id] || 0
                    };
                })
                .filter((category) => supportedCategoryIds.includes(category.id));

            this.categories = normalizedCategories.length ? normalizedCategories : fallbackCategories;
        } catch (error) {
            this.categories = fallbackCategories;
        }

        this.renderCategorySurfaces();
    }

    renderCategorySurfaces() {
        try {
            const displayCategories = [
                ...this.categories,
                ...(this.comingSoonCategories || [])
            ];
            this.ui.renderCategories?.(displayCategories, this.activeCategory);
            this.ui.renderHeroCategories?.(this.categories, this.activeCategory);
            this.ui.renderCategoryMenu?.(this.categories, this.activeCategory);
            this.ui.renderCategorySelect?.(this.categories);
            this.ui.setActiveCategory?.(this.activeCategory, this.categories);
        } catch (error) {
            console.warn('renderCategorySurfaces failed:', error);
        }
    }

    async handleCategorySelect(category) {
        if (!category || !this.categories.some((item) => item.id === category)) {
            return;
        }

        this.activeCategory = category;
        this.renderCategorySurfaces();
        this.router.navigate('/ilanlar');
        await this.loadListings({ category });
    }

    async clearCategoryFilter() {
        this.activeCategory = null;
        this.renderCategorySurfaces();
        this.router.navigate('/ilanlar');
        await this.loadListings();
    }

    async showMyListings() {
        if (!this.currentUser) {
            this.auth.showLoginModal();
            this.ui.showError('Kendi ilanlarınızı görmek için giriş yapın.');
            return;
        }

        this.activeCategory = null;
        this.renderCategorySurfaces();
        this.router.navigate('/ilanlar');
        await this.loadListings({ userId: this.currentUser.id, ownedOnly: true, limit: 20 });
        this.ui.showSuccess('Size ait ilanlar gösteriliyor.');
    }

    async loadListings(options = {}) {
        this.lastListingOptions = { ...options };
        try {
            this.ui.showLoading('#listings-grid');

            const listings = await API.getListings(options);
            const localListings = this.getLocalListings(options);
            this.currentListings = this.sortListings(this.mergeListings(localListings, listings || []));
            this.renderCurrentListings();
            this.renderListingFilterSummary(options);

            if (!this.currentListings.length && !options.userId && !options.ownedOnly) {
                this.ui.showInfo?.('Şu an canlı ilan bulunmuyor. Size uygun araç profili için karar asistanını kullanabilirsiniz.');
            }
        } catch (error) {
            console.error('Failed to load listings:', error);
            const localListings = this.getLocalListings(options);
            this.currentListings = this.sortListings(this.mergeListings(localListings));
            this.renderCurrentListings();
            this.renderListingFilterSummary(options);
            this.ui.showError('Canlı ilanlara şu anda ulaşılamadı. Lütfen kısa süre sonra tekrar deneyin.');
        } finally {
            this.ui.hideLoading('#listings-grid');
        }
    }

    mergeListings(...groups) {
        const seen = new Set();
        return groups.flat().filter((listing) => {
            if (!listing?.id) return false;
            const id = listing.id.toString();
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    }

    filterListingCollection(listings = [], options = {}) {
        const search = options.search?.toString().trim().toLocaleLowerCase('tr-TR');
        const location = options.location?.toString().trim().toLocaleLowerCase('tr-TR');
        const province = options.province?.toString().trim().toLocaleLowerCase('tr-TR');
        const district = options.district?.toString().trim().toLocaleLowerCase('tr-TR');
        const vehicleBrand = options.vehicleBrand?.toString().trim().toLocaleLowerCase('tr-TR');
        const propertyType = options.propertyType?.toString().trim().toLocaleLowerCase('tr-TR');
        const vacationType = options.vacationType?.toString().trim().toLocaleLowerCase('tr-TR');
        const minPrice = Number(options.minPrice || options.min_price);
        const maxPrice = Number(options.maxPrice || options.max_price);
        return listings
            .filter((listing) => !options.category || listing.category === options.category)
            .filter((listing) => !Number.isFinite(minPrice) || minPrice <= 0 || Number(listing.price) >= minPrice)
            .filter((listing) => !Number.isFinite(maxPrice) || maxPrice <= 0 || Number(listing.price) <= maxPrice)
            .filter((listing) => !province || listing.province?.toLocaleLowerCase('tr-TR') === province)
            .filter((listing) => !district || listing.district?.toLocaleLowerCase('tr-TR') === district)
            .filter((listing) => !location || [listing.location, listing.province, listing.district].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR').includes(location.replace('/', ' ')))
            .filter((listing) => !vehicleBrand || listing.vehicleBrand?.toLocaleLowerCase('tr-TR') === vehicleBrand)
            .filter((listing) => !propertyType || listing.propertyType?.toLocaleLowerCase('tr-TR') === propertyType)
            .filter((listing) => !vacationType || listing.vacationType?.toLocaleLowerCase('tr-TR') === vacationType)
            .filter((listing) => {
                if (!search) return true;
                return [listing.title, listing.description, listing.location, listing.category, listing.vehicleBrand, listing.propertyType, listing.vacationType, ...(listing.decisionHighlights || [])]
                    .filter(Boolean)
                    .join(' ')
                    .toLocaleLowerCase('tr-TR')
                    .includes(search);
            })
            .slice(options.offset || 0, (options.offset || 0) + (options.limit || 12));
    }

    getLocalListingsStorageKey() {
        return this.currentUser?.id ? `${STORAGE_KEYS.LOCAL_LISTINGS_PREFIX}${this.currentUser.id}` : null;
    }

    getLocalListings(options = {}) {
        const storageKey = this.getLocalListingsStorageKey();
        if (!storageKey) return [];
        this.localListings = this.readStoredArray(storageKey);
        return this.filterListingCollection(this.localListings, options);
    }

    saveLocalListings(listings = this.localListings) {
        const storageKey = this.getLocalListingsStorageKey();
        if (!storageKey) return false;
        this.localListings = Array.isArray(listings) ? listings : [];
        return this.writeStoredValue(storageKey, this.localListings);
    }

    createLocalListing(listingData = {}) {
        const now = new Date().toISOString();
        const localListing = {
            ...listingData,
            id: 'local-' + Date.now(),
            status: 'active',
            created_at: now,
            updated_at: now,
            user_id: this.currentUser?.id || 'local-user',
            profiles: {
                full_name: this.currentUser?.profile?.full_name || this.currentUser?.email || 'Yerel kullanıcı',
                avatar_url: this.currentUser?.profile?.avatar_url || ''
            },
            source: 'local-fallback'
        };
        const existing = this.getLocalListings({ limit: 1000 });
        this.saveLocalListings([localListing, ...existing].slice(0, 50));
        return localListing;
    }

    getLocalListingById(listingId) {
        const storageKey = this.getLocalListingsStorageKey();
        if (!storageKey) return null;
        return this.readStoredArray(storageKey).find((listing) => listing.id?.toString() === listingId?.toString()) || null;
    }

    getListingFallbackById(listingId) {
        return this.getLocalListingById(listingId);
    }


    getDemoListings(options = {}) {
        const listings = [
            {
                id: 'demo-arac-1',
                title: 'Bütçeye Uygun Hibrit Aile Aracı Flame X-Pack',
                description: 'Düşük yakıt tüketimi, güçlü ikinci el değeri ve dengeli kasko maliyetiyle karar asistanı için örnek Toyota hibrit araç.',
                price: 1650000,
                currency: 'TRY',
                category: 'arac',
                location: 'İstanbul/Kadıköy',
                province: 'İstanbul',
                district: 'Kadıköy',
                vehicleBrand: 'Toyota',
                vehicleFuel: 'Hibrit',
                decisionHighlights: ['Hibrit', 'Düşük yakıt', 'Kredi uygun'],
                images: ['assets/images/demo/toyota-corolla-cross.svg'],
                external_url: 'https://www.sahibinden.com/otomobil',
                created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
                status: 'active'
            },
            {
                id: 'demo-arac-2',
                title: '2024 MG4 Electric Comfort',
                description: 'Kısa mesafe kullananlar için düşük enerji ve bakım gideriyle örnek elektrikli araç.',
                price: 1350000,
                currency: 'TRY',
                category: 'arac',
                location: 'Ankara/Çankaya',
                province: 'Ankara',
                district: 'Çankaya',
                vehicleBrand: 'Renault',
                vehicleFuel: 'Elektrikli',
                decisionHighlights: ['Elektrikli', 'Düşük bakım', 'Şehir içi'],
                images: ['assets/images/demo/mg4-electric.svg'],
                external_url: 'https://www.sahibinden.com/elektrikli-arabalar',
                created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
                status: 'active'
            },
            {
                id: 'demo-ev-1',
                title: 'Lokasyon ve Kredi Dengeli 2+1 Daire',
                description: 'Ulaşımı güçlü lokasyonda, aidat ve bakım yükü düşük örnek daire seçeneği.',
                price: 3200000,
                currency: 'TRY',
                category: 'ev',
                location: 'İstanbul/Kadıköy',
                province: 'İstanbul',
                district: 'Kadıköy',
                propertyType: 'daire',
                decisionHighlights: ['Daire', 'Düşük aidat', 'Yatırım'],
                images: ['assets/images/demo/kadikoy-daire.svg'],
                external_url: 'https://www.sahibinden.com/satilik-daire',
                created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
                status: 'active'
            },
            {
                id: 'demo-ev-2',
                title: 'İzmir Urla Güvenlikli 4+1 Villa',
                description: 'Villa tercih edenler için aidat, sigorta, bakım ve kredi yükünü değerlendiren örnek ilan.',
                price: 18500000,
                currency: 'TRY',
                category: 'ev',
                location: 'Muğla/Bodrum',
                province: 'Muğla',
                district: 'Bodrum',
                propertyType: 'villa',
                decisionHighlights: ['Villa', 'Konfor', 'Yüksek bakım'],
                images: ['assets/images/demo/urla-villa.svg'],
                external_url: 'https://www.sahibinden.com/satilik-villa',
                created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
                status: 'active'
            },
            {
                id: 'demo-tatil-1',
                title: 'Aile İçin Toplam Bütçesi Hesaplanan Tatil',
                description: 'Konaklama, transfer, ulaşım ve sigorta dahil toplam maliyetle örnek aile tatili.',
                price: 98000,
                currency: 'TRY',
                category: 'tatil',
                location: 'Antalya/Lara',
                province: 'Antalya',
                district: 'Lara',
                vacationType: 'familyResort',
                decisionHighlights: ['Aile', 'Her şey dahil', 'Transfer'],
                images: ['assets/images/demo/lara-resort.svg'],
                external_url: 'https://www.etstur.com/',
                created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
                status: 'active'
            },
            {
                id: 'demo-tatil-2',
                title: 'Karadeniz Yayla & Doğa Deneyimi',
                description: 'Konaklama, araç ve aktivite bütçesi dengeli, sakinlik isteyenlere uygun örnek rota.',
                price: 54000,
                currency: 'TRY',
                category: 'tatil',
                location: 'Rize/Çamlıhemşin',
                province: 'Rize',
                district: 'Çamlıhemşin',
                vacationType: 'nature',
                decisionHighlights: ['Doğa', 'Sakinlik', 'Aktivite'],
                images: ['assets/images/demo/karadeniz-yayla.svg'],
                external_url: 'https://www.tatilsepeti.com/karadeniz-turlari',
                created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
                status: 'active'
            }
        ];

        return this.filterListingCollection(listings, options);
    }

    getDemoListingById(listingId) {
        return this.getDemoListings({ limit: 100 }).find((listing) => listing.id.toString() === listingId.toString());
    }

    setupEventListeners() {
        document.addEventListener('ib:auth-toast', (event) => {
            const { message, type } = event.detail || {};
            if (!message) return;
            if (type === 'success') this.ui.showSuccess(message);
            else this.ui.showError(message);
        });

        // Navigation
        document.addEventListener('click', (e) => {
            const previewCategoryBtn = e.target.closest('[data-preview-category]');
            if (previewCategoryBtn) {
                e.preventDefault();
                this.handleHeroPreviewCategory(previewCategoryBtn.dataset.previewCategory);
                return;
            }

            const assistantStartCard = e.target.closest('[data-assistant-start]');
            if (assistantStartCard) {
                e.preventDefault();
                this.startDecisionAssistant(assistantStartCard.dataset.assistantStart);
                return;
            }

            const mobileLoginBtn = e.target.closest('[data-mobile-login]');
            if (mobileLoginBtn) {
                e.preventDefault();
                document.getElementById('nav-menu')?.classList.remove('show');
                this.auth.showLoginModal();
                return;
            }

            const mobileRegisterBtn = e.target.closest('[data-mobile-register]');
            if (mobileRegisterBtn) {
                e.preventDefault();
                document.getElementById('nav-menu')?.classList.remove('show');
                this.auth.showRegisterModal();
                return;
            }

            const myListingsLink = e.target.closest('[data-my-listings]');
            if (myListingsLink) {
                e.preventDefault();
                this.showMyListings();
                return;
            }

            const categoryCard = e.target.closest('[data-category]');
            if (categoryCard) {
                e.preventDefault();
                this.handleCategorySelect(categoryCard.dataset.category);
                return;
            }

            const allListingsLink = e.target.closest('a[href="/ilanlar/"]:not([data-category])');
            if (allListingsLink) {
                e.preventDefault();
                this.clearCategoryFilter();
                return;
            }

            // Hash nav: Router.goToMarketingHash (resets pathname + showHomeSections)

            if (e.target.matches('[data-route]')) {
                e.preventDefault();
                const route = e.target.getAttribute('data-route');
                this.router.navigate(route);
            }
        });

        // Search
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-input');

        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => this.handleSearch());
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSearch();
            });
        }

        document.addEventListener('click', (e) => {
            const favoriteBtn = e.target.closest('[data-action="favorite"]');
            if (favoriteBtn) {
                e.preventDefault();
                const listingId = favoriteBtn.dataset.listingId || favoriteBtn.closest('.listing-card')?.dataset.listingId;
                if (listingId) {
                    this.toggleFavorite(listingId);
                }
            }

            const detailBtn = e.target.closest('[data-action="detail"]');
            if (detailBtn) {
                e.preventDefault();
                const listingId = detailBtn.dataset.listingId || detailBtn.closest('.listing-card')?.dataset.listingId;
                if (listingId) {
                    this.router.navigate(`/ilan/${listingId}`);
                }
            }

            const compareListingBtn = e.target.closest('[data-action="compare"]');
            if (compareListingBtn) {
                e.preventDefault();
                const listingId = compareListingBtn.dataset.listingId || compareListingBtn.closest('.listing-card')?.dataset.listingId;
                if (listingId) {
                    this.addListingToComparison(listingId);
                }
            }

            const quizAnswerBtn = e.target.closest('[data-quiz-answer]');
            if (quizAnswerBtn) {
                e.preventDefault();
                this.handleQuizAnswer(quizAnswerBtn.dataset.questionId, Number(quizAnswerBtn.dataset.quizAnswer));
            }

            const assistantCategoryBtn = e.target.closest('[data-assistant-category]');
            if (assistantCategoryBtn) {
                e.preventDefault();
                this.handleDecisionCategorySelect(assistantCategoryBtn.dataset.assistantCategory);
            }

            const assistantPrevBtn = e.target.closest('[data-assistant-prev]');
            if (assistantPrevBtn) {
                e.preventDefault();
                this.handleDecisionWizardMove(-1);
            }

            const assistantNextBtn = e.target.closest('[data-assistant-next]');
            if (assistantNextBtn) {
                e.preventDefault();
                this.handleDecisionWizardMove(1);
            }

            const assistantEditBtn = e.target.closest('[data-assistant-edit]');
            if (assistantEditBtn) {
                e.preventDefault();
                this.assistantStep = Number(assistantEditBtn.dataset.assistantEdit || 0);
                this.ui.clearDecisionResults();
                this.renderDecisionAssistant();
            }

            const assistantResetBtn = e.target.closest('[data-assistant-reset]');
            if (assistantResetBtn) {
                e.preventDefault();
                this.assistantAnswers = {};
                this.assistantStep = 0;
                this.lastDecisionResult = null;
                this.ui.clearDecisionResults();
                this.renderDecisionAssistant();
                this.ui.showSuccess('Karar akışı temizlendi.');
            }

            const browseDecisionListingsBtn = e.target.closest('[data-browse-decision-listings]');
            if (browseDecisionListingsBtn) {
                e.preventDefault();
                this.browseDecisionListings();
            }

            const compareRecommendationBtn = e.target.closest('[data-compare-recommendation]');
            if (compareRecommendationBtn) {
                e.preventDefault();
                this.addRecommendationToComparison(compareRecommendationBtn.dataset.compareRecommendation);
            }

            const removeComparisonBtn = e.target.closest('[data-comparison-remove]');
            if (removeComparisonBtn) {
                e.preventDefault();
                this.removeComparisonItem(removeComparisonBtn.dataset.comparisonRemove);
            }

            const clearComparisonBtn = e.target.closest('[data-comparison-clear]');
            if (clearComparisonBtn) {
                e.preventDefault();
                this.clearComparisonItems();
            }

            const repeatDecisionBtn = e.target.closest('[data-decision-repeat]');
            if (repeatDecisionBtn) {
                e.preventDefault();
                this.repeatDecision(repeatDecisionBtn.dataset.decisionRepeat);
            }

            const deleteDecisionBtn = e.target.closest('[data-decision-delete]');
            if (deleteDecisionBtn) {
                e.preventDefault();
                this.deleteDecision(deleteDecisionBtn.dataset.decisionDelete);
            }

            const historyLoginBtn = e.target.closest('[data-history-login]');
            if (historyLoginBtn) {
                e.preventDefault();
                this.auth.showLoginModal();
            }

            const historyRegisterBtn = e.target.closest('[data-history-register]');
            if (historyRegisterBtn) {
                e.preventDefault();
                this.auth.showRegisterModal();
            }

            const adminMarketActionBtn = e.target.closest('[data-admin-market-action]');
            if (adminMarketActionBtn) {
                e.preventDefault();
                this.handleAdminMarketAction(adminMarketActionBtn.dataset.adminMarketAction);
            }
        });

        document.addEventListener('submit', (e) => {
            const adminMarketForm = e.target.closest('[data-admin-market-form]');
            if (adminMarketForm) {
                e.preventDefault();
                this.handleAdminMarketSubmit(adminMarketForm);
            }
        });

        document.addEventListener('filterChanged', (e) => {
            if (e.detail && e.detail.category) {
                this.handleCategorySelect(e.detail.category);
            }
        });

        const favoritesGrid = document.getElementById('favorites-grid');
        if (favoritesGrid) {
            favoritesGrid.addEventListener('click', (e) => {
                const removeBtn = e.target.closest('[data-favorite-id]');
                if (removeBtn) {
                    const listingId = removeBtn.dataset.favoriteId;
                    if (listingId) {
                        this.toggleFavorite(listingId);
                    }
                }
            });
        }

        document.addEventListener('routeChanged', (e) => {
            const { route, params } = e.detail;
            if (route === 'listing-detail' && params.id) {
                this.ui.renderListingDetailLoading?.();
                this.loadListingDetail(params.id);
            }

            if (route === 'quiz') {
                this.loadQuiz();
            }

            if (route === 'add-listing' && !this.currentUser) {
                this.router.navigate('/ilanlar');
                this.auth.showLoginModal();
                this.ui.showError('İlan vermek için giriş yapın veya üye olun.');
                return;
            }

            if (route === 'auth-login' || route === 'auth-register') {
                handleAuthRouteEntry(route, this.auth);
            }

            if (route === 'decision-assistant' || route === 'page-karar-analizi') {
                void this.mountPremiumPage('karar-analizi').then(() => {
                    this.renderDecisionAssistant();
                });
            }

            if (route === 'page-metodoloji') {
                void this.mountPremiumPage('metodoloji');
            }

            if (route === 'page-planlar') {
                void this.mountPremiumPage('planlar').then(() => {
                    this.renderPricingSection();
                });
            }

            if (route === 'history') {
                this.loadDecisionHistory();
                this.loadComparisonHistory();
            }

            if (route === 'compare') {
                this.ui.renderComparison(this.comparisonItems);
            }

            if (route === 'profil') {
                const params = new URLSearchParams(window.location.search);
                this.account?.handleQueryParams?.(params);
                if (this.currentUser) {
                    this.account?.refresh?.(this.currentUser);
                } else {
                    this.account?.renderGuest?.();
                }

                const upgrade = params.get('upgrade');
                if (upgrade === '1') {
                    if (!peekCheckoutIntent()) {
                        storeCheckoutIntentPayload({ billing: 'monthly', useTrial: true });
                    }
                    if (this.currentUser) {
                        this.scheduleCheckoutResume(400);
                    } else {
                        this.auth.showCheckoutAuthGate();
                    }
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.matches('#profile-login-btn')) {
                e.preventDefault();
                this.auth.showLoginModal();
            }

            if (e.target.matches('#profile-logout-btn')) {
                e.preventDefault();
                this.handleLogout();
            }

            if (e.target.matches('#edit-profile-btn')) {
                e.preventDefault();
                this.router.navigate('/profil');
            }
        });

        // Auth buttons
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const logoutHeaderBtn = document.getElementById('logout-btn-header');

        if (loginBtn) loginBtn.addEventListener('click', () => this.auth.showLoginModal());
        if (registerBtn) registerBtn.addEventListener('click', () => this.auth.showRegisterModal());
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.handleLogout());
        if (logoutHeaderBtn) logoutHeaderBtn.addEventListener('click', () => this.handleLogout());

        // Add listing button
        const addListingBtn = document.getElementById('add-listing-btn');
        if (addListingBtn) {
            addListingBtn.addEventListener('click', () => this.handleAddListing());
        }

        const addListingForm = document.getElementById('add-listing-form');
        if (addListingForm) {
            addListingForm.addEventListener('submit', (e) => this.handleCreateListing(e));
        }

        const filterBtn = document.getElementById('filter-btn');
        const filterForm = document.getElementById('listing-filter-form');
        const clearFilterBtn = document.getElementById('clear-filter-btn');
        if (filterBtn && filterForm) {
            this.setupListingFilterControls(filterForm);
            filterBtn.addEventListener('click', () => {
                filterForm.hidden = !filterForm.hidden;
                if (!filterForm.hidden) {
                    this.syncListingFilterControls(filterForm);
                    this.ui.loadIcons();
                }
            });
            filterForm.addEventListener('submit', (e) => this.handleListingFilter(e));
            this._teardownAutoListingFilters = wireAutoListingFilters(filterForm, () =>
                this.applyListingFiltersFromForm({ silent: true })
            );
        }
        if (clearFilterBtn && filterForm) {
            clearFilterBtn.addEventListener('click', () => this.clearListingFilter(filterForm));
        }

        const listingSortSelect = document.getElementById('listing-sort');
        if (listingSortSelect) {
            listingSortSelect.addEventListener('change', (event) => this.handleListingSortChange(event.target.value));
        }

        document.querySelectorAll('[data-listing-view]').forEach((button) => {
            button.addEventListener('click', () => this.handleListingViewChange(button.dataset.listingView));
        });

        const decisionAssistantForm = document.getElementById('decision-assistant-form');
        if (decisionAssistantForm) {
            decisionAssistantForm.addEventListener('submit', (e) => this.handleDecisionAssistantSubmit(e));
            decisionAssistantForm.addEventListener('change', (e) => this.handleDecisionAssistantChange(e));
        }

        const newsletterForm = document.getElementById('newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', (e) => this.handleNewsletterSubscribe(e));
        }

        document.addEventListener('click', (event) => {
            const exportBtn = event.target.closest('[data-upsell-trigger="decision_export"]');
            if (!exportBtn || revenueManager.isPremium) return;
            event.preventDefault();
            const placement = exportBtn.dataset.upsellPlacement || 'compare_export';
            if (shouldShowUpsell('decision_export')) {
                const container = document.getElementById('comparison-content') || exportBtn.parentElement;
                const slot = document.createElement('div');
                slot.innerHTML = renderContextualUpsellCard('decision_export', placement);
                const card = slot.firstElementChild;
                if (card && container) {
                    container.prepend(card);
                    bindContextualUpsell(container);
                }
            } else {
                openUpsellCheckout('decision_export', placement, { feature: 'premium_report', modal: true });
            }
        });

        const profileLoginBtn = document.getElementById('profile-login-btn');
        if (profileLoginBtn) {
            profileLoginBtn.addEventListener('click', () => this.auth.showLoginModal());
        }

        document.addEventListener('click', (e) => {
            const checkoutLink = e.target.closest('a[href*="checkout=pro"]');
            if (checkoutLink) {
                const billing = checkoutLink.dataset?.billing === 'annual' ? 'annual' : 'monthly';
                const useTrial = checkoutLink.dataset?.trial !== '0';
                storeCheckoutIntentPayload({ billing, useTrial });
            }

            const upgradeBtn = e.target.closest('[data-upgrade-checkout]');
            if (upgradeBtn) {
                e.preventDefault();
                this.handlePremiumCheckout(e);
            }

            const portalBtn = e.target.closest('[data-billing-portal]');
            if (portalBtn) {
                e.preventDefault();
                this.openBillingPortal(e);
            }
        });

        // Auth events
        document.addEventListener('userLoggedIn', async (e) => {
            this.currentUser = e.detail;
            await this.handleUserLogin(e.detail);
        });
        document.addEventListener('userLoggedOut', () => this.handleUserLogout());

        this.account?.bindEvents?.(this);
    }



    createMarketData() {
        return getMarketData();
    }

    createDecisionCatalog() {
        return {
            carModels: flattenCarModels(),
            provinces: getProvinceOptions(),
            vacationPlaces: VACATION_PLACES,
            propertyTypes: PROPERTY_TYPES
        };
    }


    readStoredArray(key) {
        try {
            const parsed = JSON.parse(readStorageRaw(key) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('Stored array could not be parsed:', key, error);
            try {
                localStorage.removeItem(key);
            } catch (removeError) {
                console.warn('Stored array could not be cleared:', key, removeError);
            }
            return [];
        }
    }

    writeStoredValue(key, value) {
        try {
            writeStorageRaw(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('Stored value could not be written:', key, error);
            this.ui?.showError?.('Tarayıcı depolama alanına yazılamadı. Lütfen alanı temizleyip tekrar deneyin.');
            return false;
        }
    }

    createLocationQuestions() {
        return [
            {
                id: 'province',
                label: 'Önce il seçin',
                type: 'select',
                required: true,
                placeholder: 'İl seçin',
                options: getProvinceOptions()
            },
            {
                id: 'district',
                label: 'İlçe seçin',
                type: 'select',
                required: false,
                placeholder: 'İlçe seçmeden devam edebilirsiniz',
                source: 'districts',
                options: []
            }
        ];
    }

    createDecisionAssistantConfig() {
        return {
            arac: {
                name: 'Araç',
                icon: 'car',
                description: 'Yakıt, kasko, sigorta ve bakım maliyetiyle en mantıklı aracı seçin.',
                questions: [
                    ...this.createLocationQuestions(),
                    {
                        id: 'carModel',
                        label: 'Marka/model tercihiniz var mı?',
                        type: 'select',
                        required: false,
                        placeholder: 'Marka/model seçmeden devam edebilirsiniz',
                        options: getCarModelOptions()
                    },
                    {
                        id: 'usage',
                        label: 'Aracı en çok nasıl kullanacaksınız?',
                        weight: 16,
                        options: [
                            { value: 'city', label: 'Şehir içi ve kısa mesafe' },
                            { value: 'family', label: 'Aile kullanımı' },
                            { value: 'longRoad', label: 'Uzun yol ve yüksek km' },
                            { value: 'prestige', label: 'Konfor ve prestij' }
                        ]
                    },
                    {
                        id: 'budget',
                        label: 'Araç bütçeniz nedir?',
                        type: 'number',
                        weight: 14,
                        min: 0,
                        step: 50000,
                        placeholder: 'Örn. 1850000'
                    },
                    {
                        id: 'fuel',
                        label: 'Yakıt/enerji tercihiniz hangisi?',
                        weight: 12,
                        options: [
                            { value: 'hybrid', label: 'Hibrit' },
                            { value: 'electric', label: 'Elektrik' },
                            { value: 'diesel', label: 'Dizel' },
                            { value: 'gasoline', label: 'Benzin' }
                        ]
                    },
                    {
                        id: 'body',
                        label: 'Gövde tipi tercihiniz nedir?',
                        weight: 10,
                        options: [
                            { value: 'suv', label: 'SUV' },
                            { value: 'sedan', label: 'Sedan' },
                            { value: 'hatchback', label: 'Hatchback' },
                            { value: 'mpv', label: 'Geniş aile aracı' }
                        ]
                    },
                    {
                        id: 'priority',
                        label: 'Kararda en önemli konu nedir?',
                        weight: 14,
                        options: [
                            { value: 'lowCost', label: 'Düşük toplam maliyet' },
                            { value: 'resale', label: 'İkinci el değeri' },
                            { value: 'comfort', label: 'Konfor ve donanım' },
                            { value: 'safety', label: 'Güvenlik' }
                        ]
                    }
                ],
                options: [
                    {
                        name: 'Hibrit Aile Aracı',
                        price: 1650000,
                        scoreNote: 'Şehir içi tüketim, aile kullanımı ve ikinci el dengesi güçlü.',
                        match: { usage: ['city', 'family'], budget: ['1800000', '2500000', '3500000'], fuel: 'hybrid', body: 'suv', priority: ['lowCost', 'resale', 'safety'] },
                        costs: [
                            { label: 'Yıllık yakıt', value: 52000 },
                            { label: 'Kasko', value: 32000 },
                            { label: 'Trafik sigortası', value: 12000 },
                            { label: 'Bakım', value: 18000 }
                        ],
                        channels: [
                            { label: 'Sahibinden araç ilanları', url: 'https://www.sahibinden.com/otomobil' },
                            { label: 'Arabam.com karşılaştırma', url: 'https://www.arabam.com/' },
                            { label: 'Yetkili bayi teklifleri', url: 'https://www.toyota.com.tr/' }
                        ]
                    },
                    {
                        name: 'Elektrikli Şehir Aracı',
                        price: 1350000,
                        scoreNote: 'Günlük kısa mesafede enerji ve bakım maliyeti en düşük seçenek.',
                        match: { usage: ['city'], budget: ['1400000', '1800000', '2500000', '3500000'], fuel: 'electric', body: 'hatchback', priority: ['lowCost', 'safety'] },
                        costs: [
                            { label: 'Yıllık şarj', value: 18000 },
                            { label: 'Kasko', value: 30000 },
                            { label: 'Trafik sigortası', value: 11000 },
                            { label: 'Bakım', value: 9000 }
                        ],
                        channels: [
                            { label: 'Elektrikli araç ilanları', url: 'https://www.sahibinden.com/elektrikli-arabalar' },
                            { label: 'Marka stok sorgulama', url: 'https://www.togg.com.tr/' },
                            { label: 'Şarj ağı inceleme', url: 'https://zes.net/' }
                        ]
                    },
                    {
                        name: 'Dizel Aile Sedan',
                        price: 1450000,
                        scoreNote: 'Uzun yol ve yüksek kilometrede yakıt menzili avantajlı.',
                        match: { usage: ['longRoad', 'family'], budget: ['1800000', '2500000', '3500000'], fuel: 'diesel', body: 'sedan', priority: ['resale', 'lowCost'] },
                        costs: [
                            { label: 'Yıllık yakıt', value: 68000 },
                            { label: 'Kasko', value: 28000 },
                            { label: 'Trafik sigortası', value: 11500 },
                            { label: 'Bakım', value: 22000 }
                        ],
                        channels: [
                            { label: 'Sahibinden sedan ilanları', url: 'https://www.sahibinden.com/otomobil' },
                            { label: 'Arabam.com dizel araçlar', url: 'https://www.arabam.com/' },
                            { label: 'Ekspertiz randevusu', url: 'https://www.otorapor.com/' }
                        ]
                    },
                    {
                        name: 'Benzinli Premium SUV',
                        price: 2450000,
                        scoreNote: 'Konfor, güvenlik ve donanım önceliği yüksek kullanıcılar için uygun.',
                        match: { usage: ['prestige', 'family'], budget: ['2500000', '3500000'], fuel: 'gasoline', body: 'suv', priority: ['comfort', 'safety'] },
                        costs: [
                            { label: 'Yıllık yakıt', value: 92000 },
                            { label: 'Kasko', value: 52000 },
                            { label: 'Trafik sigortası', value: 15000 },
                            { label: 'Bakım', value: 26000 }
                        ],
                        channels: [
                            { label: 'Premium SUV ilanları', url: 'https://www.sahibinden.com/otomobil' },
                            { label: 'Yetkili bayi teklifleri', url: 'https://www.bmw.com.tr/' },
                            { label: 'Kasko karşılaştırma', url: 'https://www.sigortam.net/' }
                        ]
                    }
                ]
            },
            ev: {
                name: 'Ev',
                icon: 'home',
                description: 'Daire, yazlık, müstakil ev ve villa seçeneklerini kredi, aidat ve bakım yüküyle karşılaştırın.',
                questions: [
                    ...this.createLocationQuestions(),
                    {
                        id: 'propertyType',
                        label: 'Hangi ev tipini düşünüyorsunuz?',
                        weight: 18,
                        options: [
                            { value: 'daire', label: 'Daire' },
                            { value: 'yazlik', label: 'Yazlık' },
                            { value: 'mustakil', label: 'Müstakil ev' },
                            { value: 'villa', label: 'Villa' }
                        ]
                    },
                    {
                        id: 'purpose',
                        label: 'Kullanım amacınız nedir?',
                        weight: 14,
                        options: [
                            { value: 'live', label: 'Yaşamak' },
                            { value: 'investment', label: 'Yatırım' },
                            { value: 'seasonal', label: 'Sezonluk kullanım' },
                            { value: 'premium', label: 'Konfor ve prestij' }
                        ]
                    },
                    {
                        id: 'budget',
                        label: 'Alım bütçeniz nedir?',
                        type: 'number',
                        weight: 16,
                        min: 0,
                        step: 100000,
                        placeholder: 'Örn. 7250000'
                    },
                    {
                        id: 'location',
                        label: 'Lokasyon önceliğiniz hangisi?',
                        weight: 10,
                        options: [
                            { value: 'central', label: 'Merkezi ve ulaşımı kolay' },
                            { value: 'coastal', label: 'Sahil veya tatil bölgesi' },
                            { value: 'quiet', label: 'Sakin ve müstakil yaşam' },
                            { value: 'premiumArea', label: 'Prestijli bölge' }
                        ]
                    },
                    {
                        id: 'priority',
                        label: 'En önemli karar kriteriniz nedir?',
                        weight: 12,
                        options: [
                            { value: 'lowMonthly', label: 'Düşük aylık yük' },
                            { value: 'valueGrowth', label: 'Değer artışı' },
                            { value: 'maintenance', label: 'Az bakım ihtiyacı' },
                            { value: 'comfort', label: 'Yaşam konforu' }
                        ]
                    }
                ],
                options: [
                    {
                        name: 'Lokasyon ve Kredi Dengeli 2+1 Daire',
                        price: 3200000,
                        scoreNote: 'Ulaşım, düşük aidat ve yatırım likiditesiyle dengeli başlangıç seçeneği.',
                        match: { propertyType: 'daire', purpose: ['live', 'investment'], budget: ['3500000', '6500000', '12000000', '25000000'], location: 'central', priority: ['lowMonthly', 'valueGrowth', 'maintenance'] },
                        costs: [
                            { label: 'Yıllık aidat', value: 36000 },
                            { label: 'DASK + konut sigortası', value: 9000 },
                            { label: 'Emlak vergisi', value: 6400 },
                            { label: 'Bakım/yenileme payı', value: 18000 }
                        ],
                        channels: [
                            { label: 'Sahibinden satılık daireler', url: 'https://www.sahibinden.com/satilik-daire' },
                            { label: 'Emlakjet daire arama', url: 'https://www.emlakjet.com/satilik-daire/' },
                            { label: 'Tapu işlem rehberi', url: 'https://www.tkgm.gov.tr/' }
                        ]
                    },
                    {
                        name: 'Ege Bölgesi Yazlık',
                        price: 5800000,
                        scoreNote: 'Sezonluk kullanım ve kira potansiyeli arayanlar için uygun.',
                        match: { propertyType: 'yazlik', purpose: ['seasonal', 'investment'], budget: ['6500000', '12000000', '25000000'], location: 'coastal', priority: ['valueGrowth', 'comfort'] },
                        costs: [
                            { label: 'Site aidatı', value: 48000 },
                            { label: 'DASK + konut sigortası', value: 14500 },
                            { label: 'Emlak vergisi', value: 11600 },
                            { label: 'Sezon hazırlığı', value: 42000 }
                        ],
                        channels: [
                            { label: 'Sahibinden yazlıklar', url: 'https://www.sahibinden.com/satilik-yazlik' },
                            { label: 'Hepsiemlak yazlık arama', url: 'https://www.hepsiemlak.com/satilik/yazlik' },
                            { label: 'Bölgesel kira analizi', url: 'https://www.endeksa.com/' }
                        ]
                    },
                    {
                        name: 'Bahçeli Müstakil Ev',
                        price: 8500000,
                        scoreNote: 'Sakin yaşam ve kullanım özgürlüğü isteyenler için güçlü aday.',
                        match: { propertyType: 'mustakil', purpose: ['live', 'seasonal'], budget: ['12000000', '25000000'], location: 'quiet', priority: ['comfort', 'maintenance'] },
                        costs: [
                            { label: 'Yıllık bakım', value: 78000 },
                            { label: 'DASK + konut sigortası', value: 19000 },
                            { label: 'Emlak vergisi', value: 17000 },
                            { label: 'Bahçe/tesisat gideri', value: 46000 }
                        ],
                        channels: [
                            { label: 'Müstakil ev ilanları', url: 'https://www.sahibinden.com/satilik-mustakil-ev' },
                            { label: 'Emlakjet müstakil ev', url: 'https://www.emlakjet.com/satilik-mustakil-ev/' },
                            { label: 'Ekspertiz ve değerleme', url: 'https://www.spk.gov.tr/' }
                        ]
                    },
                    {
                        name: 'Güvenlikli Site Villası',
                        price: 18500000,
                        scoreNote: 'Prestijli lokasyon, güvenlik ve yaşam konforu önceliğinde öne çıkar.',
                        match: { propertyType: 'villa', purpose: ['premium', 'live'], budget: ['25000000'], location: 'premiumArea', priority: ['comfort', 'valueGrowth'] },
                        costs: [
                            { label: 'Site aidatı', value: 132000 },
                            { label: 'Konut sigortası', value: 38000 },
                            { label: 'Emlak vergisi', value: 37000 },
                            { label: 'Havuz/bahçe bakım', value: 110000 }
                        ],
                        channels: [
                            { label: 'Villa ilanları', url: 'https://www.sahibinden.com/satilik-villa' },
                            { label: 'Hepsiemlak villa arama', url: 'https://www.hepsiemlak.com/satilik/villa' },
                            { label: 'Konut kredisi karşılaştırma', url: 'https://www.hangikredi.com/kredi/konut-kredisi' }
                        ]
                    }
                ]
            },
            tatil: {
                name: 'Tatil',
                icon: 'plane',
                description: 'Konaklama, ulaşım, transfer ve sigorta dahil gerçek tatil bütçesini görün.',
                questions: [
                    ...this.createLocationQuestions(),
                    {
                        id: 'vacationPlace',
                        label: 'Tatil yeri tercihiniz var mı?',
                        type: 'select',
                        required: true,
                        source: 'vacationPlaces',
                        options: getVacationPlaceOptions()
                    },
                    {
                        id: 'vacationType',
                        label: 'Nasıl bir tatil istiyorsunuz?',
                        weight: 16,
                        options: [
                            { value: 'familyResort', label: 'Aile için resort' },
                            { value: 'culture', label: 'Kültür ve şehir gezisi' },
                            { value: 'nature', label: 'Doğa ve sakinlik' },
                            { value: 'luxury', label: 'Lüks ve konfor' }
                        ]
                    },
                    {
                        id: 'destination',
                        label: 'Rota tercihiniz nedir?',
                        weight: 12,
                        options: [
                            { value: 'mediterranean', label: 'Akdeniz/Ege' },
                            { value: 'europe', label: 'Avrupa şehirleri' },
                            { value: 'blackSea', label: 'Karadeniz/doğa' },
                            { value: 'island', label: 'Ada veya özel rota' }
                        ]
                    },
                    {
                        id: 'travelers',
                        label: 'Kaç kişi gideceksiniz?',
                        weight: 8,
                        options: [
                            { value: 'solo', label: 'Tek kişi' },
                            { value: 'couple', label: '2 kişi' },
                            { value: 'family', label: 'Aile' },
                            { value: 'group', label: 'Grup' }
                        ]
                    },
                    {
                        id: 'budget',
                        label: 'Toplam tatil bütçeniz nedir?',
                        type: 'number',
                        weight: 16,
                        min: 0,
                        step: 5000,
                        placeholder: 'Örn. 95000'
                    },
                    {
                        id: 'priority',
                        label: 'Tatil kararında önceliğiniz nedir?',
                        weight: 12,
                        options: [
                            { value: 'allInclusive', label: 'Her şey dahil rahatlık' },
                            { value: 'experience', label: 'Deneyim ve keşif' },
                            { value: 'quiet', label: 'Sakinlik' },
                            { value: 'premium', label: 'Üst segment hizmet' }
                        ]
                    }
                ],
                options: [
                    {
                        name: 'Antalya Lara Resort Paketi',
                        price: 98000,
                        scoreNote: 'Çocuklu aileler için her şey dahil maliyet kontrolü sağlar.',
                        match: { vacationType: ['familyResort'], destination: 'mediterranean', travelers: ['family', 'group'], budget: ['120000', '220000', '400000'], priority: ['allInclusive'] },
                        costs: [
                            { label: 'Konaklama', value: 72000 },
                            { label: 'Ulaşım', value: 16000 },
                            { label: 'Transfer', value: 5000 },
                            { label: 'Seyahat sigortası', value: 5000 }
                        ],
                        channels: [
                            { label: 'ETS aile otelleri', url: 'https://www.etstur.com/' },
                            { label: 'Tatilsepeti paketleri', url: 'https://www.tatilsepeti.com/' },
                            { label: 'Uçak bileti karşılaştırma', url: 'https://www.enuygun.com/ucak-bileti/' }
                        ]
                    },
                    {
                        name: 'Roma Kültür Gezisi',
                        price: 115000,
                        scoreNote: 'Şehir, müze ve deneyim odağında dengeli Avrupa seçeneği.',
                        match: { vacationType: ['culture'], destination: 'europe', travelers: ['solo', 'couple'], budget: ['120000', '220000', '400000'], priority: ['experience'] },
                        costs: [
                            { label: 'Uçak + konaklama', value: 82000 },
                            { label: 'Müze/aktivite', value: 15000 },
                            { label: 'Şehir içi ulaşım', value: 9000 },
                            { label: 'Seyahat sigortası', value: 9000 }
                        ],
                        channels: [
                            { label: 'Avrupa tur paketleri', url: 'https://www.jollytur.com/' },
                            { label: 'Uçak bileti arama', url: 'https://www.enuygun.com/ucak-bileti/' },
                            { label: 'Vize bilgi ekranı', url: 'https://www.konsolosluk.gov.tr/' }
                        ]
                    },
                    {
                        name: 'Karadeniz Doğa Rotası',
                        price: 54000,
                        scoreNote: 'Sakinlik ve doğa isteyenler için bütçesi kontrollü alternatif.',
                        match: { vacationType: ['nature'], destination: 'blackSea', travelers: ['solo', 'couple', 'family'], budget: ['60000', '120000', '220000', '400000'], priority: ['quiet', 'experience'] },
                        costs: [
                            { label: 'Konaklama', value: 28000 },
                            { label: 'Ulaşım/araç', value: 17000 },
                            { label: 'Aktivite', value: 6000 },
                            { label: 'Sigorta', value: 3000 }
                        ],
                        channels: [
                            { label: 'Karadeniz turları', url: 'https://www.tatilsepeti.com/karadeniz-turlari' },
                            { label: 'Araç kiralama', url: 'https://www.enuygun.com/arac-kiralama/' },
                            { label: 'Konaklama arama', url: 'https://www.otelz.com/' }
                        ]
                    },
                    {
                        name: 'Lüks Ada Kaçamağı',
                        price: 260000,
                        scoreNote: 'Özel rota, üst segment konaklama ve yüksek hizmet beklentisi için.',
                        match: { vacationType: ['luxury'], destination: 'island', travelers: ['couple', 'group'], budget: ['400000'], priority: ['premium', 'quiet'] },
                        costs: [
                            { label: 'Konaklama', value: 165000 },
                            { label: 'Uçuş/feribot', value: 54000 },
                            { label: 'Transfer', value: 21000 },
                            { label: 'Sigorta ve ekstra', value: 20000 }
                        ],
                        channels: [
                            { label: 'Lüks tatil paketleri', url: 'https://www.etstur.com/' },
                            { label: 'Özel tur planlama', url: 'https://www.setur.com.tr/' },
                            { label: 'Seyahat sigortası', url: 'https://www.sigortam.net/seyahat-sigortasi' }
                        ]
                    }
                ]
            }
        };
    }

    renderDecisionAssistant() {
        const resolvedConfig = this.getResolvedDecisionAssistantConfig();
        const activeConfig = resolvedConfig[this.assistantCategory];
        const steps = this.getAssistantWizardSteps(activeConfig);
        this.assistantStep = Math.max(0, Math.min(this.assistantStep, Math.max(steps.length - 1, 0)));
        this.ui.renderDecisionAssistant(resolvedConfig, this.assistantCategory, this.assistantAnswers, {
            stepIndex: this.assistantStep,
            steps
        });
    }

    getAssistantWizardSteps(categoryConfig) {
        if (!categoryConfig?.questions?.length) return [];

        const locationQuestionIds = new Set(['province', 'district', 'carModel', 'vacationPlace']);
        const budgetQuestionIds = new Set(['budget', 'priority']);
        const locationQuestions = categoryConfig.questions.filter((question) => locationQuestionIds.has(question.id));
        const financeQuestions = categoryConfig.questions.filter((question) => budgetQuestionIds.has(question.id));
        const needQuestions = categoryConfig.questions.filter((question) => !locationQuestionIds.has(question.id) && !budgetQuestionIds.has(question.id));

        return [
            {
                id: 'location',
                label: 'Konum ve kapsam',
                eyebrow: '1. adım',
                description: 'Önce il seçin; ilçe, araç marka/modeli veya tatil yeri tercihi boş bırakılabilir.',
                questions: locationQuestions
            },
            {
                id: 'needs',
                label: 'İhtiyaç profili',
                eyebrow: '2. adım',
                description: 'Kullanım amacını, beklentileri ve karar kriterlerini netleştirin.',
                questions: needQuestions
            },
            {
                id: 'finance',
                label: 'Bütçe ve maliyet',
                eyebrow: '3. adım',
                description: 'Serbest bütçe girin; sistem toplam maliyet ve kredi yükünü birlikte hesaplar.',
                questions: financeQuestions
            }
        ].filter((step) => step.questions.length);
    }

    getQuestionStepIndex(categoryConfig, questionId) {
        return this.getAssistantWizardSteps(categoryConfig).findIndex((step) => step.questions.some((question) => question.id === questionId));
    }

    collectAssistantAnswers(form, categoryConfig) {
        const formData = new FormData(form);
        const answers = { ...this.assistantAnswers };

        categoryConfig.questions.forEach((question) => {
            const value = formData.get(question.id);
            if (value !== null) {
                answers[question.id] = value.toString();
            } else if (!(question.id in answers)) {
                answers[question.id] = '';
            }
        });

        return answers;
    }

    validateAssistantQuestions(questions, answers) {
        return questions.find((question) => question.required !== false && !answers[question.id]);
    }

    handleDecisionWizardMove(direction) {
        const categoryConfig = this.getResolvedDecisionAssistantConfig()[this.assistantCategory];
        const form = document.getElementById('decision-assistant-form');
        if (!categoryConfig || !form) return;

        const steps = this.getAssistantWizardSteps(categoryConfig);
        const currentStep = steps[this.assistantStep];
        const answers = this.collectAssistantAnswers(form, categoryConfig);

        if (direction > 0 && currentStep) {
            const missingQuestion = this.validateAssistantQuestions(currentStep.questions, answers);
            if (missingQuestion) {
                this.ui.showError(`${missingQuestion.label} sorusunu cevaplayın.`);
                return;
            }
        }

        this.assistantAnswers = answers;
        this.assistantStep = Math.max(0, Math.min(this.assistantStep + direction, Math.max(steps.length - 1, 0)));
        this.ui.clearDecisionResults();
        this.renderDecisionAssistant();
    }

    getResolvedDecisionAssistantConfig() {
        const resolvedConfig = { ...this.decisionAssistant };
        const activeConfig = this.decisionAssistant[this.assistantCategory];
        if (!activeConfig) return resolvedConfig;

        resolvedConfig[this.assistantCategory] = {
            ...activeConfig,
            questions: activeConfig.questions.map((question) => {
                if (question.source === 'districts') {
                    return {
                        ...question,
                        options: getDistrictOptions(this.assistantAnswers.province)
                    };
                }

                if (question.source === 'vacationPlaces') {
                    return {
                        ...question,
                        options: getVacationPlaceOptions(this.assistantAnswers.province, this.assistantAnswers.district)
                    };
                }

                return question;
            })
        };

        return resolvedConfig;
    }

    handleDecisionAssistantChange(event) {
        const categoryConfig = this.getResolvedDecisionAssistantConfig()[this.assistantCategory];
        if (!categoryConfig) return;

        const nextAnswers = this.collectAssistantAnswers(event.currentTarget, categoryConfig);

        if (event.target.name === 'province') {
            nextAnswers.district = '';
            nextAnswers.vacationPlace = 'any';
        }

        if (event.target.name === 'district') {
            nextAnswers.vacationPlace = 'any';
        }

        this.assistantAnswers = nextAnswers;
        this.ui.clearDecisionResults();

        if (['province', 'district'].includes(event.target.name)) {
            this.renderDecisionAssistant();
        }
    }


    getHeroPreviewData() {
        return {
            arac: {
                id: 'arac',
                title: '2023 Toyota Corolla Cross Hybrid',
                note: 'Yıllık 18.000 km, %36 peşinat — örnek senaryo; canlı analizde girdilerinize göre hesaplanır.',
                score: '78',
                metrics: [
                    { label: '12 ay TCO', value: '₺412.800' },
                    { label: 'Aylık finansman', value: '₺14.200' },
                    { label: 'Gizli risk', value: 'Düşük' }
                ],
                bars: [
                    { label: 'Yakıt', value: 62 },
                    { label: 'Sigorta', value: 48 },
                    { label: 'Bakım', value: 34 }
                ],
                sources: [
                    { label: 'Piyasa verisi', url: '#veri-modeli' },
                    { label: 'Finans verisi', url: '#veri-modeli' },
                    { label: 'Sigorta modeli', url: '#veri-modeli' }
                ]
            },
            ev: {
                id: 'ev',
                title: 'Lokasyon ve Kredi Dengeli 2+1 Daire',
                note: 'Aidat, DASK, konut kredisi ve değer artışı dengesi güçlü seçenek.',
                score: 'Veri',
                metrics: [
                    { label: 'Yıllık gider', value: '69.400 ₺' },
                    { label: 'Finansman', value: 'Simülasyon' },
                    { label: 'Güven', value: 'Şeffaf' }
                ],
                bars: [
                    { label: 'Aidat', value: 46 },
                    { label: 'DASK', value: 28 },
                    { label: 'Kredi', value: 58 }
                ],
                sources: [
                    { label: 'Emlak piyasa verisi', url: '#veri-modeli' },
                    { label: 'Konut finans verisi', url: '#veri-modeli' },
                    { label: 'Tapu/DASK modeli', url: '#veri-modeli' }
                ]
            },
            tatil: {
                id: 'tatil',
                title: 'Aile İçin Toplam Bütçesi Hesaplanan Tatil',
                note: 'Konaklama, ulaşım, transfer ve sigorta kalemleri tek bütçede dengelenir.',
                score: 91,
                metrics: [
                    { label: 'Toplam paket', value: '98.000 ₺' },
                    { label: 'Ek maliyet', value: '26.000 ₺' },
                    { label: 'Güven', value: 'Şeffaf' }
                ],
                bars: [
                    { label: 'Konaklama', value: 68 },
                    { label: 'Ulaşım', value: 42 },
                    { label: 'Sigorta', value: 24 }
                ],
                sources: [
                    { label: 'Tatil piyasa verisi', url: '#veri-modeli' },
                    { label: 'Ulaşım maliyet modeli', url: '#veri-modeli' },
                    { label: 'Seyahat sigortası modeli', url: '#veri-modeli' }
                ]
            }
        };
    }

    handleHeroPreviewCategory(categoryId) {
        if (!this.getHeroPreviewData()[categoryId]) return;
        this.renderHeroDecisionPreview(categoryId);
    }

    renderHeroDecisionPreview(categoryId = this.previewCategory) {
        const preview = document.querySelector('.decision-preview');
        if (!preview) return;

        const data = this.getHeroPreviewData()[categoryId] || this.getHeroPreviewData().arac;
        this.previewCategory = data.id;
        preview.dataset.previewActive = data.id;
        preview.classList.remove('is-preview-updating');
        void preview.offsetWidth;
        preview.classList.add('is-preview-updating');

        preview.querySelectorAll('[data-preview-category]').forEach((button) => {
            const isActive = button.dataset.previewCategory === data.id;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', String(isActive));
            button.tabIndex = isActive ? 0 : -1;
        });

        const title = preview.querySelector('[data-preview-title]');
        const note = preview.querySelector('[data-preview-note]');
        const score = preview.querySelector('[data-preview-score]');
        if (title) title.textContent = data.title;
        if (note) note.textContent = data.note;
        if (score) score.textContent = data.score;

        preview.querySelectorAll('[data-preview-metric]').forEach((metric, index) => {
            const item = data.metrics[index];
            if (!item) return;
            const label = metric.querySelector('span');
            const value = metric.querySelector('strong');
            if (label) label.textContent = item.label;
            if (value) value.textContent = item.value;
        });

        preview.querySelectorAll('[data-preview-bar-row]').forEach((row, index) => {
            const item = data.bars[index];
            if (!item) return;
            const label = row.querySelector('span');
            const bar = row.querySelector('i');
            if (label) label.textContent = item.label;
            if (bar) {
                bar.style.width = Math.max(8, Math.min(100, item.value)) + '%';
                bar.setAttribute('aria-label', item.label + ' ' + item.value + '%');
            }
        });

        const sourceStrip = preview.querySelector('[data-preview-sources]');
        if (sourceStrip) {
            const links = data.sources.map((source) => {
                const link = document.createElement('a');
                link.href = source.url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.dataset.previewSource = '';
                link.textContent = source.label;
                link.setAttribute('aria-label', source.label + ' kaynağını yeni sekmede aç');
                return link;
            });
            sourceStrip.replaceChildren(...links);
        }
    }

    startDecisionAssistant(categoryId) {
        if (!this.decisionAssistant[categoryId]) return;
        this.assistantCategory = categoryId;
        this.assistantAnswers = {};
        this.assistantStep = 0;
        this.ui.clearDecisionResults();
        this.router.navigate('/karar-asistani');
        this.renderDecisionAssistant();
    }

    handleDecisionCategorySelect(categoryId) {
        if (!this.decisionAssistant[categoryId]) return;

        this.assistantCategory = categoryId;
        this.assistantAnswers = {};
        this.assistantStep = 0;
        this.ui.clearDecisionResults();
        this.renderDecisionAssistant();
    }

    async handleDecisionAssistantSubmit(event) {
        event.preventDefault();
        const categoryConfig = this.getResolvedDecisionAssistantConfig()[this.assistantCategory];
        if (!categoryConfig) return;

        const answers = this.collectAssistantAnswers(event.currentTarget, categoryConfig);
        const missingQuestion = this.validateAssistantQuestions(categoryConfig.questions, answers);
        if (missingQuestion) {
            const stepIndex = this.getQuestionStepIndex(categoryConfig, missingQuestion.id);
            if (stepIndex >= 0) this.assistantStep = stepIndex;
            this.assistantAnswers = answers;
            this.renderDecisionAssistant();
            this.ui.showError(`${missingQuestion.label} sorusunu cevaplayın.`);
            return;
        }

        this.assistantAnswers = answers;

        let result = this.buildDecisionResult(categoryConfig, answers);

        const aiPro = revenueManager.isPremium;
        if (hasAiNarrationBudget({ pro: aiPro })) {
            try {
                this.ui.showInfo?.('AI karar analizi hazırlanıyor...');
                if (canCallAiNarration({ pro: aiPro })) {
                    result = await this.augmentDecisionWithAI(categoryConfig, answers, result);
                }
            } catch (error) {
                // deterministic result already shown
            }
        } else {
            this.ui.showInfo?.(
                'Saatlik AI kotası doldu; kural tabanlı skor ve öneriler geçerlidir.'
            );
        }

        this.lastDecisionResult = result;
        this.ui.renderDecisionResults?.(result);
        const savedToHistory = this.saveDecisionHistory(result);
        this.ui.showSuccess(savedToHistory ? 'Karar sonucu geçmişinize kaydedildi.' : 'Sonuç hazır. Geçmişe kaydetmek için giriş yapın.');
    }

    buildDecisionResult(categoryConfig, answers) {
        const recommendations = this.calculateAssistantScores(categoryConfig, answers).slice(0, 3);
        const primary = recommendations[0];
        const dataHealth = this.createDecisionDataHealth(this.assistantCategory, recommendations);
        return {
            id: `decision-${Date.now()}`,
            categoryId: this.assistantCategory,
            categoryName: categoryConfig.name,
            description: categoryConfig.description,
            createdAt: new Date().toISOString(),
            rawAnswers: { ...answers },
            answers: categoryConfig.questions.map((question) => ({
                id: question.id,
                label: question.label,
                value: this.getAnswerDisplayValue(question, answers[question.id])
            })),
            recommendations,
            dataHealth,
            summary: this.createDecisionSummary(categoryConfig, primary),
            insight: this.createDecisionInsight(categoryConfig, primary, recommendations)
        };
    }

    parseAIJsonResponse(rawText = '') {
        try {
            const cleaned = String(rawText || '')
                .replace(/```json/gi, '')
                .replace(/```/g, '')
                .trim();

            const start = cleaned.indexOf('{');
            const end = cleaned.lastIndexOf('}');

            if (start === -1 || end === -1 || end <= start) {
                return null;
            }

            return JSON.parse(cleaned.slice(start, end + 1));
        } catch (error) {
            return null;
        }
    }

    buildDecisionPrompt(categoryConfig, answers) {
        const roles = {
            arac: 'Türkiye otomotiv satın alma danışmanı',
            ev: 'Türkiye gayrimenkul satın alma danışmanı',
            tatil: 'Türkiye seyahat planlama danışmanı'
        };

        const answerLines = categoryConfig.questions
            .map((question) => `- ${question.label}: ${this.getAnswerDisplayValue(question, answers[question.id]) || 'Belirtilmedi'}`)
            .join('\n');

        return `${roles[this.assistantCategory] || 'Türkiye karar danışmanı'} olarak çalış.

Kullanıcı kriterleri:
${answerLines}

Kategori: ${categoryConfig.name}

Finansal uygunluk, toplam maliyet, risk, gerçekçi satın alma/rezervasyon adımları ve alternatifleri birlikte değerlendir.

SADECE geçerli JSON döndür.
Markdown yok.
Kod bloğu yok.
Açıklama yok.
Skor, fiyat veya maliyet SAYISI ÜRETME — bunlar sistem tarafından hesaplanır.

{
  "summary": "Kısa karar özeti",
  "insight": "Neden bu öneriyi verdiğini açıklayan Türkçe analiz",
  "best_match": {
    "title": "En uygun seçenek",
    "reason": "Kısa gerekçe",
    "pros": ["artı"],
    "cons": ["eksi"]
  },
  "alternatives": [
    {
      "title": "Alternatif seçenek",
      "reason": "Kısa gerekçe",
      "pros": ["artı"],
      "cons": ["eksi"]
    }
  ],
  "risks": ["risk"],
  "next_steps": ["sonraki adım"]
}`;
    }

    normalizeAIRecommendations(parsed, fallback) {
        const items = [
            parsed?.best_match,
            ...(Array.isArray(parsed?.alternatives) ? parsed.alternatives : [])
        ].filter(Boolean);

        if (!items.length) {
            return fallback.recommendations;
        }

        return items.slice(0, 3).map((item, index) => {
            const base = fallback.recommendations[index] || fallback.recommendations[0] || {};

            return {
                ...base,
                id: `ai-${this.assistantCategory}-${index + 1}`,
                title: item.title || base.title,
                name: item.title || base.name || 'Önerilen seçenek',
                score: Number(base.score || 80),
                price: Number(base.price || 0),
                yearlyCost: Number(base.yearlyCost || 0),
                reason: item.reason || base.reason || '',
                pros: Array.isArray(item.pros) ? item.pros : (base.pros || []),
                cons: Array.isArray(item.cons) ? item.cons : (base.cons || []),
                aiGenerated: true
            };
        });
    }

    async augmentDecisionWithAI(categoryConfig, answers, fallback) {
        try {
            const prompt = this.buildDecisionPrompt(categoryConfig, answers);

            const aiResponse = await API.askAI(prompt, {
                type: `decision_${this.assistantCategory}`,
                category: this.assistantCategory
            });

            const rawAiText = aiResponse?.result ?? aiResponse?.response ?? '';
            const parsed = this.parseAIJsonResponse(rawAiText);

            if (!parsed) {
                return fallback;
            }

            return {
                ...fallback,
                aiGenerated: true,
                summary: parsed.summary || fallback.summary,
                insight: typeof parsed.insight === 'string'
                    ? parsed.insight
                    : (fallback.insight?.headline || fallback.summary),
                recommendations: this.normalizeAIRecommendations(parsed, fallback),
                risks: Array.isArray(parsed.risks) ? parsed.risks : [],
                nextSteps: Array.isArray(parsed.next_steps)
                    ? parsed.next_steps
                    : fallback.insight?.nextSteps || []
            };
        } catch (error) {
            return fallback;
        }
    }


    getAnswerDisplayValue(question, value) {
        if (value) {
            if (question.type === 'number') {
                return this.formatCurrency(value);
            }

            return (Array.isArray(question.options) ? question.options : []).find((option) => option.value === value)?.label || value;
        }

        const optionalLabels = {
            district: 'Tüm ilçeler',
            carModel: 'Sistem en uygun marka/modeli önersin',
            vacationPlace: 'Sistem en uygun tatil yerini önersin'
        };

        return question.required === false ? optionalLabels[question.id] || 'Fark etmez' : '';
    }

    formatLocationLabel(province, district) {
        if (!province) return 'Türkiye geneli';
        return district ? `${province}/${district}` : `${province} geneli`;
    }

    createDecisionInsight(categoryConfig, primary, recommendations = []) {
        if (!primary) {
            return {
                headline: 'Yeterli veri yok',
                reasons: ['Cevaplarınızı değiştirerek daha güçlü bir sonuç alabilirsiniz.'],
                cautions: ['Bütçe, finansman ve gerçek ilan verileri karar öncesi tekrar kontrol edilmelidir.'],
                nextSteps: ['Kategori sorularını yeniden cevaplayın.']
            };
        }

        const bestFinance = primary.financeComparisons?.[0];
        const alternative = recommendations.find((item) => item.name !== primary.name);
        const affordability = bestFinance ? bestFinance.bank + ' için yaklaşık aylık ödeme ' + this.formatCurrency(bestFinance.monthlyPayment) + '.' : 'Finansman simülasyonu hazır değil.';
        const alternativeText = alternative ? alternative.name + ' ikinci seçenek olarak tutulabilir; skor farkı ' + Math.max(0, primary.score - alternative.score) + ' puan.' : 'Güçlü ikinci seçenek bulunamadı.';

        return {
            headline: primary.name + ', ' + categoryConfig.name.toLocaleLowerCase('tr-TR') + ' kararınızda en dengeli seçenek olarak öne çıkıyor.',
            reasons: [
                primary.scoreNote,
                primary.realisticComment,
                'Toplam dönemsel maliyet ' + this.formatCurrency(primary.yearlyCost) + ' seviyesinde hesaplandı.',
                affordability
            ].filter(Boolean),
            cautions: [
                ...this.getCategoryDecisionCautions(this.assistantCategory),
                alternativeText
            ],
            nextSteps: this.getCategoryDecisionNextSteps(this.assistantCategory)
        };
    }

    getCategoryDecisionCautions(categoryId) {
        const cautions = {
            arac: [
                'Araç için fiyat, kilometre, tramer, ekspertiz, lastik durumu ve güncel kasko teklifi sonucu değiştirebilir.',
                'Taşıt kredisi oranı, yaş sınırı ve kredi kullandırım oranı bankaya göre farklılaşır.'
            ],
            ev: [
                'Ev için tapu kaydı, imar durumu, deprem performansı, aidat borcu ve gerçek m2 fiyatı mutlaka doğrulanmalıdır.',
                'Konut kredisi ekspertiz değeri satış fiyatından düşük çıkarsa peşinat ihtiyacı artabilir.'
            ],
            tatil: [
                'Tatil için sezon, uçuş saati, oda tipi, iptal koşulu ve çocuk/ek kişi ücretleri toplam maliyeti değiştirebilir.',
                'Erken rezervasyon ve son dakika fiyatları aynı rota için ciddi farklılık gösterebilir.'
            ]
        };
        return cautions[categoryId] || ['Güncel fiyat ve sözleşme koşulları karar öncesi doğrulanmalıdır.'];
    }

    getCategoryDecisionNextSteps(categoryId) {
        const steps = {
            arac: [
                'İlk iki aracı gerçek ilan fiyatı, kilometre ve hasar kaydıyla karşılaştırın.',
                'Ekspertiz ve kasko teklifini almadan kapora göndermeyin.',
                'Aylık kredi yerine toplam geri ödeme ve yıllık sahip olma maliyetini birlikte değerlendirin.'
            ],
            ev: [
                'Aynı il/ilçede benzer m2 ve bina yaşıyla gerçek ilan karşılaştırması yapın.',
                'Tapu, imar, deprem, aidat ve ekspertiz değerini satın alma öncesi netleştirin.',
                'Kredi taksitiyle birlikte yıllık aidat, vergi ve bakım yükünü bütçeye ekleyin.'
            ],
            tatil: [
                'Aynı rota için uçuş saatleri, otel puanı ve iptal koşullarını yan yana karşılaştırın.',
                'Transfer, bagaj, aktivite ve sigorta kalemlerini paket fiyatına dahil edin.',
                'Sezon yoğunluğuna göre erken rezervasyon ve esnek tarih alternatiflerini kontrol edin.'
            ]
        };
        return steps[categoryId] || ['En iyi iki seçeneği gerçek fiyat ve sözleşme koşullarıyla karşılaştırın.'];
    }

    formatCurrency(value) {
        return formatMoney(Math.round(Number(value) || 0));
    }


    getContextualDecisionOptions(categoryConfig, answers) {
        if (this.assistantCategory === 'arac') {
            return this.getVehicleDecisionOptions(answers);
        }

        if (this.assistantCategory === 'ev') {
            return this.getHomeDecisionOptions(answers);
        }

        if (this.assistantCategory === 'tatil') {
            return this.getVacationDecisionOptions(answers);
        }

        return categoryConfig.options;
    }

    getVehicleDecisionOptions(answers) {
        const selected = answers.carModel && answers.carModel !== 'any'
            ? this.catalog.carModels.filter((item) => `${item.brand}|${item.model}` === answers.carModel)
            : this.catalog.carModels;
        const selectedPool = selected.length ? selected : this.catalog.carModels;
        const province = answers.province || 'Türkiye';
        const district = answers.district || 'Tüm ilçeler';
        const locationLabel = this.formatLocationLabel(province, answers.district);
        const costs = this.getCostProfile('arac');

        return selectedPool.map((item, index) => {
            const modelName = `${item.brand} ${item.model}`;
            const lowerModel = modelName.toLocaleLowerCase('tr-TR');
            const isElectric = /togg|tesla|ioniq|ev6|mg4|atto|dolphin|seal|500e|spring|born|e-tron|ix1|ex30/.test(lowerModel);
            const isSuv = /suv|x1|x3|x5|q2|q3|q5|t-roc|tiguan|kuga|puma|duster|sportage|tucson|qashqai|x-trail|hr-v|cr-v|rav4|c-hr|bayon|kona|3008|5008|2008|mokka|grandland|formentor|xc|tiggo|omoda|zs|hs|vitara|s-cross|macan|cayenne|defender|evoque/.test(lowerModel);
            const isCommercial = /doblo|fiorino|kangoo|caddy|transit|tourneo|proace|vito|transporter|ranger|hilux|l200|navara/.test(lowerModel);
            const isPremium = /bmw|mercedes|audi|volvo|porsche|land rover|tesla/.test(item.brand.toLocaleLowerCase('tr-TR'));
            const fuel = isElectric ? 'electric' : lowerModel.includes('hybrid') || ['Toyota', 'Honda', 'Suzuki'].includes(item.brand) ? 'hybrid' : isCommercial ? 'diesel' : 'gasoline';
            const body = isSuv ? 'suv' : isCommercial ? 'mpv' : /sedan|corolla|megane|passat|octavia|superb|civic|elantra|city|taliant|egea sedan|3 serisi|5 serisi|c serisi|e serisi|a4|s60/.test(lowerModel) ? 'sedan' : 'hatchback';
            const fuelLabel = this.getVehicleFuelLabel(fuel);
            const bodyLabel = this.getVehicleBodyLabel(body);
            const segmentLabel = isPremium ? 'Premium segment' : isCommercial ? 'Ticari/aile odaklı' : isElectric ? 'Elektrikli yeni nesil' : 'Standart binek';
            const basePrice = costs.basePrice + (index % 12) * costs.modelStep + (isPremium ? costs.premiumPriceExtra : 0) + (isElectric ? costs.electricPriceExtra : 0) + (isSuv ? costs.suvPriceExtra : 0);
            const fuelCost = isElectric ? costs.electricEnergyCost : fuel === 'hybrid' ? costs.hybridFuelCost : fuel === 'diesel' ? costs.dieselFuelCost : costs.gasolineFuelCost;
            const insurance = Math.round(basePrice * (isPremium ? costs.insurancePremiumRate : costs.insuranceStandardRate));
            return {
                name: `${modelName} - ${locationLabel}`,
                price: basePrice,
                scoreNote: modelName + ', ' + locationLabel + ' için ' + fuelLabel.toLocaleLowerCase('tr-TR') + ' maliyeti, ' + bodyLabel.toLocaleLowerCase('tr-TR') + ' kullanım tipi ve yıllık sahip olma giderleriyle değerlendirildi.',
                details: [
                    { label: 'Marka', value: item.brand },
                    { label: 'Model', value: item.model },
                    { label: 'Lokasyon', value: locationLabel },
                    { label: 'Yakıt/enerji', value: fuelLabel },
                    { label: 'Gövde tipi', value: bodyLabel },
                    { label: 'Segment', value: segmentLabel }
                ],
                realisticComment: modelName + ' için öneri, ' + locationLabel + ' odağında tahmini fiyat, yıllık ' + fuelLabel.toLocaleLowerCase('tr-TR') + ' gideri, kasko ve bakım yükü birlikte düşünülerek üretildi. Gerçek satın alma öncesi kilometre, hasar kaydı, ekspertiz ve güncel kasko teklifi mutlaka kontrol edilmeli.',
                match: {
                    province,
                    district,
                    usage: isCommercial ? ['longRoad', 'family'] : isPremium ? ['prestige', 'family'] : ['city', 'family', 'longRoad'],
                    budget: ['1400000', '1800000', '2500000', '3500000'],
                    fuel,
                    body,
                    carModel: answers.carModel || 'any',
                    priority: isPremium ? ['comfort', 'safety', 'resale'] : ['lowCost', 'resale', 'safety']
                },
                costs: [
                    { label: 'Yıllık yakıt/enerji', value: fuelCost },
                    { label: 'Kasko', value: insurance },
                    { label: 'Trafik sigortası', value: costs.trafficInsuranceBase + (isPremium ? costs.trafficInsurancePremiumExtra : 0) },
                    { label: 'Bakım', value: isElectric ? costs.maintenanceElectric : isPremium ? costs.maintenancePremium : costs.maintenanceStandard }
                ],
                channels: [
                    { label: `${item.brand} ilanlarını gör`, url: 'https://www.sahibinden.com/otomobil' },
                    { label: 'Ekspertiz planla', url: 'https://www.otorapor.com/' },
                    { label: 'Kasko karşılaştır', url: 'https://www.sigortam.net/' }
                ]
            };
        });
    }

    getHomeDecisionOptions(answers) {
        const province = answers.province || 'Türkiye';
        const district = answers.district || 'Tüm ilçeler';
        const locationLabel = this.formatLocationLabel(province, answers.district);
        const selectedTypes = answers.propertyType ? PROPERTY_TYPES.filter((item) => item.value === answers.propertyType) : PROPERTY_TYPES;
        const costs = this.getCostProfile('ev');
        const coastalProvinces = ['Antalya', 'Muğla', 'İzmir', 'Aydın', 'Balıkesir', 'Çanakkale', 'Mersin', 'Trabzon', 'Rize', 'Sakarya', 'Kocaeli', 'İstanbul'];
        const metroProvinces = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Kocaeli', 'Adana', 'Konya'];

        return selectedTypes.map((type, index) => {
            const coastal = coastalProvinces.includes(province);
            const metro = metroProvinces.includes(province);
            const multiplier = type.value === 'daire' ? 1 : type.value === 'yazlik' ? costs.yazlikMultiplier : type.value === 'mustakil' ? costs.mustakilMultiplier : costs.villaMultiplier;
            const base = (metro ? costs.metroBasePrice : costs.standardBasePrice) * multiplier + index * costs.indexStep;
            const locationProfile = coastal ? 'Sahil/turizm etkisi yüksek' : metro ? 'Büyükşehir erişimi güçlü' : 'Sakin ve geniş yaşam alanı';
            const useProfile = type.value === 'daire' ? 'oturum ve yatırım likiditesi' : type.value === 'yazlik' ? 'sezonluk kullanım ve kira potansiyeli' : type.value === 'mustakil' ? 'bağımsız yaşam ve bakım sorumluluğu' : 'prestij ve yüksek konfor';
            return {
                name: `${locationLabel} ${type.label}`,
                price: Math.round(base),
                scoreNote: locationLabel + ' içinde ' + type.label.toLocaleLowerCase('tr-TR') + ' seçeneği; ' + useProfile + ', yıllık gider ve kredi yüküyle değerlendirildi.',
                details: [
                    { label: 'Emlak tipi', value: type.label },
                    { label: 'Lokasyon', value: locationLabel },
                    { label: 'Bölge profili', value: locationProfile },
                    { label: 'Kullanım yorumu', value: useProfile },
                    { label: 'Aidat/bakım', value: type.value === 'daire' ? 'Aidat odaklı' : 'Bakım/peyzaj odaklı' },
                    { label: 'Kredi tipi', value: 'Konut kredisi simülasyonu' }
                ],
                realisticComment: locationLabel + ' ' + type.label + ' için sonuç, tahmini alım bedeli, aidat/bakım yükü, DASK-konut sigortası ve emlak vergisiyle birlikte hesaplandı. Tapu kaydı, imar durumu, deprem performansı, aidat geçmişi ve bölgesel m2 fiyatı gerçek alım öncesi doğrulanmalı.',
                match: {
                    province,
                    district,
                    propertyType: type.value,
                    purpose: type.value === 'daire' ? ['live', 'investment'] : type.value === 'yazlik' ? ['seasonal', 'investment'] : ['live', 'premium', 'seasonal'],
                    budget: ['3500000', '6500000', '12000000', '25000000'],
                    location: coastal ? ['coastal', 'premiumArea', 'quiet'] : metro ? ['central', 'premiumArea'] : ['quiet', 'central'],
                    priority: type.value === 'daire' ? ['lowMonthly', 'valueGrowth', 'maintenance'] : ['comfort', 'valueGrowth']
                },
                costs: [
                    { label: type.value === 'daire' ? 'Yıllık aidat' : 'Bakım/peyzaj', value: type.value === 'villa' ? costs.villaMaintenance : type.value === 'mustakil' ? costs.detachedMaintenance : costs.apartmentDues },
                    { label: 'DASK + konut sigortası', value: Math.round(base * costs.insuranceRate) },
                    { label: 'Emlak vergisi', value: Math.round(base * costs.propertyTaxRate) },
                    { label: 'Yenileme payı', value: type.value === 'daire' ? costs.apartmentRenewal : costs.houseRenewal }
                ],
                channels: [
                    { label: `${type.label} ilanlarını gör`, url: 'https://www.sahibinden.com/emlak' },
                    { label: 'Konut kredisi karşılaştır', url: 'https://www.hangikredi.com/kredi/konut-kredisi' },
                    { label: 'Tapu işlem rehberi', url: 'https://www.tkgm.gov.tr/' }
                ]
            };
        });
    }

    getVacationDecisionOptions(answers) {
        const province = answers.province || 'Türkiye';
        const district = answers.district || '';
        const districtLabel = district || 'Tüm ilçeler';
        const costs = this.getCostProfile('tatil');
        const requestedPlace = answers.vacationPlace && answers.vacationPlace !== 'any' ? answers.vacationPlace.split('|')[2] : null;
        let places = this.catalog.vacationPlaces.filter((item) => item.province === province && (!district || item.district === district));
        if (requestedPlace) {
            places = places.filter((item) => item.name === requestedPlace);
        }

        if (!places.length) {
            places = [{ province, district: districtLabel, name: `${this.formatLocationLabel(province, district)} özel tatil planı`, types: [answers.vacationType || 'culture', answers.priority || 'quiet'] }];
        }

        return places.map((placeItem, index) => {
            const luxury = placeItem.types.includes('luxury') || answers.priority === 'premium';
            const nature = placeItem.types.includes('nature') || answers.priority === 'quiet';
            const family = placeItem.types.includes('familyResort') || answers.travelers === 'family';
            const price = family ? costs.familyBasePrice : luxury ? costs.luxuryBasePrice : nature ? costs.natureBasePrice : costs.cultureBasePrice;
            const vacationProfile = luxury ? 'Lüks/üst segment' : nature ? 'Doğa ve sakinlik' : family ? 'Aile ve her şey dahil' : 'Kültür/deneyim odaklı';
            const packageScope = family ? 'Konaklama + ulaşım + transfer' : luxury ? 'Üst segment konaklama + özel transfer' : nature ? 'Konaklama + ulaşım/araç + aktivite' : 'Uçuş/ulaşım + konaklama + deneyim';
            return {
                name: placeItem.name,
                price: price + index * costs.placeStep,
                scoreNote: placeItem.province + '/' + placeItem.district + ' içinde ' + vacationProfile.toLocaleLowerCase('tr-TR') + ' beklentisi; konaklama, ulaşım, aktivite ve sigorta toplamıyla değerlendirildi.',
                details: [
                    { label: 'Rota', value: placeItem.name },
                    { label: 'Lokasyon', value: placeItem.province + '/' + placeItem.district },
                    { label: 'Tatil profili', value: vacationProfile },
                    { label: 'Paket kapsamı', value: packageScope },
                    { label: 'Yolcu profili', value: answers.travelers ? this.getTravelerLabel(answers.travelers) : 'Esnek' },
                    { label: 'Rezervasyon notu', value: 'İptal koşulu ve sezon fiyatı kontrol edilmeli' }
                ],
                realisticComment: placeItem.name + ' önerisi, ' + packageScope.toLocaleLowerCase('tr-TR') + ' varsayımıyla toplam tatil bütçesi üzerinden hesaplandı. Sezon, uçuş saati, oda tipi, iptal koşulu ve çocuk/ek kişi ücretleri gerçek rezervasyonda sonucu ciddi değiştirebilir.',
                match: {
                    province: placeItem.province,
                    district: placeItem.district,
                    vacationPlace: answers.vacationPlace || 'any',
                    vacationType: placeItem.types,
                    destination: ['mediterranean', 'europe', 'blackSea', 'island'],
                    travelers: ['solo', 'couple', 'family', 'group'],
                    budget: ['60000', '120000', '220000', '400000'],
                    priority: luxury ? ['premium', 'quiet'] : nature ? ['quiet', 'experience'] : ['allInclusive', 'experience']
                },
                costs: [
                    { label: 'Konaklama', value: Math.round(price * costs.accommodationRatio) },
                    { label: 'Ulaşım', value: Math.round(price * costs.transportRatio) },
                    { label: 'Aktivite/transfer', value: Math.round(price * costs.activityRatio) },
                    { label: 'Sigorta', value: Math.round(price * costs.insuranceRatio) }
                ],
                channels: [
                    { label: 'Tatil paketlerini gör', url: 'https://www.etstur.com/' },
                    { label: 'Uçak/ulaşım karşılaştır', url: 'https://www.enuygun.com/' },
                    { label: 'Konaklama seçenekleri', url: 'https://www.otelz.com/' }
                ]
            };
        });
    }

    calculateAssistantScores(categoryConfig, answers) {
        return this.getContextualDecisionOptions(categoryConfig, answers).map((option) => {
            let score = 52;
            const scoreBreakdown = [];

            categoryConfig.questions.forEach((question) => {
                if (question.id === 'budget') return;

                const answer = answers[question.id];
                const matchValue = option.match?.[question.id];
                if (!answer || !matchValue) return;

                const matched = Array.isArray(matchValue) ? matchValue.includes(answer) : matchValue === answer;
                const delta = matched ? Number(question.weight || 8) : -3;
                score += delta;
                scoreBreakdown.push({
                    label: question.label,
                    status: matched ? 'Güçlü eşleşme' : 'Zayıf eşleşme',
                    delta,
                    positive: matched
                });
            });

            const budget = Number(answers.budget);
            if (Number.isFinite(budget) && budget > 0) {
                if (option.price <= budget) {
                    score += 8;
                    scoreBreakdown.push({ label: 'Bütçe uyumu', status: 'Bütçe içinde', delta: 8, positive: true });
                } else {
                    const overBudgetRatio = (option.price - budget) / Math.max(budget, 1);
                    const delta = -Math.min(28, Math.ceil(overBudgetRatio * 45));
                    score += delta;
                    scoreBreakdown.push({ label: 'Bütçe uyumu', status: 'Bütçe üstü', delta, positive: false });
                }
            } else {
                scoreBreakdown.push({ label: 'Bütçe uyumu', status: 'Bütçe sınırı yok', delta: 4, positive: true });
                score += 4;
            }

            const yearlyCost = this.sumOptionCosts(option.costs);
            const financeComparisons = this.createFinanceComparisons(option.price, this.assistantCategory);
            const report = this.createCategoryDecisionReport(option, this.assistantCategory, answers, financeComparisons, yearlyCost);
            const sourceTrace = this.createRecommendationSourceTrace(this.assistantCategory, option, financeComparisons);
            const costRatio = yearlyCost / Math.max(option.price, 1);
            if (costRatio < 0.055) {
                score += 5;
                scoreBreakdown.push({ label: 'Dönemsel gider', status: 'Kontrollü maliyet', delta: 5, positive: true });
            } else if (costRatio > 0.12) {
                score -= 6;
                scoreBreakdown.push({ label: 'Dönemsel gider', status: 'Yüksek yan maliyet', delta: -6, positive: false });
            }

            const normalizedScore = Math.max(20, Math.min(99, Math.round(score)));

            return {
                ...option,
                score: normalizedScore,
                yearlyCost,
                financeComparisons,
                details: report.details,
                calculationTable: report.calculationTable,
                costChart: report.costChart,
                realisticComment: report.realisticComment,
                sourceTrace,
                scoreBreakdown: scoreBreakdown
                    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
                    .slice(0, 5),
                riskLevel: this.getDecisionRiskLevel(normalizedScore, costRatio),
                decisionTags: this.getDecisionTags(option, normalizedScore, costRatio, financeComparisons)
            };
        }).sort((a, b) => b.score - a.score || a.yearlyCost - b.yearlyCost);
    }

    getDecisionRiskLevel(score, costRatio) {
        if (score >= 86 && costRatio < 0.09) return 'Düşük risk';
        if (score >= 72 && costRatio < 0.14) return 'Kontrollü risk';
        return 'Dikkat gerektirir';
    }

    getDecisionTags(option, score, costRatio, financeComparisons = []) {
        const tags = [];
        if (score >= 86) tags.push('Güçlü eşleşme');
        if (costRatio < 0.07) tags.push('Düşük yan maliyet');
        if (financeComparisons[0]?.monthlyPayment) tags.push('Finansman hazır');
        if (option.channels?.length >= 3) tags.push('Kaynaklı öneri');
        return tags.slice(0, 4);
    }

    createDecisionDataHealth(categoryId, recommendations = []) {
        const sources = this.getCategorySourceRegistry(categoryId);
        const readySources = sources.filter((source) => source.status === 'ready');
        const financeProducts = this.getFinanceProducts(categoryId);
        const liveProvidersEnabled = Boolean(this.marketData.integrations?.liveProvidersEnabled);
        const sourceCoverage = sources.length ? readySources.length / sources.length : 0;
        const sourceScore = Math.round(sourceCoverage * 34);
        const sourceVolumeScore = Math.min(18, readySources.length * 6);
        const financeScore = Math.min(22, financeProducts.length * 6 + readySources.filter((source) => source.type === 'finance').length * 4);
        const calculationScore = recommendations.length ? 18 : 6;
        const liveScore = liveProvidersEnabled ? 14 : 4;
        let confidenceScore = sourceScore + sourceVolumeScore + financeScore + calculationScore + liveScore;
        if (!liveProvidersEnabled) {
            confidenceScore = Math.min(confidenceScore, 68);
        }
        confidenceScore = Math.max(42, Math.min(liveProvidersEnabled ? 92 : 72, confidenceScore));

        return {
            confidenceScore,
            confidenceLabel: liveProvidersEnabled
                ? this.getDataConfidenceLabel(confidenceScore)
                : 'Referans simülasyonu — canlı ilan doğrulaması önerilir',
            modeLabel: liveProvidersEnabled ? 'Canlı sağlayıcı modu' : 'Simülasyon + doğrulama modu',
            updatedAt: this.marketData.updatedAt,
            updatedAtLabel: this.formatDataFreshness(this.marketData.updatedAt),
            providerNote: this.marketData.integrations?.note || 'Kaynak ve maliyet verileri yönetilebilir veri merkezinden alınır.',
            sourceCount: sources.length,
            readySourceCount: readySources.length,
            financeProductCount: financeProducts.length,
            calculationCount: recommendations.reduce((total, item) => total + (item.calculationTable?.rows?.length || 0), 0),
            liveProvidersEnabled,
            sources: readySources.slice(0, 6).map((source) => ({
                name: source.name,
                type: this.getSourceTypeLabel(source.type),
                status: this.getSourceStatusLabel(source.status),
                cadence: source.cadence,
                url: source.url
            }))
        };
    }

    createRecommendationSourceTrace(categoryId, option, financeComparisons = []) {
        const sources = this.getCategorySourceRegistry(categoryId);
        const readySources = sources.filter((source) => source.status === 'ready');
        const costCount = Array.isArray(option.costs) ? option.costs.length : 0;
        return {
            mode: this.marketData.integrations?.liveProvidersEnabled ? 'Canlı veriyle hesaplandı' : 'Tahmini veri + kaynak doğrulaması',
            updatedAtLabel: this.formatDataFreshness(this.marketData.updatedAt),
            sourceSummary: readySources.length + '/' + Math.max(sources.length, 1) + ' kategori kaynağı hazır',
            calculationSummary: 'Ana fiyat, ' + costCount + ' maliyet kalemi ve ' + financeComparisons.length + ' kredi ürünü işlendi',
            sources: readySources.slice(0, 4).map((source) => ({
                name: source.name,
                type: this.getSourceTypeLabel(source.type),
                status: this.getSourceStatusLabel(source.status),
                url: source.url
            }))
        };
    }

    getCategorySourceRegistry(categoryId) {
        const sources = Array.isArray(this.marketData.sourceRegistry) ? this.marketData.sourceRegistry : [];
        return sources.filter((source) => source.category === categoryId || source.category === 'genel');
    }

    getDataConfidenceLabel(score) {
        if (score >= 88) return 'Yüksek veri güven bandı';
        if (score >= 78) return 'İyi veri güven bandı';
        if (score >= 66) return 'Orta veri güven bandı';
        return 'Sınırlı veri — kontrol önerilir';
    }

    getSourceTypeLabel(type) {
        const labels = {
            listing: 'İlan kaynağı',
            finance: 'Kredi kaynağı',
            insurance: 'Sigorta kaynağı',
            travel: 'Tatil/ulaşım kaynağı'
        };
        return labels[type] || 'Veri kaynağı';
    }

    getSourceStatusLabel(status) {
        const labels = {
            ready: 'Hazır',
            pending: 'Bekliyor',
            disabled: 'Kapalı'
        };
        return labels[status] || 'Kontrol gerekli';
    }

    formatDataFreshness(updatedAt) {
        if (!updatedAt) return 'Güncelleme tarihi yok';
        const updatedDate = new Date(updatedAt);
        if (Number.isNaN(updatedDate.getTime())) return 'Güncelleme tarihi okunamadı';
        const ageMs = Date.now() - updatedDate.getTime();
        const dayMs = 86400000;
        if (ageMs < dayMs) return 'Bugün güncellendi';
        const days = Math.max(1, Math.round(ageMs / dayMs));
        return days + ' gün önce güncellendi';
    }


    createCategoryDecisionReport(option, categoryId, answers, financeComparisons = [], periodicCost = 0) {
        const bestFinance = financeComparisons[0];
        const costChart = this.createCostChartData(option.costs);
        const details = Array.isArray(option.details) ? option.details : [];
        const tableRows = this.createCategoryCalculationRows(option, categoryId, bestFinance, periodicCost);

        return {
            details,
            costChart,
            realisticComment: option.realisticComment || this.createFallbackRealisticComment(option, categoryId),
            calculationTable: {
                title: this.getCategoryCalculationTitle(categoryId),
                note: this.getCategoryCalculationNote(categoryId),
                rows: tableRows,
                totalLabel: this.getCategoryTotalLabel(categoryId),
                totalValue: periodicCost
            }
        };
    }

    createCategoryCalculationRows(option, categoryId, bestFinance, periodicCost) {
        const baseRows = (option.costs || []).map((cost) => ({
            label: cost.label,
            value: Number(cost.value || 0),
            note: this.getCostRowNote(categoryId, cost.label)
        }));

        const financeRows = bestFinance ? [
            { label: 'Kullanılan kredi tutarı', value: bestFinance.principal, note: bestFinance.bank + ' için tahmini kredi ana parası' },
            { label: 'Aylık ödeme', value: bestFinance.monthlyPayment, note: bestFinance.term + ' ay vade, aylık %' + bestFinance.rate },
            { label: 'Toplam geri ödeme', value: bestFinance.totalPayment, note: 'Faiz dahil simülasyon toplamı' }
        ] : [];

        const purchaseLabel = categoryId === 'arac' ? 'Tahmini araç bedeli' : categoryId === 'ev' ? 'Tahmini alım bedeli' : 'Tahmini paket bedeli';
        return [
            { label: purchaseLabel, value: option.price, note: this.getPurchaseRowNote(categoryId) },
            ...baseRows,
            { label: this.getCategoryTotalLabel(categoryId), value: periodicCost, note: this.getCategoryTotalNote(categoryId) },
            ...financeRows
        ];
    }

    createCostChartData(costs = []) {
        const total = Math.max(1, this.sumOptionCosts(costs));
        return costs.map((cost) => ({
            label: cost.label,
            value: Number(cost.value || 0),
            percent: Math.max(4, Math.round((Number(cost.value || 0) / total) * 100))
        }));
    }

    getCategoryCalculationTitle(categoryId) {
        const titles = {
            arac: 'Araç sahip olma maliyeti tablosu',
            ev: 'Konut alım ve yıllık gider tablosu',
            tatil: 'Tatil paket ve seyahat gider tablosu'
        };
        return titles[categoryId] || 'Karar maliyeti tablosu';
    }

    getCategoryCalculationNote(categoryId) {
        const notes = {
            arac: 'Araçta fiyat kadar yakıt/enerji, kasko, trafik sigortası ve bakım toplamı önemlidir.',
            ev: 'Evde alım bedeline ek olarak aidat/bakım, sigorta, vergi ve yenileme payı hesaplanır.',
            tatil: 'Tatilde yalnızca paket fiyatı değil ulaşım, aktivite/transfer ve sigorta da toplam bütçeye girer.'
        };
        return notes[categoryId] || 'Seçilen kategoriye göre maliyet kalemleri ayrıştırıldı.';
    }

    getCategoryTotalLabel(categoryId) {
        const labels = {
            arac: 'Yıllık sahip olma maliyeti',
            ev: 'Yıllık konut gideri',
            tatil: 'Toplam tatil maliyeti'
        };
        return labels[categoryId] || 'Toplam dönemsel maliyet';
    }

    getCategoryTotalNote(categoryId) {
        const notes = {
            arac: 'Yakıt/enerji, sigorta, kasko ve bakım toplamı',
            ev: 'Aidat/bakım, sigorta, vergi ve yenileme payı toplamı',
            tatil: 'Konaklama, ulaşım, aktivite/transfer ve sigorta toplamı'
        };
        return notes[categoryId] || 'Dönemsel maliyet toplamı';
    }

    getPurchaseRowNote(categoryId) {
        const notes = {
            arac: 'Seçilen marka/model için tahmini liste/ilan aralığı',
            ev: 'Seçilen il ve mülk tipine göre tahmini alım bedeli',
            tatil: 'Seçilen rota ve tatil profiline göre tahmini paket bütçesi'
        };
        return notes[categoryId] || 'Tahmini ana bedel';
    }

    getCostRowNote(categoryId, label = '') {
        if (categoryId === 'arac') {
            if (/yakıt|enerji/i.test(label)) return 'Kullanım tipine göre yıllık enerji/yakıt varsayımı';
            if (/kasko/i.test(label)) return 'Araç fiyatı ve segment katsayısı üzerinden tahmin';
            if (/trafik/i.test(label)) return 'Zorunlu trafik sigortası varsayımı';
            return 'Periyodik servis ve bakım varsayımı';
        }

        if (categoryId === 'ev') {
            if (/aidat|bakım|peyzaj/i.test(label)) return 'Site/bağımsız yaşam gider profili';
            if (/sigorta|dask/i.test(label)) return 'Konut bedeli üzerinden sigorta varsayımı';
            if (/vergi/i.test(label)) return 'Emlak vergisi oranı simülasyonu';
            return 'Yıllık yenileme ve küçük bakım payı';
        }

        if (/konaklama/i.test(label)) return 'Oda/paket varsayımı';
        if (/ulaşım/i.test(label)) return 'Uçuş, araç veya transfer varsayımı';
        if (/aktivite|transfer/i.test(label)) return 'Yerel ulaşım ve deneyim bütçesi';
        return 'Seyahat sigortası ve beklenmeyen gider payı';
    }

    createFallbackRealisticComment(option, categoryId) {
        if (categoryId === 'arac') return option.name + ' için sonuç tahmini fiyat, yıllık gider ve finansman yükü üzerinden üretilmiştir. Gerçek ilan, ekspertiz ve sigorta teklifiyle doğrulanmalıdır.';
        if (categoryId === 'ev') return option.name + ' için sonuç alım bedeli, yıllık konut giderleri ve kredi simülasyonuna göre üretilmiştir. Tapu, imar, deprem ve aidat bilgileri kontrol edilmelidir.';
        return option.name + ' için sonuç paket bütçesi, ulaşım ve ek giderlere göre üretilmiştir. Sezon, oda tipi ve iptal koşulları kontrol edilmelidir.';
    }

    getVehicleFuelLabel(fuel) {
        const labels = { electric: 'Elektrikli', hybrid: 'Hibrit', diesel: 'Dizel', gasoline: 'Benzinli' };
        return labels[fuel] || fuel;
    }

    getVehicleBodyLabel(body) {
        const labels = { suv: 'SUV', sedan: 'Sedan', hatchback: 'Hatchback', mpv: 'Geniş aile/MPV' };
        return labels[body] || body;
    }

    getTravelerLabel(travelers) {
        const labels = { solo: 'Tek kişi', couple: '2 kişi', family: 'Aile', group: 'Grup' };
        return labels[travelers] || travelers;
    }

    sumOptionCosts(costs = []) {
        return costs.reduce((total, cost) => total + Number(cost.value || 0), 0);
    }

    getDefaultFinanceProducts() {
        return this.marketData.financeProducts;
    }

    getCostProfile(categoryId) {
        return getCostProfileForCategory(this.marketData, categoryId);
    }

    getFinanceProducts(categoryId) {
        return getFinanceProductsForCategory(this.marketData, categoryId);
    }

    createFinanceComparisons(price, categoryId) {
        return this.getFinanceProducts(categoryId).map((product) => {
            const principal = Math.round(price * product.ratio);
            const monthlyPayment = this.calculateMonthlyPayment(principal, product.rate, product.term);
            return {
                ...product,
                principal,
                monthlyPayment,
                totalPayment: monthlyPayment * product.term
            };
        }).sort((a, b) => a.monthlyPayment - b.monthlyPayment);
    }

    calculateMonthlyPayment(principal, monthlyRatePercent, term) {
        const rate = monthlyRatePercent / 100;
        if (!rate) return Math.round(principal / term);
        const payment = principal * (rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1);
        return Math.round(payment);
    }

    createDecisionSummary(categoryConfig, primary) {
        if (!primary) return 'Cevaplarınıza göre yeterli sonuç üretilemedi.';
        const locationText = primary.match?.province && primary.match?.district ? `${primary.match.province}/${primary.match.district} için ` : '';
        return `${categoryConfig.name} kategorisinde ${locationText}en güçlü eşleşme ${primary.name}. ${primary.scoreNote} Toplam dönemsel maliyet ve kredi yükü birlikte değerlendirildiğinde karar skoru ${primary.score}/100.`;
    }

    getUserHistoryStorageKey(baseKey) {
        return this.currentUser?.id ? baseKey + ':' + this.currentUser.id : null;
    }

    loadDecisionHistory() {
        try {
            const storageKey = this.getUserHistoryStorageKey(STORAGE_KEYS.DECISION_HISTORY);
            if (!storageKey) {
                this.decisionHistory = [];
                this.ui.renderHistoryAuthGate?.();
                return;
            }

            this.decisionHistory = this.readStoredArray(storageKey);
            this.ui.renderDecisionHistory?.(this.decisionHistory);
            this.injectDecisionHistoryUpsell();
            this.injectDecisionHistoryProductFeedback();
        } catch (error) {
            console.warn('loadDecisionHistory failed:', error);
            this.decisionHistory = this.decisionHistory || [];
        }
    }

    async injectDecisionHistoryProductFeedback() {
        const container = document.getElementById('history-list');
        if (!container || !this.decisionHistory?.length) return;
        try {
            const { mountHistoryProductFeedback } = await import('./features/moat/product-feedback.js');
            if (container.querySelector('[data-product-feedback]')) return;
            const latestAuto = this.decisionHistory.find((item) => item.categoryId === 'auto');
            mountHistoryProductFeedback(container, {
                form: latestAuto?.rawAnswers || {},
                matchScore: latestAuto?.topPick?.score ?? null
            });
        } catch {
            /* optional module */
        }
    }

    saveDecisionHistory(result) {
        const storageKey = this.getUserHistoryStorageKey(STORAGE_KEYS.DECISION_HISTORY);
        if (!storageKey) {
            this.decisionHistory = [];
            return false;
        }

        const topPick = result.recommendations[0];
        const record = {
            id: result.id,
            categoryId: result.categoryId,
            categoryName: result.categoryName,
            createdAt: result.createdAt,
            rawAnswers: result.rawAnswers,
            answers: result.answers,
            summary: result.summary,
            insight: result.insight,
            dataHealth: result.dataHealth,
            topPick: topPick ? {
                name: topPick.name,
                score: topPick.score,
                price: topPick.price,
                yearlyCost: topPick.yearlyCost,
                monthlyPayment: topPick.financeComparisons?.[0]?.monthlyPayment || 0
            } : null,
            recommendations: result.recommendations.map((item) => ({
                name: item.name,
                score: item.score,
                price: item.price,
                yearlyCost: item.yearlyCost
            }))
        };

        const history = this.readStoredArray(storageKey);
        const filtered = [record, ...history.filter((item) => item.id !== record.id)].slice(0, 12);
        this.writeStoredValue(storageKey, filtered);
        this.decisionHistory = filtered;
        this.ui.renderDecisionHistory?.(this.decisionHistory);
        this.injectDecisionHistoryUpsell();
        this.saveSearchHistory(`Karar Asistanı: ${result.categoryName} - ${topPick?.name || 'Sonuç'}`);
        return true;
    }

    injectDecisionHistoryUpsell() {
        if (revenueManager.isPremium || !this.decisionHistory?.length) return;
        const container = document.getElementById('history-list');
        if (!container || !shouldShowUpsell('decision_history')) return;
        if (container.querySelector('[data-upsell-offer="decision_history"]')) return;
        const slot = document.createElement('div');
        slot.innerHTML = renderContextualUpsellCard('decision_history', 'decision_history');
        const card = slot.firstElementChild;
        if (card) {
            container.prepend(card);
            bindContextualUpsell(container);
        }
    }

    repeatDecision(decisionId) {
        const record = this.decisionHistory.find((item) => item.id === decisionId);
        if (!record) {
            this.ui.showError('Kaydedilen karar bulunamadı.');
            return;
        }

        if (record.categoryId === 'auto') {
            window.location.href = '/auto/';
            return;
        }

        if (!this.decisionAssistant[record.categoryId]) {
            this.ui.showError('Kaydedilen karar bulunamadı.');
            return;
        }

        this.assistantCategory = record.categoryId;
        this.assistantAnswers = record.rawAnswers || {};
        this.assistantStep = Math.max(this.getAssistantWizardSteps(this.getResolvedDecisionAssistantConfig()[this.assistantCategory]).length - 1, 0);
        this.router.navigate('/karar-asistani');
        this.renderDecisionAssistant();
        const result = this.buildDecisionResult(this.getResolvedDecisionAssistantConfig()[this.assistantCategory], this.assistantAnswers);
        this.lastDecisionResult = result;
        this.ui.renderDecisionResults?.(result);
    }

    deleteDecision(decisionId) {
        const storageKey = this.getUserHistoryStorageKey(STORAGE_KEYS.DECISION_HISTORY);
        if (!storageKey) {
            this.ui.showError('Geçmişi düzenlemek için giriş yapın.');
            return;
        }

        this.decisionHistory = this.decisionHistory.filter((item) => item.id !== decisionId);
        this.writeStoredValue(storageKey, this.decisionHistory);
        this.ui.renderDecisionHistory?.(this.decisionHistory);
        this.ui.showSuccess('Karar geçmişten silindi.');
    }


    renderAdminDashboard() {
        this.marketData = this.createMarketData();
        const financeProducts = this.getDefaultFinanceProducts();
        const decisionHistoryKey = this.getUserHistoryStorageKey(STORAGE_KEYS.DECISION_HISTORY);
        const decisionCount = decisionHistoryKey ? this.readStoredArray(decisionHistoryKey).length : 0;
        const districtCount = getProvinceOptions().reduce((total, province) => total + getDistrictOptions(province.value).length, 0);
        const stats = getMarketStats(this.marketData, this.catalog, this.decisionAssistant, decisionCount, districtCount);
        const sourceHealth = getSourceHealth(this.marketData);

        this.ui.renderAdminDashboard(this.decisionAssistant, financeProducts, stats, this.marketData, sourceHealth);
    }


    setupListingFilterControls(form = document.getElementById('listing-filter-form')) {
        if (!form) return;
        const provinceSelect = form.querySelector('#filter-province');
        const brandSelect = form.querySelector('#filter-vehicle-brand');
        const propertyTypeSelect = form.querySelector('#filter-property-type');

        if (provinceSelect && provinceSelect.options.length <= 1) {
            provinceSelect.innerHTML = '<option value="">Türkiye geneli</option>' + getProvinceOptions().map((option) => '<option value="' + option.value + '">' + option.label + '</option>').join('');
        }

        if (brandSelect && brandSelect.options.length <= 1) {
            const brands = [...new Set(this.catalog.carModels.map((item) => item.brand))].sort((a, b) => a.localeCompare(b, 'tr'));
            brandSelect.innerHTML = '<option value="">Tüm markalar</option>' + brands.map((brand) => '<option value="' + brand + '">' + brand + '</option>').join('');
        }

        if (propertyTypeSelect && propertyTypeSelect.options.length <= 1) {
            propertyTypeSelect.innerHTML = '<option value="">Tüm ev tipleri</option>' + PROPERTY_TYPES.map((type) => '<option value="' + type.value + '">' + type.label + '</option>').join('');
        }

        form.querySelector('#filter-category')?.addEventListener('change', () => this.syncListingFilterControls(form));
        form.querySelector('#filter-province')?.addEventListener('change', () => this.syncListingFilterControls(form, { resetDistrict: true }));
        this.syncListingFilterControls(form);
    }

    syncListingFilterControls(form = document.getElementById('listing-filter-form'), options = {}) {
        if (!form) return;
        const category = form.querySelector('#filter-category')?.value || '';
        const province = form.querySelector('#filter-province')?.value || '';
        const districtSelect = form.querySelector('#filter-district');

        if (districtSelect) {
            const currentDistrict = options.resetDistrict ? '' : districtSelect.value;
            const districtOptions = province ? getDistrictOptions(province) : [];
            districtSelect.innerHTML = '<option value="">Tüm ilçeler</option>' + districtOptions.map((district) => '<option value="' + district.value + '">' + district.label + '</option>').join('');
            districtSelect.disabled = !province;
            if (currentDistrict && districtOptions.some((district) => district.value === currentDistrict)) {
                districtSelect.value = currentDistrict;
            }
        }

        form.querySelectorAll('[data-filter-scope]').forEach((field) => {
            const shouldShow = Boolean(category) && field.dataset.filterScope === category;
            field.hidden = !shouldShow;
            if (!shouldShow) {
                const input = field.querySelector('select, input');
                if (input) input.value = '';
            }
        });
    }

    renderListingFilterSummary(options = {}) {
        const container = document.getElementById('active-filter-summary');
        if (!container) return;
        const chips = this.getListingFilterChips(options);
        container.replaceChildren();
        container.hidden = chips.length === 0;
        if (!chips.length) return;

        const label = document.createElement('strong');
        label.textContent = 'Aktif filtreler';
        container.appendChild(label);
        chips.forEach((chip) => {
            const item = document.createElement('span');
            item.textContent = chip;
            container.appendChild(item);
        });
    }

    getListingFilterChips(options = {}) {
        const chips = [];
        const categoryLabel = options.category ? this.getCategoryName(options.category) : '';
        const locationLabel = options.province ? options.province + (options.district ? '/' + options.district : ' geneli') : '';
        const detailLabel = options.vehicleBrand || this.getPropertyTypeLabel(options.propertyType) || this.getVacationTypeLabel(options.vacationType);
        if (categoryLabel) chips.push(categoryLabel);
        if (locationLabel) chips.push(locationLabel);
        if (detailLabel) chips.push(detailLabel);
        if (options.minPrice) chips.push('Min ' + this.formatCurrency(options.minPrice));
        if (options.maxPrice) chips.push('Max ' + this.formatCurrency(options.maxPrice));
        if (options.search) chips.push('Arama: ' + options.search);
        return chips;
    }

    getPropertyTypeLabel(propertyType) {
        return PROPERTY_TYPES.find((type) => type.value === propertyType)?.label || '';
    }

    getVacationTypeLabel(vacationType) {
        const labels = {
            familyResort: 'Aile / her şey dahil',
            luxury: 'Lüks / premium',
            nature: 'Doğa / sakinlik',
            culture: 'Kültür / deneyim'
        };
        return labels[vacationType] || '';
    }

    parseMarketDataValue(section, field, value) {
        const trimmedValue = value?.toString().trim() || '';
        const numericFields = ['rate', 'term', 'ratio'];
        if (section === 'cost' || numericFields.includes(field)) {
            const numberValue = Number(trimmedValue);
            return Number.isFinite(numberValue) ? numberValue : 0;
        }

        return trimmedValue;
    }

    handleAdminMarketSubmit(form) {
        const formData = new FormData(form);
        const nextMarketData = JSON.parse(JSON.stringify(this.marketData || this.createMarketData()));
        nextMarketData.financeProducts = nextMarketData.financeProducts || {};
        nextMarketData.costProfiles = nextMarketData.costProfiles || {};
        nextMarketData.sourceRegistry = Array.isArray(nextMarketData.sourceRegistry) ? nextMarketData.sourceRegistry : [];

        formData.forEach((value, key) => {
            const [section, categoryOrIndex, indexOrKey, field] = key.split(':');

            if (section === 'finance') {
                const categoryId = categoryOrIndex;
                const productIndex = Number(indexOrKey);
                if (!nextMarketData.financeProducts[categoryId]) nextMarketData.financeProducts[categoryId] = [];
                if (!nextMarketData.financeProducts[categoryId][productIndex]) nextMarketData.financeProducts[categoryId][productIndex] = {};
                nextMarketData.financeProducts[categoryId][productIndex][field] = this.parseMarketDataValue(section, field, value);
                return;
            }

            if (section === 'cost') {
                const categoryId = categoryOrIndex;
                const costKey = indexOrKey;
                if (!nextMarketData.costProfiles[categoryId]) nextMarketData.costProfiles[categoryId] = {};
                nextMarketData.costProfiles[categoryId][costKey] = this.parseMarketDataValue(section, costKey, value);
                return;
            }

            if (section === 'source') {
                const sourceIndex = Number(categoryOrIndex);
                const sourceField = indexOrKey;
                if (!nextMarketData.sourceRegistry[sourceIndex]) nextMarketData.sourceRegistry[sourceIndex] = {};
                nextMarketData.sourceRegistry[sourceIndex][sourceField] = this.parseMarketDataValue(section, sourceField, value);
            }
        });

        this.marketData = saveMarketData(nextMarketData);
        this.renderAdminDashboard();
        this.renderDecisionAssistant();
        this.ui.showSuccess('Veri merkezi ayarları kaydedildi.');
    }

    handleAdminMarketAction(action) {
        if (action === 'refresh') {
            this.marketData = this.createMarketData();
            this.renderAdminDashboard();
            this.ui.showSuccess('Veri merkezi yenilendi.');
            return;
        }

        if (action === 'reset') {
            this.marketData = resetMarketData();
            this.renderAdminDashboard();
            this.ui.showSuccess('Varsayılan veri paketi yüklendi.');
            return;
        }

        if (action === 'export') {
            const exportData = saveMarketData(this.marketData);
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'istebu-market-data.json';
            link.click();
            URL.revokeObjectURL(url);
            this.ui.showSuccess('Veri paketi dışa aktarıldı.');
        }
    }

    async handleSearch() {
        const query = document.getElementById('search-input').value.trim();
        if (!query) return;

        try {
            this.activeCategory = null;
            this.renderCategorySurfaces();
            this.router.navigate('/ilanlar');
            this.ui.showLoading('#listings-grid');

            const searchOptions = { search: query, limit: 20 };
            this.lastListingOptions = searchOptions;
            const listings = await API.getListings(searchOptions);
            this.currentListings = this.sortListings(listings || []);
            this.renderCurrentListings();
            this.renderListingFilterSummary(searchOptions);
            this.saveSearchHistory(query);

            if (!this.currentListings.length) {
                this.ui.showInfo?.('Bu arama için canlı ilan bulunamadı. İsterseniz karar asistanıyla size uygun araç profilini çıkarabiliriz.');
            }
        } catch (error) {
            console.error('Search failed:', error);
            const searchOptions = { search: query, limit: 20 };
            this.lastListingOptions = searchOptions;
            this.currentListings = [];
            this.renderCurrentListings();
            this.renderListingFilterSummary(searchOptions);
            this.ui.showError('Canlı arama şu anda yapılamıyor. Lütfen tekrar deneyin.');
        } finally {
            this.ui.hideLoading('#listings-grid');
        }
    }


    getListingOptionsFromDecisionResult(result = this.lastDecisionResult) {
        if (!result) return null;
        const answers = result.rawAnswers || {};
        const budget = Number(answers.budget || 0) || undefined;
        const options = {
            category: result.categoryId || undefined,
            province: answers.province || undefined,
            district: answers.district || undefined,
            location: answers.province ? answers.province + (answers.district ? '/' + answers.district : '') : undefined,
            maxPrice: budget,
            limit: 20
        };

        if (options.category === 'arac' && answers.carModel && !['any', ''].includes(answers.carModel)) {
            options.vehicleBrand = answers.carModel.split('|')[0] || undefined;
        }
        if (options.category === 'ev') {
            options.propertyType = answers.propertyType || undefined;
        }
        if (options.category === 'tatil') {
            options.vacationType = answers.vacationType || undefined;
        }

        Object.keys(options).forEach((key) => {
            if (options[key] === '' || options[key] === undefined || options[key] === null) delete options[key];
        });
        return options;
    }

    applyListingFilterFormOptions(options = {}) {
        const form = document.getElementById('listing-filter-form');
        if (!form) return;

        const setValue = (selector, value = '') => {
            const field = form.querySelector(selector);
            if (field) field.value = value || '';
        };

        setValue('#filter-category', options.category);
        setValue('#filter-province', options.province);
        this.syncListingFilterControls(form, { resetDistrict: true });
        setValue('#filter-district', options.district);
        this.syncListingFilterControls(form);
        setValue('#filter-vehicle-brand', options.vehicleBrand);
        setValue('#filter-property-type', options.propertyType);
        setValue('#filter-vacation-type', options.vacationType);
        setValue('#filter-min-price', options.minPrice);
        setValue('#filter-max-price', options.maxPrice);
        setValue('#filter-search', options.search);
    }

    async browseDecisionListings() {
        const options = this.getListingOptionsFromDecisionResult();
        if (!options) {
            this.ui.showError('Önce akıllı karar akışından bir sonuç üretin.');
            return;
        }

        this.activeCategory = options.category || null;
        this.renderCategorySurfaces();
        this.router.navigate('/ilanlar');
        this.applyListingFilterFormOptions(options);
        await this.loadListings(options);
        this.saveSearchHistory('Karar sonucu: ' + (this.getListingFilterChips(options).slice(0, 4).join(' / ') || 'Sonuca uygun seçenekler'));
        this.ui.showSuccess('Karar sonucuna uygun ilanlar filtrelendi.');
    }


    getListingFilterOptionsFromForm(form = document.getElementById('listing-filter-form')) {
        if (!form) return { limit: 20 };
        const formData = new FormData(form);
        const category = formData.get('category')?.toString() || undefined;
        const province = formData.get('province')?.toString() || undefined;
        const district = formData.get('district')?.toString() || undefined;
        const options = {
            category,
            province,
            district,
            location: province ? province + (district ? '/' + district : '') : undefined,
            minPrice: Number(formData.get('min_price')) || undefined,
            maxPrice: Number(formData.get('max_price')) || undefined,
            search: formData.get('search')?.toString().trim() || undefined,
            vehicleBrand: category === 'arac' ? formData.get('vehicle_brand')?.toString() || undefined : undefined,
            propertyType: category === 'ev' ? formData.get('property_type')?.toString() || undefined : undefined,
            vacationType: category === 'tatil' ? formData.get('vacation_type')?.toString() || undefined : undefined,
            limit: 20
        };
        Object.keys(options).forEach((key) => {
            if (options[key] === '' || options[key] === undefined || Number.isNaN(options[key])) {
                delete options[key];
            }
        });
        return options;
    }

    async applyListingFiltersFromForm({ silent = false } = {}) {
        const options = this.getListingFilterOptionsFromForm();
        this.activeCategory = options.category || null;
        this.renderCategorySurfaces();
        if (!String(this.router?.currentRoute || '').includes('/ilanlar')) {
            this.router.navigate('/ilanlar');
        }
        const filterForm = document.getElementById('listing-filter-form');
        const filterHint = document.getElementById('listing-filter-auto-hint');
        if (filterForm) {
            filterForm.hidden = false;
            this.syncListingFilterControls(filterForm);
        }
        if (filterHint) filterHint.hidden = false;
        await this.loadListings(options);
        if (!silent) {
            this.saveSearchHistory(
                `Filtre: ${this.getListingFilterChips(options).slice(0, 4).join(' / ') || 'Tüm ilanlar'}`
            );
        }
    }

    async handleListingFilter(event) {
        event.preventDefault();
        await this.applyListingFiltersFromForm({ silent: false });
    }

    async clearListingFilter(form) {
        form.reset();
        this.syncListingFilterControls(form, { resetDistrict: true });
        this.activeCategory = null;
        this.renderCategorySurfaces();
        await this.loadListings();
        this.ui.showSuccess('Filtreler temizlendi.');
    }

    async mountPremiumPage(pageId) {
        const { premiumPages } = await import('./ui/premium-pages.js');
        premiumPages.mount(pageId, this);
    }

    async handlePremiumRoute(route) {
        const map = {
            'page-karar-analizi': 'karar-analizi',
            'page-metodoloji': 'metodoloji',
            'page-planlar': 'planlar'
        };
        const pageId = map[route];
        if (pageId) {
            await this.mountPremiumPage(pageId);
        }
    }

    renderPricingSection() {
        const premiumRoot = document.getElementById('premium-pricing-plans-root');
        const homeRoot = document.querySelector('#pricing #pricing-plans-root');

        if (premiumRoot) {
            premiumRoot.innerHTML = revenueManager.renderPricingCards({ layout: 'premium' });
            revenueManager.initPricingControls(premiumRoot);
        }

        if (homeRoot && homeRoot !== premiumRoot) {
            homeRoot.innerHTML = renderHomePricingTeaser();
        }

        initPricingCardsMotion(document);

        this.ui.loadIcons?.();

        trackPricingView(premiumRoot ? 'planlar' : 'home_pricing');

        if (this.currentUser?.email && !revenueManager.isPremium) {
            trackPricingViewForUpgrade({
                email: this.currentUser.email,
                user_id: this.currentUser.id,
                source: premiumRoot ? 'planlar' : 'home_pricing',
                trigger_source: 'pricing_mount'
            }).catch(() => {});
        }
    }

    handleBillingReturnParams() {
        const params = new URLSearchParams(window.location.search);

            if (params.get('subscribed') === 'true') {
            flushUpsellConversion({ source: 'checkout_return' });
            const billingPlan = params.get('plan') || 'monthly';
            const isTrial = params.get('trial') === '1';
            const returnKey = `return:${this.currentUser?.id || analytics.getSessionId()}:${billingPlan}`;
            trackCheckoutComplete({
                billing_interval: billingPlan,
                trial: isTrial,
                idempotency_key: returnKey
            });
            trackPaidFunnelStep('checkout_complete', { billing_interval: billingPlan, trial: isTrial });
            sendServerPaidConversion('checkout_complete', {
              billing_interval: billingPlan,
              trial: isTrial,
              email: this.currentUser?.email || null
            });
            if (params.get('trial') === '1') {
                this.ui.showSuccess('7 günlük Pro denemeniz başladı. Tüm premium özellikler şimdi açık.');
            } else if (params.get('plan') === 'annual') {
                this.ui.showSuccess('Yıllık Pro aboneliğiniz aktif. İndirimli planla tüm premium özellikler açıldı.');
            } else {
                this.ui.showSuccess('Pro aboneliğiniz aktif. Tüm premium özellikler açıldı.');
            }

            if (this.currentUser?.id) {
                revenueManager.refresh(this.currentUser.id);
            }

            params.delete('subscribed');
            params.delete('trial');
            params.delete('plan');
        }

        if (params.get('cancelled') === 'true') {
            this.ui.showError('Ödeme iptal edildi. İstediğiniz zaman tekrar deneyebilirsiniz.');
            if (this.currentUser?.email) {
                enrollCheckoutAbandonRecovery({
                    email: this.currentUser.email,
                    user_id: this.currentUser.id,
                    reason: 'stripe_cancel_return'
                });
            }
            params.delete('cancelled');
        }

        if (params.has('subscribed') || params.has('cancelled')) {
            const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
            window.history.replaceState(null, '', next);
        }
    }

    async checkForNewDeployment() {
        try {
            const response = await fetch('/build-manifest.json', { cache: 'no-store' });
            if (!response.ok) return;

            const manifest = await response.json();
            const buildId = manifest.builtAt || manifest.files?.length || '';
            if (!buildId) return;

            const storageKey = STORAGE_KEYS.LAST_BUILD_ID;
            const previous = localStorage.getItem(storageKey);

            if (previous && previous !== buildId) {
                this.showUpdateNotification();
            }

            localStorage.setItem(storageKey, buildId);
        } catch {
            // non-blocking
        }
    }

    handleCheckoutDeepLink() {
        const params = new URLSearchParams(window.location.search);
        const wantsCheckout = params.get('checkout') === 'pro';

        if (window.location.hash === '#pricing') {
            document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (wantsCheckout && document.getElementById('premium-pricing-plans-root')) {
            document.getElementById('premium-pricing-plans-root')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (!wantsCheckout) return;

        if (!peekCheckoutIntent()) {
            storeCheckoutIntentPayload({ billing: 'monthly', useTrial: true });
        }

        if (this.currentUser) {
            this.scheduleCheckoutResume(800);
        }
    }

    requestPremiumUpgrade(feature = 'default') {
        if (!revenueManager.canAccess(feature === 'default' ? 'premium_report' : feature)) {
            revenueManager.mountPaywall(feature);
            return false;
        }
        return true;
    }

    resolveCheckoutBilling(event) {
        const trigger = event?.target?.closest?.('[data-upgrade-checkout]');
        let billing = trigger?.dataset?.billing;

        const pricingRoot = document.getElementById('pricing-plans-root');
        if (pricingRoot) {
            billing = pricingRoot.querySelector('input[name="billing-interval"]:checked')?.value || billing;
        }

        const profileRoot = document.getElementById('profil');
        if (profileRoot) {
            billing = profileRoot.querySelector('input[name="profile-billing-interval"]:checked')?.value || billing;
        }

        return billing === 'annual' ? 'annual' : 'monthly';
    }

    storeCheckoutIntent(event) {
        const billingInterval = this.resolveCheckoutBilling(event);
        const trigger = event?.target?.closest?.('[data-upgrade-checkout]');
        const useTrial = trigger?.dataset?.trial !== '0' && revenueManager.trialEligible;
        storeCheckoutIntentPayload({ billing: billingInterval, useTrial });
    }

    scheduleCheckoutResume(delayMs = 600) {
        if (this._checkoutResumeTimer) {
            clearTimeout(this._checkoutResumeTimer);
        }
        this._checkoutResumeTimer = setTimeout(() => {
            this._checkoutResumeTimer = null;
            this.resumeCheckoutIfPending();
        }, delayMs);
    }

    async resumeCheckoutIfPending() {
        if (this._checkoutInFlight || this._checkoutResumeLock) return;

        const intent = peekCheckoutIntent();
        if (!intent || !this.currentUser) return;

        this._checkoutResumeLock = true;
        try {
            await this.handlePremiumCheckout(buildCheckoutTriggerEvent(intent), { fromResume: true });
        } finally {
            setTimeout(() => {
                this._checkoutResumeLock = false;
            }, 1200);
        }
    }

    setCheckoutButtonsLoading(loading, sourceEvent) {
        const triggers = new Set();
        const fromClick = sourceEvent?.target?.closest?.('[data-upgrade-checkout]');
        if (fromClick) triggers.add(fromClick);

        document.querySelectorAll('[data-upgrade-checkout]').forEach((el) => triggers.add(el));

        triggers.forEach((btn) => {
            if (!btn || btn.tagName !== 'BUTTON') return;
            if (loading) {
                if (!btn.dataset.checkoutLabel) {
                    btn.dataset.checkoutLabel = btn.textContent.trim();
                }
                btn.disabled = true;
                btn.setAttribute('aria-busy', 'true');
                btn.textContent = CONVERSION_COPY.checkout.buttonLoading;
            } else {
                btn.disabled = false;
                btn.removeAttribute('aria-busy');
                if (btn.dataset.checkoutLabel) {
                    btn.textContent = btn.dataset.checkoutLabel;
                }
            }
        });
    }

    async openBillingPortal(sourceEvent) {
        if (!this.currentUser) {
            this.auth.showLoginModal();
            return;
        }

        if (this._billingPortalInFlight) return;

        this._billingPortalInFlight = true;
        setBillingPortalButtonsLoading(true, sourceEvent);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.access_token) {
                this.auth.showLoginModal();
                this.ui.showError(CONVERSION_COPY.checkout.billingPortalRequired);
                return;
            }

            analytics.track('billing_portal_open', {}, {
                category: 'subscription',
                funnel: 'subscription',
                funnel_step: 'billing_portal_open',
                user_id: this.currentUser.id
            });

            const response = await fetch('/api/create-billing-portal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.url) {
                throw Object.assign(
                    new Error(mapBillingPortalError(response.status, data)),
                    { status: response.status }
                );
            }

            window.location.href = data.url;
        } catch (error) {
            console.error('Billing portal failed:', error);
            trackOpsEvent('billing_portal_failed', {
                message: String(error.message || 'portal_failed').slice(0, 120),
                http_status: error.status || null
            }, { category: 'payment', severity: 'warning' });
            this.ui.showError(error.message || mapBillingPortalError(500));
        } finally {
            this._billingPortalInFlight = false;
            setBillingPortalButtonsLoading(false, sourceEvent);
        }
    }

    async handlePremiumCheckout(event, options = {}) {
        const storedIntent = peekCheckoutIntent();

        if (event) {
            this.storeCheckoutIntent(event);
        } else if (storedIntent && options.fromResume) {
            // billing/trial resolved below from stored intent
        } else if (storedIntent) {
            event = buildCheckoutTriggerEvent(storedIntent);
        }

        if (!this.currentUser) {
            if (event) this.storeCheckoutIntent(event);
            analytics.track('auth_modal_open', { reason: 'checkout' }, { category: 'auth', funnel: 'subscription' });
            this.auth.showCheckoutAuthGate();
            return;
        }

        if (this._checkoutInFlight) return;

        const billingInterval = this.resolveCheckoutBilling(event)
            || storedIntent?.billing
            || 'monthly';
        const trigger = event?.target?.closest?.('[data-upgrade-checkout]');
        const useTrialFromTrigger = trigger?.dataset?.trial !== '0';
        const useTrial = storedIntent && options.fromResume
            ? storedIntent.useTrial !== false && revenueManager.trialEligible
            : useTrialFromTrigger && revenueManager.trialEligible;

        storeCheckoutIntentPayload({ billing: billingInterval, useTrial });

        this._checkoutInFlight = true;
        this.setCheckoutButtonsLoading(true, event);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.access_token) {
                this.auth.showLoginModal({ intent: 'checkout' });
                this.ui.showError(CONVERSION_COPY.checkout.sessionRequired);
                return;
            }

            const checkoutKey = `${this.currentUser.id}:${billingInterval}:${useTrial ? 'trial' : 'paid'}`;
            trackCheckoutStart({
                product: 'premium',
                billing_interval: billingInterval,
                from_resume: Boolean(options.fromResume),
                checkout_key: checkoutKey,
                growth_channel: getGrowthContext().growth_channel
            });
            trackPaidFunnelStep('checkout_start', { billing_interval: billingInterval });
            sendServerPaidConversion('checkout_start', { billing_interval: billingInterval });
            const growth = getGrowthContext();

            const response = await fetch('/api/create-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    billingInterval,
                    useTrial,
                    attribution: {
                        utm_source: growth.utm_source,
                        utm_medium: growth.utm_medium,
                        utm_campaign: growth.utm_campaign,
                        utm_content: growth.utm_content,
                        ref: growth.referral_code,
                        referral_code: growth.referral_code,
                        growth_channel: growth.growth_channel,
                        growth_campaign: growth.growth_campaign,
                        gclid: growth.gclid,
                        fbclid: growth.fbclid,
                        msclkid: growth.msclkid,
                        ttclid: growth.ttclid,
                        paid_platform: growth.paid_platform || null,
                        gbraid: growth.gbraid || null,
                        wbraid: growth.wbraid || null
                    }
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.url) {
                const message = mapCheckoutApiError(response.status, data);
                throw Object.assign(new Error(message), { status: response.status });
            }

            clearCheckoutIntent();
            window.location.href = data.url;
        } catch (error) {
            console.error('Premium checkout failed:', error);
            const growth = getGrowthContext();
            analytics.track('checkout_abandoned', {
                product: 'premium',
                billing_interval: billingInterval,
                growth_channel: growth.growth_channel,
                reason: String(error.message || 'checkout_failed').slice(0, 80)
            }, {
                category: 'subscription',
                funnel: 'subscription',
                funnel_step: 'checkout_abandoned',
                user_id: this.currentUser?.id
            });
            if (this.currentUser?.email) {
                enrollCheckoutAbandonRecovery({
                    email: this.currentUser.email,
                    user_id: this.currentUser.id,
                    billing_interval: billingInterval,
                    reason: String(error.message || 'checkout_failed').slice(0, 80)
                });
            }
            trackOpsEvent('payment_checkout_failed', {
                message: String(error.message || 'checkout_failed').slice(0, 120),
                billing_interval: billingInterval,
                http_status: error.status || null
            }, { category: 'payment', severity: 'error' });
            this.ui.showError(error.message || CONVERSION_COPY.checkout.failed);
        } finally {
            this._checkoutInFlight = false;
            this.setCheckoutButtonsLoading(false, event);
        }
    }

    async handleAddListing() {
        if (!this.currentUser) {
            this.auth.showLoginModal();
            return;
        }

        this.router.navigate('/ilan-ekle');
    }

    async handleCreateListing(event) {
        event.preventDefault();

        if (!this.currentUser) {
            this.auth.showLoginModal();
            return;
        }

        const form = event.currentTarget;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        const formData = new FormData(form);

        const title = formData.get('title')?.toString().trim();
        const description = formData.get('description')?.toString().trim();
        const price = Number(formData.get('price'));
        const category = formData.get('category')?.toString();
        const location = formData.get('location')?.toString().trim();
        const imageUrl = formData.get('image_url')?.toString().trim();
        const externalUrl = formData.get('external_url')?.toString().trim();

        if (!title || title.length < 5 || !description || description.length < 20 || !Number.isFinite(price) || price < 0 || !category || !location) {
            this.ui.showError('Lütfen ilan bilgilerini eksiksiz ve doğru doldurun.');
            return;
        }

        const listingPayload = {
            user_id: this.currentUser.id,
            title,
            description,
            price,
            currency: 'TRY',
            category,
            location,
            province: this.extractProvinceFromLocation(location),
            district: this.extractDistrictFromLocation(location),
            images: imageUrl ? [imageUrl] : [],
            external_url: externalUrl || null
        };

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Yayınlanıyor...';

            let listing;
            let savedLocally = false;
            try {
                listing = await API.createListing(listingPayload);
            } catch (error) {
                console.error('Failed to create listing remotely, saving local fallback:', error);
                listing = this.createLocalListing(listingPayload);
                savedLocally = true;
            }

            form.reset();
            this.ui.showSuccess(savedLocally ? 'Canlı servis yanıt vermedi; ilanınız bu cihazda güvenli şekilde kaydedildi.' : 'İlanınız yayınlandı.');
            await this.loadCategories();
            await this.loadListings({ category });
            this.router.navigate(listing?.id ? `/ilan/${listing.id}` : '/ilanlar');
        } catch (error) {
            console.error('Failed to create listing:', error);
            this.ui.showError('İlan yayınlanırken bir hata oluştu.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    extractProvinceFromLocation(location = '') {
        return location.toString().split('/')[0]?.trim() || '';
    }

    extractDistrictFromLocation(location = '') {
        return location.toString().split('/')[1]?.trim() || '';
    }

    async loadFavorites() {
        const favorites = this.readStoredArray(STORAGE_KEYS.FAVORITES);
        this.favorites = favorites;
        this.ui.renderFavorites?.(this.favorites);
        this.updateCollectionBadges();
    }

    saveFavorites() {
        this.writeStoredValue(STORAGE_KEYS.FAVORITES, this.favorites);
        this.ui.renderFavorites?.(this.favorites);
        this.updateCollectionBadges();
        this.renderCurrentListings();
        this.renderCurrentListingDetail();
    }


    loadComparisonItems() {
        this.comparisonItems = this.readStoredArray(STORAGE_KEYS.COMPARISON_ITEMS);
        this.ui.renderComparison?.(this.comparisonItems);
        this.updateCollectionBadges();
        this.renderCurrentListings();
    }

    saveComparisonItems() {
        this.writeStoredValue(STORAGE_KEYS.COMPARISON_ITEMS, this.comparisonItems);
        this.ui.renderComparison?.(this.comparisonItems);
        this.updateCollectionBadges();
        this.renderCurrentListings();
        this.renderCurrentListingDetail();
    }

    updateCollectionBadges() {
        this.ui.updateCollectionBadges?.({
            favorites: Array.isArray(this.favorites) ? this.favorites.length : 0,
            comparisons: Array.isArray(this.comparisonItems) ? this.comparisonItems.length : 0
        });
    }

    renderCurrentListings() {
        this.ui.renderListings?.(this.currentListings || [], this.getFavoriteIds(), this.getComparisonSignatures(), this.lastListingOptions);
        this.ui.setListingView?.(this.listingView);
        this.renderListingToolbar();
    }

    renderListingToolbar(options = this.lastListingOptions) {
        this.ui.renderListingToolbar?.({
            count: Array.isArray(this.currentListings) ? this.currentListings.length : 0,
            options: options || {},
            sort: this.listingSort,
            view: this.listingView
        });
    }

    sortListings(listings = [], sort = this.listingSort) {
        const normalizedSort = ['aiScore', 'newest', 'priceAsc', 'priceDesc'].includes(sort) ? sort : 'aiScore';
        const copy = [...(Array.isArray(listings) ? listings : [])];
        const price = (item) => Number(item.price || 0);
        const createdAt = (item) => new Date(item.created_at || item.createdAt || 0).getTime() || 0;

        return copy.sort((a, b) => {
            if (normalizedSort === 'priceAsc') return price(a) - price(b);
            if (normalizedSort === 'priceDesc') return price(b) - price(a);
            if (normalizedSort === 'newest') return createdAt(b) - createdAt(a);
            return this.getListingDecisionScore(b) - this.getListingDecisionScore(a) || price(a) - price(b);
        });
    }

    handleListingSortChange(sort) {
        this.listingSort = ['aiScore', 'newest', 'priceAsc', 'priceDesc'].includes(sort) ? sort : 'aiScore';
        this.currentListings = this.sortListings(this.currentListings, this.listingSort);
        this.renderCurrentListings();
    }

    handleListingViewChange(view) {
        this.listingView = view === 'compact' ? 'compact' : 'grid';
        this.renderCurrentListings();
    }

    renderCurrentListingDetail() {
        if (!this.currentDetailListing) return;
        this.ui.renderListingDetail?.(
            this.currentDetailListing,
            this.getFavoriteIds(),
            this.createComparisonItemFromListing(this.currentDetailListing),
            this.getComparisonSignatures()
        );
    }

    addRecommendationToComparison(index) {
        const recommendationIndex = Number(index);
        const recommendation = this.lastDecisionResult?.recommendations?.[recommendationIndex];
        if (!recommendation || !this.lastDecisionResult) {
            this.ui.showError('Karşılaştırmaya eklenecek öneri bulunamadı. Önce akıllı karar akışını tamamlayın.');
            return;
        }

        this.addComparisonItem(this.createComparisonItemFromRecommendation(recommendation, this.lastDecisionResult));
    }

    addListingToComparison(listingId) {
        const listing = (this.currentListings || []).find((item) => item.id.toString() === listingId.toString()) ||
            (this.favorites || []).find((item) => item.id.toString() === listingId.toString()) ||
            (this.currentDetailListing?.id?.toString() === listingId.toString() ? this.currentDetailListing : null) ||
            this.getListingFallbackById(listingId);
        if (!listing) {
            this.ui.showError('Karşılaştırmaya eklenecek ilan bulunamadı.');
            return;
        }

        this.addComparisonItem(this.createComparisonItemFromListing(listing));
    }

    addComparisonItem(item) {
        if (!item) return;
        const existingCategory = this.comparisonItems[0]?.categoryId;
        if (existingCategory && existingCategory !== item.categoryId) {
            this.ui.showError('Net sonuç için aynı tabloda yalnızca aynı kategoriden seçenekler karşılaştırılır.');
            return;
        }

        if (this.comparisonItems.some((current) => current.signature === item.signature)) {
            this.ui.showSuccess('Bu seçenek zaten karşılaştırmada.');
            if (this.router?.navigate) {
                this.router.navigate('/karsilastir');
            }
            return;
        }

        const maxItems = revenueManager.getComparisonLimit();

        if (this.comparisonItems.length >= maxItems) {
            if (!revenueManager.isPremium) {
                if (shouldShowUpsell('comparison_unlimited')) {
                    const container = document.getElementById('comparison-content');
                    if (container) {
                        const slot = document.createElement('div');
                        slot.innerHTML = renderContextualUpsellCard('comparison_unlimited', 'compare_center_limit');
                        const card = slot.firstElementChild;
                        if (card) container.prepend(card);
                        bindContextualUpsell(container);
                    }
                } else {
                    trackUpsellClick('comparison_unlimited', 'compare_center_limit', { modal: true });
                    revenueManager.mountPaywall('comparison');
                }
                this.ui.showError(`Ücretsiz planda en fazla ${maxItems} seçenek karşılaştırabilirsiniz. Pro ile 4\'e kadar.`);
            } else {
                this.ui.showError('Karşılaştırma listesine en fazla 4 seçenek eklenebilir.');
            }
            return;
        }

        this.comparisonItems = [...this.comparisonItems, item];
        this.saveComparisonItems();
        this.ui.showSuccess('Seçenek karşılaştırmaya eklendi.');
        if (this.router?.navigate) {
            this.router.navigate('/karsilastir');
        }
    }

    removeComparisonItem(itemId) {
        this.comparisonItems = this.comparisonItems.filter((item) => item.id !== itemId);
        this.saveComparisonItems();
        this.ui.showSuccess('Seçenek karşılaştırmadan çıkarıldı.');
    }

    clearComparisonItems() {
        this.comparisonItems = [];
        this.saveComparisonItems();
        this.ui.showSuccess('Karşılaştırma listesi temizlendi.');
    }

    createComparisonItemFromRecommendation(recommendation, result) {
        const bestFinance = recommendation.financeComparisons?.[0] || {};
        return {
            id: 'cmp-rec-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
            signature: 'recommendation:' + result.categoryId + ':' + recommendation.name,
            sourceType: 'AI önerisi',
            categoryId: result.categoryId,
            categoryName: result.categoryName,
            title: recommendation.name,
            price: Number(recommendation.price || 0),
            periodicCost: Number(recommendation.yearlyCost || 0),
            monthlyPayment: Number(bestFinance.monthlyPayment || 0),
            totalPayment: Number(bestFinance.totalPayment || 0),
            score: Number(recommendation.score || 0),
            riskLevel: recommendation.riskLevel || 'Kontrol gerekli',
            details: recommendation.details || [],
            calculationRows: recommendation.calculationTable?.rows || [],
            tags: recommendation.decisionTags || [],
            comment: recommendation.realisticComment || recommendation.scoreNote || '',
            createdAt: new Date().toISOString()
        };
    }

    createComparisonItemFromListing(listing) {
        const categoryId = listing.category || 'genel';
        const profile = this.getCostProfile(listing.category);
        const periodicEstimate = estimateListingPeriodicCost(listing, profile);
        const periodicCost = Number(periodicEstimate.total || 0);
        const costBreakdown = periodicEstimate.breakdown || {};
        const bestFinance = this.createFinanceComparisons(Number(listing.price || 0), categoryId)[0] || {};
        const score = this.getListingDecisionScore(listing);
        return {
            id: 'cmp-listing-' + listing.id,
            signature: 'listing:' + categoryId + ':' + listing.id,
            sourceType: 'İlan',
            categoryId,
            categoryName: this.getCategoryName(categoryId),
            title: listing.title || 'İlan',
            price: Number(listing.price || 0),
            periodicCost,
            costBreakdown,
            monthlyPayment: Number(bestFinance.monthlyPayment || 0),
            totalPayment: Number(bestFinance.totalPayment || 0),
            score,
            riskLevel: score >= 86 ? 'Düşük risk' : score >= 76 ? 'Kontrollü risk' : 'Dikkat gerektirir',
            details: this.createListingComparisonDetails(listing),
            calculationRows: this.createListingComparisonRows(listing, periodicCost, bestFinance),
            tags: this.getListingDecisionTags(listing, score),
            comment: this.createListingComparisonComment(listing, periodicCost),
            createdAt: new Date().toISOString()
        };
    }

    getCategoryName(categoryId) {
        const localMap = { arac: 'Araç', ev: 'Ev', tatil: 'Tatil' };
        return this.categories.find((category) => category.id === categoryId)?.name || localMap[categoryId] || 'Genel';
    }

    getListingDecisionScore(listing = {}) {
        const explicitScore =
            Number(listing.score || listing.decisionScore || listing.matchScore || 0);

        if (explicitScore > 0) {
            return Math.max(0, Math.min(100, explicitScore));
        }

        return null;
    }

    estimateListingPeriodicCost(listing = {}) {
        const profile = this.getCostProfile(listing.category);
        const result = estimateListingPeriodicCost(listing, profile);
        return Number(result.total || 0);
    }

    createListingComparisonDetails(listing = {}) {
        const categoryName = this.getCategoryName(listing.category);
        const details = [
            { label: 'Kategori', value: categoryName },
            { label: 'Konum', value: listing.location || 'Belirtilmemiş' },
            { label: 'Kaynak', value: listing.external_url ? 'Dış ilan bağlantılı' : 'Platform içi kayıt' },
            { label: 'Güncellik', value: listing.created_at ? new Date(listing.created_at).toLocaleDateString('tr-TR') : 'Tarih yok' }
        ];

        if (listing.category === 'arac') {
            details.push({ label: 'Kontrol odağı', value: 'KM, tramer, ekspertiz ve kasko' });
        } else if (listing.category === 'ev') {
            details.push({ label: 'Kontrol odağı', value: 'Tapu, deprem, aidat ve m2 fiyatı' });
        } else if (listing.category === 'tatil') {
            details.push({ label: 'Kontrol odağı', value: 'Sezon, oda tipi, ulaşım ve iptal koşulu' });
        }

        return details;
    }

    createListingComparisonRows(listing = {}, periodicCost = 0, bestFinance = {}) {
        const categoryId = listing.category;
        const purchaseLabel = categoryId === 'arac' ? 'İlan araç bedeli' : categoryId === 'ev' ? 'İlan alım bedeli' : categoryId === 'tatil' ? 'İlan paket bedeli' : 'İlan bedeli';
        const periodicLabel = this.getCategoryTotalLabel(categoryId);
        return [
            { label: purchaseLabel, value: Number(listing.price || 0), note: 'İlan üzerinde görünen ana bedel' },
            { label: periodicLabel, value: periodicCost, note: this.getCategoryTotalNote(categoryId) },
            { label: 'Aylık ödeme', value: Number(bestFinance.monthlyPayment || 0), note: bestFinance.bank ? bestFinance.bank + ' simülasyonu' : 'Finansman simülasyonu yok' },
            { label: 'Toplam geri ödeme', value: Number(bestFinance.totalPayment || 0), note: bestFinance.term ? bestFinance.term + ' ay vade' : 'Finansman simülasyonu yok' }
        ];
    }

    getListingDecisionTags(listing = {}, score = 0) {
        const tags = [];
        if (score >= 86) tags.push('Güçlü ilan');
        if (listing.external_url) tags.push('Kaynak bağlantılı');
        if (listing.created_at && (Date.now() - new Date(listing.created_at).getTime()) < 5 * 86400000) tags.push('Güncel');
        tags.push(this.getCategoryName(listing.category));
        return tags.slice(0, 4);
    }

    createListingComparisonComment(listing = {}, periodicCost = 0) {
        const costText = this.formatCurrency(periodicCost);
        if (listing.category === 'arac') {
            return (listing.title || 'Bu araç') + ' için ilan bedeline ek olarak yakıt/enerji, sigorta, kasko ve bakım yükü yaklaşık ' + costText + ' seviyesinde varsayıldı. Satın alma öncesi ekspertiz, tramer ve güncel kasko teklifi kontrol edilmeli.';
        }
        if (listing.category === 'ev') {
            return (listing.title || 'Bu ev') + ' için alım bedeline ek yıllık aidat/bakım, vergi, sigorta ve yenileme payı yaklaşık ' + costText + ' olarak ele alındı. Tapu, deprem ve gerçek m2 fiyatı doğrulanmalı.';
        }
        if (listing.category === 'tatil') {
            return (listing.title || 'Bu tatil') + ' için paket dışı ulaşım, aktivite, transfer ve sigorta yükü yaklaşık ' + costText + ' olarak simüle edildi. Sezon ve iptal koşulları son fiyatı değiştirebilir.';
        }
        return 'İlan karşılaştırması fiyat, tahmini dönemsel maliyet ve finansman simülasyonu üzerinden üretildi.';
    }

    getFavoriteIds() {
        return Array.isArray(this.favorites) ? this.favorites.map((item) => item.id.toString()) : [];
    }

    getComparisonSignatures() {
        return Array.isArray(this.comparisonItems) ? this.comparisonItems.map((item) => String(item.signature)) : [];
    }

    toggleAutoFavorite(vehicle) {
        if (!vehicle) return;
        if (!Array.isArray(this.favorites)) this.favorites = [];

        const id = `auto-${vehicle.name}`;
        const existing = this.favorites.find((item) => item.id.toString() === id);

        if (existing) {
            this.favorites = this.favorites.filter((item) => item.id.toString() !== id);
            this.ui.showSuccess('Araç shortlist listenizden çıkarıldı.');
            this.saveFavorites();
            return false;
        }

        this.favorites.push({
            id,
            title: vehicle.name,
            location: 'isteBul Auto AI analizi',
            price: Number(vehicle.price || vehicle.costs?.purchase || 0),
            category: 'arac',
            external_url: '',
            score: vehicle.score,
            autoGenerated: true
        });

        this.ui.showSuccess('Araç shortlist listenize eklendi.');
        this.saveFavorites();
        return true;
    }

    getAutoComparisonImage(vehicle) {
        const name = String(vehicle?.name || '');

        if (vehicle?.image || vehicle?.imageUrl || vehicle?.visual) {
            return vehicle.image || vehicle.imageUrl || vehicle.visual;
        }

        if (name.includes('Toyota')) return '/assets/images/auto/toyota-corolla-cross-hybrid.svg';
        if (name.includes('Honda')) return '/assets/images/auto/honda-civic-eco.svg';
        if (name.includes('Hyundai')) return '/assets/images/auto/hyundai-tucson-tgdi.svg';
        if (name.includes('Renault')) return '/assets/images/auto/renault-clio-icon.svg';
        if (name.includes('Volkswagen')) return '/assets/images/auto/volkswagen-golf-tsi.svg';
        if (name.includes('Togg')) return '/assets/images/auto/togg-t10x.svg';
        if (name.includes('Tesla')) return '/assets/images/auto/tesla-model.svg';
        if (name.includes('BYD')) return '/assets/images/auto/byd-electric.svg';
        if (name.includes('Peugeot')) return '/assets/images/auto/peugeot-suv.svg';
        if (name.includes('Skoda')) return '/assets/images/auto/skoda-family.svg';
        if (name.includes('BMW')) return '/assets/images/auto/bmw-premium.svg';
        if (name.includes('Mercedes')) return '/assets/images/auto/mercedes-premium.svg';

        return '';
    }

    addAutoVehicleToComparison(vehicle) {
        if (!vehicle) return;

        const score = Number(vehicle.score || 0);

        this.addComparisonItem({
            id: `auto-compare-${vehicle.name}`,
            signature: `auto-${vehicle.name}`,
            categoryId: 'arac',
            categoryName: 'Araç Karşılaştırma',
            sourceType: 'isteBul Auto',
            title: vehicle.name,
            image: this.getAutoComparisonImage(vehicle),
            score,
            riskLevel: score >= 85 ? 'Düşük risk'
                : score >= 70 ? 'Dengeli'
                : 'Kontrol gerekli',
            price: Number(vehicle.price || vehicle.costs?.purchase || 0),
            periodicCost: Number(vehicle.costs?.annual || 0),
            yearlyCost: Number(vehicle.costs?.annual || 0),
            monthlyPayment: Math.round((Number(vehicle.costs?.total || 0) / 12) || 0),
            tags: [
                vehicle.fuel || 'Araç',
                vehicle.segment || 'AI analiz'
            ],
            comment: vehicle.reasons?.[0] || 'AI araç karar analizi sonucu önerildi.',
            details: [
                { label: 'En iyi kullanım', value: vehicle.usage || '-' },
                { label: 'Yakıt tipi', value: vehicle.fuel || '-' }
            ],
            reasons: vehicle.reasons || [],
            risks: vehicle.risks || []
        });
    }

    toggleFavorite(listingId) {
        const normalizedId = listingId.toString();
        if (!Array.isArray(this.favorites)) this.favorites = [];
        const existing = this.favorites.find((item) => item.id.toString() === normalizedId);
        if (existing) {
            this.favorites = this.favorites.filter((item) => item.id.toString() !== normalizedId);
            this.ui.showSuccess('İlan favorilerinizden çıkarıldı.');
        } else {
            const listing = (this.currentListings || []).find((item) => item.id.toString() === normalizedId) ||
                (this.currentDetailListing?.id?.toString() === normalizedId ? this.currentDetailListing : null) ||
                this.getListingFallbackById(normalizedId);
            if (!listing) {
                this.ui.showError('Favoriye eklenemiyor. Lütfen tekrar deneyin.');
                return;
            }
            this.favorites.push(listing);
            this.ui.showSuccess('İlan favorilerinize eklendi.');
        }

        this.saveFavorites();
    }

    async loadListingDetail(listingId) {
        const localListing = this.getLocalListingById(listingId);
        if (localListing) {
            this.currentDetailListing = localListing;
            this.ui.renderListingDetail(localListing, this.getFavoriteIds(), this.createComparisonItemFromListing(localListing), this.getComparisonSignatures());
            return;
        }

        try {
            const listing = await Promise.race([
                API.getListing(listingId),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Listing detail timeout')), 6000))
            ]);
            const fallbackListing = listing || this.getListingFallbackById(listingId);
            if (!fallbackListing) {
                this.ui.renderListingDetailEmpty?.('Bu ilan canlı veri içinde bulunamadı veya yayından kaldırılmış olabilir.');
                this.ui.showError('İlan detayları bulunamadı.');
                return;
            }
            this.currentDetailListing = fallbackListing;
            this.ui.renderListingDetail(fallbackListing, this.getFavoriteIds(), this.createComparisonItemFromListing(fallbackListing), this.getComparisonSignatures());
        } catch (error) {
            console.error('Failed to load listing detail:', error);
            const fallbackListing = this.getListingFallbackById(listingId);
            if (fallbackListing) {
                this.currentDetailListing = fallbackListing;
                this.ui.renderListingDetail(fallbackListing, this.getFavoriteIds(), this.createComparisonItemFromListing(fallbackListing), this.getComparisonSignatures());
                this.ui.showError('Canlı ilan detayına ulaşılamadı.');
                return;
            }
            this.ui.renderListingDetailEmpty?.('İlan detayları yüklenirken bir hata oluştu. Lütfen seçenekler listesinden tekrar deneyin.');
            this.ui.showError('İlan detayları yüklenirken bir hata oluştu.');
        }
    }

    async loadQuiz() {
        try {
            this.ui.showLoading('#quiz-content');
            this.quizQuestions = await API.getQuizQuestions();
            this.ui.renderQuiz(this.quizQuestions || []);
        } catch (error) {
            console.error('Failed to load quiz:', error);
            this.ui.showError('Quiz yüklenirken bir hata oluştu.');
            this.ui.renderQuiz([]);
        }
    }

    async handleQuizAnswer(questionId, answer) {
        if (!this.currentUser) {
            this.auth.showLoginModal();
            return;
        }

        try {
            const result = await API.submitQuizAnswer(questionId, answer, this.currentUser.id);
            this.ui.markQuizAnswer(questionId, answer, result.is_correct);
            this.ui.showSuccess(result.is_correct ? 'Doğru cevap!' : 'Cevabınız kaydedildi.');
        } catch (error) {
            console.error('Failed to submit quiz answer:', error);
            this.ui.showError('Cevap kaydedilirken bir hata oluştu.');
        }
    }


    async handleUserLogin(user) {
        this.currentUser = user;
        state.setUser(user);
        this.ui.updateAuthUI(user);
        await this.loadUserProfile(user.id);
        await revenueManager.refresh(user.id);
        await this.initMessaging(user.id);
        await this.completeSessionBootstrap();
        this._sessionBootstrapDone = true;
    }

    /**
     * Post-auth data loads (page refresh path via checkAuth, or after interactive login).
     */
    async completeSessionBootstrap() {
        if (!this.currentUser) return;

        this.loadDecisionHistory();
        this.loadComparisonHistory();
        await this.loadListings();
        this.scheduleCheckoutResume(600);
    }

    async handleUserLogout() {
        this._sessionBootstrapDone = false;
        this.currentUser = null;
        this.messagingModule = null;
        await revenueManager.refresh(null);
        this.decisionHistory = [];
        this.localListings = [];
        this.ui.updateAuthUI(null);
        this.ui.renderHistoryAuthGate?.();
        this.account?.renderGuest?.();

        // Reload listings
        await this.loadListings();
    }

    async handleLogout() {
        try {
            await this.auth.logout();
        } catch (error) {
            console.error('Logout failed:', error);
            this.ui.showError('Çıkış yapılırken bir hata oluştu');
        }
    }

    handleNewsletterSubscribe(event) {
        event.preventDefault();
        const emailInput = document.getElementById('newsletter-email');
        const consentInput = document.getElementById('newsletter-marketing-consent');
        if (!emailInput) return;

        const email = emailInput.value.trim();
        if (!email || !email.includes('@')) {
            this.ui.showError('Lütfen geçerli bir e-posta adresi girin.');
            return;
        }

        if (!consentInput?.checked) {
            this.ui.showError('Devam etmek için pazarlama onayını işaretleyin.');
            return;
        }

        const existing = this.readStoredArray(STORAGE_KEYS.NEWSLETTER);
        const entry = {
            email: email.toLowerCase(),
            email_domain: email.split('@')[1] || '',
            marketing_consent: 'accepted',
            consented_at: new Date().toISOString()
        };
        const already = existing.some((item) =>
            (typeof item === 'object' && item?.email === entry.email) ||
            (typeof item === 'string' && item === entry.email)
        );
        if (!already) {
            existing.push(entry);
            this.writeStoredValue(STORAGE_KEYS.NEWSLETTER, existing);
        }

        emailInput.value = '';
        if (consentInput) consentInput.checked = false;

        if (analytics.hasConsent()) {
            analytics.track('newsletter_subscribe', { email_domain: entry.email_domain }, {
                category: 'growth',
                funnel: 'newsletter',
                funnel_step: 'subscribed'
            });
        }

        enrollNewsletterWelcome(email).then((result) => {
            if (result?.ok) {
                this.ui.showSuccess('Abonelik kaydınız alındı. Hoş geldiniz e-postası kısa süre içinde gönderilecek.');
            } else if (result?.error === 'marketing_consent_required' || result?.error === 'consent_required') {
                this.ui.showError('E-posta gönderimi için onay gerekli.');
            } else {
                this.ui.showSuccess('Tercihiniz kaydedildi. E-posta gönderiminde gecikme olabilir.');
            }
        }).catch(() => {
            this.ui.showSuccess('Tercihiniz kaydedildi.');
        });
    }

    saveSearchHistory(query) {
        const storageKey = this.getUserHistoryStorageKey(STORAGE_KEYS.SEARCH_HISTORY);
        if (!storageKey) return;

        const history = this.readStoredArray(storageKey);
        const newEntry = {
            id: Date.now(),
            query,
            date: new Date().toISOString()
        };

        const filtered = [newEntry, ...history.filter((item) => item.query !== query)].slice(0, 8);
        this.writeStoredValue(storageKey, filtered);
        this.loadComparisonHistory();
    }

    loadComparisonHistory() {
        const storageKey = this.getUserHistoryStorageKey(STORAGE_KEYS.SEARCH_HISTORY);
        if (!storageKey) return;

        const history = this.readStoredArray(storageKey);
        const historyList = document.getElementById('history-list');
        if (!historyList || this.decisionHistory.length) return;

        if (!history.length) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="clock"></i>
                    <h3>Geçmiş bulunamadı</h3>
                    <p>Önce bir arama yapın veya akıllı karar akışını tamamlayın, geçmiş burada gösterilecektir.</p>
                </div>
            `;
        } else {
            historyList.innerHTML = '<div class="history-subhead"><h3>Son aramalar</h3><p>Karar sonuçlarınız oluşana kadar aramalarınız burada görünür.</p></div>';
            history.forEach((item) => {
                const row = document.createElement('div');
                row.className = 'history-item';

                const query = document.createElement('strong');
                query.textContent = item.query;

                const date = document.createElement('span');
                date.textContent = new Date(item.date).toLocaleString('tr-TR');

                row.append(query, date);
                historyList.appendChild(row);
            });
        }
        if (typeof lucide !== 'undefined') {
            window.lucide?.createIcons();
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    await completeOAuthIfPresent();

    const deferContentHub = () => {
        Promise.all([
            import('./core/cms.js'),
            import('./runtime/init-public-content.js')
        ]).then(([{ loadCMS }, { initPublicContentHub }]) => {
            loadCMS();
            initPublicContentHub();
        }).catch(() => {});
    };
    if ('requestIdleCallback' in window) {
        requestIdleCallback(deferContentHub, { timeout: 2500 });
    } else {
        setTimeout(deferContentHub, 400);
    }

    window.app = new App();
    try {
        await window.app.init();

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && !window.app._sessionBootstrapDone) {
            await window.app.completeSessionBootstrap();
            window.app._sessionBootstrapDone = true;
            window.app.auth?.hideAuthModal?.();
        }

        // Ensure direct URL routes like /karsilastir and /karar-asistani
        // are applied after all UI/listener initialization is complete.
        window.app.router?.handleRoute?.();

        const bootPath = window.location.pathname === '/index.html'
            ? '/'
            : (window.location.pathname.replace(/\/$/, '') || '/');
        if (bootPath === '/' && !MARKETING_SECTION_IDS.has(window.location.hash.slice(1))) {
            applyHomeMarketingVisibility();
        }

        window.appReady = true;
        window.dispatchEvent(new CustomEvent('app:ready'));
    } catch (error) {
        window.appInitError = error;
        console.error('App initialization failed:', error);
        throw error;
    }
});

// Export for debugging
export default App;
document.addEventListener('click', (event) => {
    const reloadBtn = event.target.closest('[data-action="reload-page"]');
    if (reloadBtn) {
        window.location.reload();
        return;
    }

    const dismissBtn = event.target.closest('[data-action="dismiss-parent-card"]');
    if (dismissBtn) {
        dismissBtn.closest('.notification, .toast, .alert, .error-card, .card')?.remove();
    }
});

// Mobile-safe cookie consent fallback
document.addEventListener('click', (event) => {
    const accept = event.target.closest('[data-cookie-accept]');
    const decline = event.target.closest('[data-cookie-decline]');

    if (!accept && !decline) return;

    try {
        writeStorageRaw(STORAGE_KEYS.COOKIE_CONSENT, accept ? 'accepted' : 'declined');
    } catch {}

    if (accept) {
        window.app?.loadAnalytics?.();
        analytics.init();
        document.dispatchEvent(new CustomEvent('cookieConsentAccepted'));
    }

    const consent = document.getElementById('cookie-consent');
    if (consent) {
        consent.classList.add('hidden');
        consent.style.display = 'none';
    }
});

// Production route visibility guard (kept in sync with js/core/router.js marketing IDs)
const MARKETING_SECTION_IDS = new Set([
    'home',
    'trust',
    'methodology-teaser',
    'sample-preview',
    'home-auto-bridge',
    'how-it-works',
    'home-vertical-focus',
    'pricing',
    'partner-enterprise',
    'landing-faq',
    'home-final-cta'
]);
const MARKETING_PATH_ALIASES = new Set(['/metodoloji-ozet', '/planlar-ozet']);

function applyHomeMarketingVisibility() {
    if (window.app?.router?.showHomeSections) {
        window.app.router.showHomeSections();
        document.body.classList.remove('app-route-active', 'ib-premium-route-active');
        return;
    }

    document.querySelectorAll('section[id]').forEach((section) => {
        const shouldShow = MARKETING_SECTION_IDS.has(section.id);
        section.classList.toggle('hidden', !shouldShow);
        section.style.display = shouldShow ? 'block' : 'none';
    });
    document.body.classList.remove('app-route-active', 'ib-premium-route-active');
}

function showPremiumPageFallback(pageId) {
    document.body.classList.add('app-route-active', 'ib-premium-route-active');

    document.querySelectorAll('[data-private-section]').forEach((section) => {
        section.classList.remove('route-visible');
    });

    document.querySelectorAll('section[id]').forEach((section) => {
        const shouldShow = section.id === pageId;
        section.classList.toggle('hidden', !shouldShow);
        section.style.display = shouldShow ? 'block' : 'none';
    });

    const target = document.getElementById(pageId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('route-visible');
        target.style.display = 'block';
    }
}

function applyProductionRouteVisibility() {
    if (tryExternalRouteRedirect(window.location.pathname)) {
        return;
    }

    if (window.app?.router?.handleRoute) {
        window.app.router.handleRoute();
        return;
    }

    const rawPath = window.location.pathname;
    const { pathname: stripped } = stripLocalePrefix(rawPath === '/index.html' ? '/' : rawPath);
    const path = stripped.replace(/\/$/, '') || '/';
    const hashId = (window.location.hash || '').slice(1);
    const marketingHash = MARKETING_SECTION_IDS.has(hashId);

    syncHtmlRouteSurface(resolveRouteSurface(path), path);

    if (path === '/' && !marketingHash) {
        applyHomeMarketingVisibility();
        return;
    }

    if (marketingHash || MARKETING_PATH_ALIASES.has(path)) {
        document.querySelectorAll('section[id]').forEach((section) => {
            const shouldShow = MARKETING_SECTION_IDS.has(section.id);
            section.classList.toggle('hidden', !shouldShow);
            section.style.display = shouldShow ? 'block' : 'none';
        });
        document.body.classList.remove('app-route-active', 'ib-premium-route-active');
        return;
    }

    const routeMap = {
        '/': 'home',
        '/ilanlar': 'ilanlar',
        '/karsilastir': 'compare',
        '/karar-asistani': 'page-karar-analizi',
        '/favoriler': 'favoriler',
        '/gecmis': 'history',
        '/profil': 'profil',
        '/messages': 'messages',
        '/ilan-ekle': 'add-listing'
    };

    const premiumRouteMap = {
        '/karar-analizi': 'page-karar-analizi',
        '/metodoloji': 'page-metodoloji',
        '/planlar': 'page-planlar',
        '/karar-asistani': 'page-karar-analizi',
        '/duyurular': 'page-duyurular',
        '/kampanyalar': 'page-kampanyalar',
        '/blog': 'page-blog'
    };

    if (path.startsWith('/blog/') && path.length > '/blog/'.length) {
        showPremiumPageFallback('page-blog-post');
        return;
    }

    if (premiumRouteMap[path]) {
        showPremiumPageFallback(premiumRouteMap[path]);
        return;
    }

    document.body.classList.remove('ib-premium-route-active');

    const sectionId = routeMap[path] || (path.startsWith('/ilan/') ? 'listing-detail' : 'home');
    const homeSections = MARKETING_SECTION_IDS;

    document.querySelectorAll('section[id]').forEach((section) => {
        const shouldShowHome = sectionId === 'home' && homeSections.has(section.id);
        const shouldShowSection = section.id === sectionId;
        const shouldShow = shouldShowHome || shouldShowSection;

        section.classList.toggle('hidden', !shouldShow);
        section.style.display = shouldShow ? 'block' : 'none';
    });

    if (sectionId === 'compare') {
        const compareSection = document.getElementById('compare');
        if (compareSection) {
            compareSection.classList.remove('hidden');
            compareSection.style.display = 'block';
        }
        window.app?.ui?.renderComparison?.(window.app?.comparisonItems || []);
    }

    if (sectionId === 'listing-detail') {
        const listingId = path.split('/').filter(Boolean)[1];
        if (listingId) {
            window.app?.ui?.renderListingDetailLoading?.();
            window.app?.loadListingDetail?.(listingId);
        }
    }
}

window.addEventListener('DOMContentLoaded', applyProductionRouteVisibility);
