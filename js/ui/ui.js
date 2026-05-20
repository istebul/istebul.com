import { installListingsUI } from './listings-ui.js';
import { installComparisonUI } from './comparison-ui.js';
import { installAssistantUI } from './assistant-ui.js';
import { escapeHtml as escapeHtmlValue, safeImageUrl as sanitizeImageUrl, safeUrl } from '../core/security.js';
// UI Manager
import { state } from '../core/state.js';

export class UIManager {
    constructor() {
        this.notifications = [];
    }

    init() {
        this.setupTheme();
        this.setupGlobalUI();
        this.setupResponsiveNav();
        this.setupKeyboardShortcuts();
    }


    setupTheme() {
        const savedTheme = localStorage.getItem('istebu_theme');
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
        this.applyTheme(initialTheme);

        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
                localStorage.setItem('istebu_theme', nextTheme);
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
        const navToggle = document.createElement('button');
        navToggle.className = 'nav-toggle';
        navToggle.type = 'button';
        navToggle.setAttribute('aria-label', 'Menüyü aç');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.innerHTML = '<i data-lucide="menu"></i>';
        navToggle.style.display = 'none';

        document.querySelector('.nav-container').insertBefore(navToggle, navMenu);

        if (navMenu && navAuth && !document.getElementById('mobile-auth-actions')) {
            const mobileAuthActions = document.createElement('div');
            mobileAuthActions.id = 'mobile-auth-actions';
            mobileAuthActions.className = 'mobile-auth-actions';
            mobileAuthActions.innerHTML = `
                <button type="button" class="btn btn-outline" data-mobile-login>Giriş Yap</button>
                <button type="button" class="btn btn-primary" data-mobile-register>Üye Ol</button>
            `;
            navMenu.append(mobileAuthActions);
        }

        navToggle.addEventListener('click', () => {
            const isOpen = navMenu.classList.toggle('show');
            navToggle.setAttribute('aria-expanded', String(isOpen));
            navToggle.setAttribute('aria-label', isOpen ? 'Menüyü kapat' : 'Menüyü aç');
        });

        // Show/hide toggle based on screen size
        const navCompactBreakpoint = 1180;
        const checkScreenSize = () => {
            if (window.innerWidth < navCompactBreakpoint) {
                navToggle.style.display = 'inline-flex';
                navToggle.setAttribute('aria-expanded', 'false');
                navToggle.setAttribute('aria-label', 'Menüyü aç');
                navMenu.classList.remove('show');
            } else {
                navToggle.style.display = 'none';
                navMenu.classList.add('show');
            }
        };

        window.addEventListener('resize', checkScreenSize);
        checkScreenSize();
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
        // Load Lucide icons
        if (typeof lucide !== 'undefined') {
            window.lucide?.createIcons();
        }
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
        const navUser = document.getElementById('nav-user');
        const navMessages = document.getElementById('nav-messages');

        if (user) {
            navAuth.style.display = 'none';
            navUser.style.display = 'flex';
            if (navMessages) navMessages.style.display = 'block';
        } else {
            navAuth.style.display = 'flex';
            navUser.style.display = 'none';
            if (navMessages) navMessages.style.display = 'none';
        }
    }

    updateUserUI(profile) {
        const userName = document.getElementById('user-name');
        if (userName && profile) {
            userName.textContent = profile.full_name || profile.email;
        }
        this.renderProfile(profile);
    }

    renderProfile(profile) {
        const profileSection = document.getElementById('profil');
        if (!profileSection) return;

        const profileCard = profileSection.querySelector('.profile-card');
        if (!profileCard) return;

        if (profile && (profile.full_name || profile.email)) {
            profileCard.innerHTML = `
                <h3>Merhaba, ${this.escapeHtml(profile.full_name || profile.email)}</h3>
                <p>Hesabınız hazır. Profil bilgilerinizi güncelleyebilir, seçeneklerinızı yönetebilir ve favorilerinizi takip edebilirsiniz.</p>
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
                <p>Giriş yaparak profil bilgilerinizi görebilir ve ilan oluşturabilirsiniz.</p>
                <button class="btn btn-primary" id="profile-login-btn">Giriş Yap veya Kayıt Ol</button>
            `;
        }

        this.loadIcons();
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
            <a href="/ilanlar/" data-category="${this.escapeHtml(category.id)}" class="${category.id === activeCategory ? 'active' : ''}">${this.escapeHtml(category.name)} Seçenekleri</a>
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


    async renderDecisionAssistant(...args) {
        installAssistantUI(this.constructor);
        return this.renderDecisionAssistant(...args);
    }

    getListingLocationLabel(listing = {}) {
        if (listing.province) return listing.province + (listing.district ? '/' + listing.district : ' geneli');
        return listing.location || 'Konum belirtilmemiş';
    }

    getListingPrimaryActionLabel(categoryId) {
        const labels = {
            arac: 'İlana Git',
            ev: 'Emlak Kaynağı',
            tatil: 'Paketi Gör'
        };
        return labels[categoryId] || 'İlana Git';
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

        return [...base, 'Karar skoru ' + aiScore + '/100'].slice(0, 4);
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
            countLabel.textContent = count === 0 ? 'Size uygun seçenekler hazırlanıyor' : (count === 1 ? '1 sonuç' : this.formatPrice(count) + ' sonuç');
        }
        if (contextLabel) {
            contextLabel.textContent = this.getListingToolbarContext(options, count);
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

        if (options.ownedOnly || options.userId) return count ? 'Yayınladığınız ilanlar' : 'Henüz ilan yayınlamadınız';
        if (!count) return 'Henüz ilan yok. İlk ilan yayınlandığında burada görünecek.';
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
                    <p>İlan detayları hazırlanıyor...</p>
                </div>
            </div>
        `;
    }

    renderListingDetailEmpty(message = 'İlan detayları bulunamadı.') {
        const section = document.getElementById('listing-detail-content');
        if (!section) return;

        section.innerHTML = `
            <div class="listing-detail-card listing-detail-premium">
                <div class="empty-state">
                    <i data-lucide="search-x"></i>
                    <h3>İlan bulunamadı</h3>
                    <p>${this.escapeHtml(message)}</p>
                    <div class="listing-actions">
                        <a href="/" class="btn btn-outline" data-native-route>Ana sayfaya dön</a>
                        <a href="/ilanlar/" class="btn btn-primary" data-native-route>Seçenekleri incele</a>
                    </div>
                </div>
            </div>
        `;

        this.loadIcons();
    }

    renderListingDetail(listing, favoriteIds = [], decisionProfile = null, comparisonSignatures = []) {
        const section = document.getElementById('listing-detail-content');
        if (!section) return;

        const listingId = this.escapeHtml(listing.id);
        const imageUrl = this.safeImageUrl(listing.images?.[0]);
        const externalUrl = this.safeExternalUrl(listing.external_url);
        const isFavorite = favoriteIds.includes(listing.id.toString());
        const isCompared = (Array.isArray(comparisonSignatures) ? comparisonSignatures : []).map(String).includes(this.getListingComparisonSignature(listing));
        const locationLabel = this.getListingLocationLabel(listing);
        const categoryLabel = this.getCategoryLabel(listing.category || '');
        const aiScore = decisionProfile?.score || this.getListingQualityScore(listing);
        const actionLabel = this.getListingPrimaryActionLabel(listing.category || '');
        section.innerHTML = `
            <div class="listing-detail-card listing-detail-premium">
                <div class="listing-detail-header">
                    <div>
                        <span class="assistant-kicker">${this.escapeHtml(categoryLabel || 'İlan')} detay analizi</span>
                        <h2>${this.escapeHtml(listing.title)}</h2>
                        <div class="listing-detail-badges">
                            <span><i data-lucide="sparkles"></i> Karar skoru ${this.escapeHtml(aiScore)}/100</span>
                            <span><i data-lucide="map-pin"></i> ${this.escapeHtml(locationLabel)}</span>
                            <span><i data-lucide="clock-3"></i> ${this.formatDate(listing.created_at)}</span>
                        </div>
                    </div>
                    <p class="listing-price">${this.formatPrice(listing.price)} ₺</p>
                </div>
                <div class="listing-detail-body">
                    <div class="listing-detail-image">
                        <img src="${imageUrl}" alt="${this.escapeHtml(listing.title)}">
                    </div>
                    <div class="listing-detail-info">
                        ${this.getListingInsightsMarkup(listing, aiScore)}
                        <p><strong>Açıklama:</strong></p>
                        <p>${this.escapeHtml(listing.description || 'Açıklama bulunamadı.')}</p>
                        <div class="listing-actions">
                            <button class="btn ${isFavorite ? 'btn-primary' : 'btn-outline'}" data-action="favorite" data-listing-id="${listingId}"><i data-lucide="heart"></i> ${isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}</button>
                            <button class="btn ${isCompared ? 'btn-primary' : 'btn-outline'}" data-action="compare" data-listing-id="${listingId}"><i data-lucide="${isCompared ? 'check' : 'columns-3'}"></i> ${isCompared ? 'Karşılaştırmada' : 'Karşılaştır'}</button>
                            <a href="/karar-asistani/" class="btn btn-outline"><i data-lucide="sparkles"></i> Asistanda analiz et</a>
                            <a href="${externalUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary"><i data-lucide="external-link"></i> ${this.escapeHtml(actionLabel)}</a>
                        </div>
                    </div>
                </div>
                ${this.getListingDetailDecisionMarkup(decisionProfile, listing)}
            </div>
        `;

        this.loadIcons();
    }


    getListingDetailDecisionMarkup(profile, listing = {}) {
        if (!profile) return '';
        const maxValues = {
            price: Math.max(Number(profile.price || 0), 1),
            periodicCost: Math.max(Number(profile.periodicCost || 0), 1),
            monthlyPayment: Math.max(Number(profile.monthlyPayment || 0), 1)
        };
        const actionProfile = {
            channels: [{ url: listing.external_url || 'https://www.sahibinden.com/' }]
        };
        return '<section class="listing-detail-decision">' +
            '<div class="listing-detail-decision-head">' +
                '<div><span class="assistant-kicker">Karar değerlendirmesi</span><h3>' + this.escapeHtml(profile.riskLevel || 'Karar analizi') + '</h3><p>' + this.escapeHtml(profile.comment || '') + '</p></div>' +
                '<div class="listing-detail-score"><strong>' + this.escapeHtml(profile.score || '-') + '</strong><span>/100</span></div>' +
            '</div>' +
            '<div class="comparison-metrics listing-detail-metrics">' +
                '<div><span>Ana bedel</span><strong>' + this.formatPrice(profile.price || 0) + ' ₺</strong></div>' +
                '<div><span>Dönemsel maliyet</span><strong>' + this.formatPrice(profile.periodicCost || 0) + ' ₺</strong></div>' +
                '<div><span>Aylık ödeme</span><strong>' + this.formatPrice(profile.monthlyPayment || 0) + ' ₺</strong></div>' +
                '<div><span>Toplam geri ödeme</span><strong>' + this.formatPrice(profile.totalPayment || 0) + ' ₺</strong></div>' +
            '</div>' +
            this.getCostBreakdownMarkup(profile) +
            this.getComparisonGraphMarkup(profile, maxValues) +
            (profile.tags?.length ? '<div class="comparison-tags">' + profile.tags.map((tag) => '<span>' + this.escapeHtml(tag) + '</span>').join('') + '</div>' : '') +
            this.getListingDetailRowsMarkup(profile.calculationRows) +
            this.getRecommendationActionPlanMarkup(profile.categoryId || listing.category, actionProfile) +
        '</section>';
    }

    getListingDetailRowsMarkup(rows = []) {
        if (!Array.isArray(rows) || !rows.length) return '';
        return '<div class="listing-detail-rows">' + rows.slice(0, 6).map((row) =>
            '<div><span>' + this.escapeHtml(row.label) + '</span><strong>' + this.formatPrice(row.value || 0) + ' ₺</strong><small>' + this.escapeHtml(row.note || '') + '</small></div>'
        ).join('') + '</div>';
    }

    renderFavorites(favorites) {
        const container = document.getElementById('favorites-grid');
        if (!container) return;

        if (!favorites.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="heart"></i>
                    <h3>Henüz favori ilan yok</h3>
                    <p>Bir ilana göz atın ve kalp ikonuna basarak favorilerinize ekleyin.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = favorites.map(listing => `
            <div class="favorite-card">
                <div class="favorite-card-body">
                    <h4>${this.escapeHtml(listing.title)}</h4>
                    <p>${this.escapeHtml(listing.location || 'Konum belirtilmemiş')}</p>
                    <p class="listing-price">${this.formatPrice(listing.price)} ₺</p>
                    <div class="listing-actions">
                        <button class="btn btn-outline" data-favorite-id="${this.escapeHtml(listing.id)}"><i data-lucide="heart-off"></i> Kaldır</button>
                        <button class="btn btn-outline" data-action="detail" data-listing-id="${this.escapeHtml(listing.id)}"><i data-lucide="eye"></i> Detay</button>
                        <button class="btn btn-outline" data-action="compare" data-listing-id="${this.escapeHtml(listing.id)}"><i data-lucide="columns-3"></i> Karşılaştır</button>
                        <a href="${this.safeExternalUrl(listing.external_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary"><i data-lucide="external-link"></i> İlanı Gör</a>
                    </div>
                </div>
            </div>
        `).join('');

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
            tatil: 'Tatil'
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
        if (element) {
            element.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Yükleniyor...</p>
                </div>
            `;
        }
    }

    hideLoading(_container) {
        // Loading is hidden when content is rendered
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

    safeExternalUrl(url) {
        return safeUrl(url);
    }

    formatPrice(price) {
        return new Intl.NumberFormat('tr-TR').format(price);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Şimdi';
        if (minutes < 60) return `${minutes} dakika önce`;
        if (hours < 24) return `${hours} saat önce`;
        if (days < 7) return `${days} gün önce`;

        return date.toLocaleDateString('tr-TR');
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
        list.innerHTML = messages.map(msg => `
            <div class="message ${msg.sender_id === currentUserId ? 'sent' : 'received'}">
                <div class="message-content">${this.escapeHtmlValue(msg.content)}</div>
                <div class="message-time">${new Date(msg.created_at).toLocaleTimeString()}</div>
            </div>
        `).join('');
        list.scrollTop = list.scrollHeight;
    }
}

export default UIManager;
