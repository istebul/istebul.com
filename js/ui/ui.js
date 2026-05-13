import { createIcons, icons } from 'lucide';
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
            createIcons({ icons });
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
                <p>Hesabınız hazır. Profil bilgilerinizi güncelleyebilir, ilanlarınızı yönetebilir ve favorilerinizi takip edebilirsiniz.</p>
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

    showAdminLink() {
        const adminLink = document.getElementById('admin-link');
        if (adminLink) {
            adminLink.style.display = 'block';
        }
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
            <a href="/ilanlar" data-category="${this.escapeHtml(category.id)}" class="${category.id === activeCategory ? 'active' : ''}">${this.escapeHtml(category.name)} İlanları</a>
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


    renderDecisionAssistant(assistantConfig, activeCategory, answers = {}, wizardState = {}) {
        const categoryRail = document.getElementById('assistant-category-rail');
        const progress = document.getElementById('assistant-progress');
        const questionsContainer = document.getElementById('assistant-questions');
        const actionsContainer = document.querySelector('#decision-assistant-form .assistant-actions');
        const resultsContainer = document.getElementById('assistant-results');
        if (!categoryRail || !progress || !questionsContainer || !assistantConfig[activeCategory]) return;

        const categories = Object.entries(assistantConfig);
        const activeConfig = assistantConfig[activeCategory];
        const steps = Array.isArray(wizardState.steps) && wizardState.steps.length ? wizardState.steps : [{
            id: 'questions',
            label: 'Sorular',
            eyebrow: '1. adım',
            description: activeConfig.description,
            questions: activeConfig.questions
        }];
        const stepIndex = Math.max(0, Math.min(Number(wizardState.stepIndex || 0), steps.length - 1));
        const activeStep = steps[stepIndex];
        const visibleQuestionIds = new Set(activeStep.questions.map((question) => question.id));

        categoryRail.innerHTML = categories.map(([categoryId, category]) =>
            '<button type="button" class="assistant-category ' + (categoryId === activeCategory ? 'active' : '') + '" data-assistant-category="' + this.escapeHtml(categoryId) + '">' +
                '<i data-lucide="' + this.escapeHtml(category.icon) + '"></i>' +
                '<span>' + this.escapeHtml(category.name) + '</span>' +
                '<small>' + this.escapeHtml(category.description || 'Karar akışı') + '</small>' +
            '</button>'
        ).join('');

        progress.innerHTML =
            '<div class="assistant-progress-head">' +
                '<div>' +
                    '<span class="assistant-kicker">' + this.escapeHtml(activeConfig.name) + ' karar asistanı</span>' +
                    '<h3>' + this.escapeHtml(activeStep.label) + '</h3>' +
                    '<p>' + this.escapeHtml(activeStep.description || activeConfig.description) + '</p>' +
                '</div>' +
                '<span class="assistant-step-count">' + this.escapeHtml(stepIndex + 1) + '/' + this.escapeHtml(steps.length) + '</span>' +
            '</div>' +
            this.getAssistantWizardTimelineMarkup(steps, stepIndex);

        const hiddenInputs = activeConfig.questions
            .filter((question) => !visibleQuestionIds.has(question.id) && answers[question.id] !== undefined)
            .map((question) => '<input type="hidden" name="' + this.escapeHtml(question.id) + '" value="' + this.escapeHtml(answers[question.id] || '') + '">')
            .join('');

        questionsContainer.innerHTML =
            '<div class="assistant-step-intro">' +
                '<span class="assistant-kicker">' + this.escapeHtml(activeStep.eyebrow || 'Adım') + '</span>' +
                '<h4>' + this.escapeHtml(activeStep.label) + '</h4>' +
                '<p>' + this.escapeHtml(activeStep.description || '') + '</p>' +
            '</div>' +
            hiddenInputs +
            activeStep.questions.map((question, questionIndex) => this.getAssistantQuestionMarkup(question, questionIndex, answers)).join('');

        if (actionsContainer) {
            actionsContainer.innerHTML = this.getAssistantWizardActionsMarkup(stepIndex, steps.length);
        }

        if (resultsContainer && !Object.keys(answers).length) {
            resultsContainer.innerHTML = '';
        }

        this.loadIcons();
    }

    getAssistantWizardTimelineMarkup(steps, activeIndex) {
        const flow = [{ id: 'category', label: 'Kategori', done: true }].concat(steps).concat([{ id: 'result', label: 'Sonuç' }]);
        return '<div class="assistant-wizard-steps">' + flow.map((step, index) => {
            const questionIndex = index - 1;
            const isCategory = index === 0;
            const isResult = index === flow.length - 1;
            const isActive = !isCategory && !isResult && questionIndex === activeIndex;
            const isDone = isCategory || (!isResult && questionIndex < activeIndex);
            const stateClass = isActive ? 'active' : isDone ? 'done' : 'pending';
            return '<div class="assistant-wizard-step ' + stateClass + '">' +
                '<span>' + this.escapeHtml(index + 1) + '</span>' +
                '<strong>' + this.escapeHtml(step.label) + '</strong>' +
            '</div>';
        }).join('') + '</div>';
    }

    getAssistantQuestionMarkup(question, questionIndex, answers = {}) {
        const isChoiceQuestion = !['select', 'number'].includes(question.type);
        const fallbackValue = isChoiceQuestion ? question.options?.[0]?.value : '';
        const selected = answers[question.id] ?? fallbackValue;
        const questionClass = question.type === 'select' ? 'select-question' : question.type === 'number' ? 'number-question' : '';
        const body = question.type === 'select'
            ? this.getSelectQuestionMarkup(question, selected)
            : question.type === 'number'
                ? this.getNumberQuestionMarkup(question, selected)
                : '<div class="assistant-options">' + (Array.isArray(question.options) ? question.options : []).map((option) => {
                    const inputId = 'assistant-' + question.id + '-' + option.value;
                    return '<label class="assistant-option" for="' + this.escapeHtml(inputId) + '">' +
                        '<input type="radio" id="' + this.escapeHtml(inputId) + '" name="' + this.escapeHtml(question.id) + '" value="' + this.escapeHtml(option.value) + '" ' + (selected === option.value ? 'checked' : '') + '>' +
                        '<span>' + this.escapeHtml(option.label) + '</span>' +
                    '</label>';
                }).join('') + '</div>';

        return '<fieldset class="assistant-question ' + questionClass + '">' +
            '<legend><span>' + this.escapeHtml(questionIndex + 1) + '</span>' + this.escapeHtml(question.label) + '</legend>' +
            body +
        '</fieldset>';
    }

    getAssistantWizardActionsMarkup(stepIndex, stepCount) {
        const isFirst = stepIndex <= 0;
        const isLast = stepIndex >= stepCount - 1;
        return (isFirst ? '' : '<button type="button" class="btn btn-outline" data-assistant-prev><i data-lucide="arrow-left"></i> Önceki</button>') +
            '<button type="button" class="btn btn-outline" data-assistant-reset><i data-lucide="rotate-ccw"></i> Temizle</button>' +
            (isLast
                ? '<button type="submit" class="btn btn-primary"><i data-lucide="sparkles"></i> Sonucu hesapla</button>'
                : '<button type="button" class="btn btn-primary" data-assistant-next>Devam et <i data-lucide="arrow-right"></i></button>');
    }


    getNumberQuestionMarkup(question, selected) {
        const placeholder = question.placeholder || 'Tutar yazın';
        const min = Number.isFinite(Number(question.min)) ? question.min : 0;
        const step = Number.isFinite(Number(question.step)) ? question.step : 1000;
        return `
            <div class="assistant-number-field">
                <input class="assistant-select assistant-number-input" type="number" inputmode="numeric" name="${this.escapeHtml(question.id)}" value="${this.escapeHtml(selected || '')}" min="${this.escapeHtml(min)}" step="${this.escapeHtml(step)}" placeholder="${this.escapeHtml(placeholder)}" ${question.required === false ? '' : 'required'}>
                <span>TL</span>
            </div>
        `;
    }
    getSelectQuestionMarkup(question, selected) {
        const placeholder = question.placeholder || 'Seçim yapın';
        const options = Array.isArray(question.options) ? question.options : [];
        return `
            <select class="assistant-select" name="${this.escapeHtml(question.id)}" ${question.required ? 'required' : ''}>
                <option value="">${this.escapeHtml(placeholder)}</option>
                ${options.map((option) => `
                    <option value="${this.escapeHtml(option.value)}" ${selected === option.value ? 'selected' : ''}>${this.escapeHtml(option.label)}</option>
                `).join('')}
            </select>
        `;
    }

    renderDecisionResults(result) {
        const container = document.getElementById('assistant-results');
        if (!container) return;

        const primary = result.recommendations[0];
        if (!primary) {
            container.innerHTML =
                '<div class="empty-state">' +
                    '<i data-lucide="search-x"></i>' +
                    '<h3>Sonuç üretilemedi</h3>' +
                    '<p>Cevaplarınızı değiştirerek tekrar deneyin.</p>' +
                '</div>';
            this.loadIcons();
            return;
        }

        const bestFinance = primary.financeComparisons?.[0];

        container.innerHTML =
            '<section class="assistant-decision-panel">' +
                '<div class="assistant-result-header assistant-decision-hero">' +
                    '<div>' +
                        '<span class="assistant-kicker">AI karar paneli</span>' +
                        '<h3>' + this.escapeHtml(primary.name) + '</h3>' +
                        '<p>' + this.escapeHtml(result.summary) + '</p>' +
                        '<div class="assistant-result-badges">' +
                            '<span><i data-lucide="map-pin"></i>' + this.escapeHtml(result.categoryName) + '</span>' +
                            '<span><i data-lucide="shield-check"></i>Güven skoru ' + this.escapeHtml(primary.score) + '/100</span>' +
                            (result.dataHealth ? '<span><i data-lucide="database-zap"></i>Veri güveni ' + this.escapeHtml(result.dataHealth.confidenceScore) + '/100</span>' : '') +
                            '<span><i data-lucide="clock-3"></i>' + this.escapeHtml(this.formatDate(result.createdAt)) + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="assistant-score assistant-score-large">' +
                        '<strong>' + this.escapeHtml(primary.score) + '</strong>' +
                        '<span>/100</span>' +
                    '</div>' +
                '</div>' +
                '<div class="assistant-decision-toolbar">' +
                    '<button type="button" class="btn btn-outline" data-assistant-edit="0"><i data-lucide="sliders-horizontal"></i> Kriterleri güncelle</button>' +
                    '<button type="button" class="btn btn-primary" data-browse-decision-listings><i data-lucide="list-checks"></i> Eşleşen seçenekleri aç</button>' +
                '</div>' +
                this.getExecutiveMetricsMarkup(result.categoryId, primary, bestFinance) +
                this.getDataHealthMarkup(result.dataHealth) +
                '<div class="assistant-answer-summary">' + result.answers.map((answer) =>
                    '<span><strong>' + this.escapeHtml(answer.label) + ':</strong> ' + this.escapeHtml(answer.value) + '</span>'
                ).join('') + '</div>' +
                this.getDecisionInsightMarkup(result.insight) +
                this.getChoiceSummaryMarkup(result.categoryId, result.recommendations) +
                '<div class="assistant-recommendations">' + result.recommendations.map((item, index) =>
                    '<article class="assistant-recommendation ' + (index === 0 ? 'featured' : '') + '">' +
                        this.getRecommendationVerdictMarkup(result.categoryId, item, index, result.recommendations) +
                        '<div class="assistant-recommendation-top">' +
                            '<div>' +
                                '<span class="assistant-rank">' + (index + 1) + '. seçenek</span>' +
                                '<h4>' + this.escapeHtml(item.name) + '</h4>' +
                                '<p>' + this.escapeHtml(item.scoreNote) + '</p>' +
                            '</div>' +
                            '<strong class="assistant-price">' + this.formatPrice(item.price) + ' ₺</strong>' +
                        '</div>' +
                        this.getRecommendationHighlightsMarkup(item) +
                        '<div class="assistant-recommendation-actions"><button type="button" class="btn btn-outline" data-compare-recommendation="' + this.escapeHtml(index) + '"><i data-lucide="columns-3"></i> Karşılaştırmaya ekle</button></div>' +
                        this.getRecommendationDetailsMarkup(item.details) +
                        this.getRealisticCommentMarkup(item.realisticComment) +
                        this.getRecommendationSourceTraceMarkup(item.sourceTrace) +
                        this.getScoreBreakdownMarkup(item.scoreBreakdown, item.decisionTags) +
                        this.getCategoryCalculationMarkup(item.calculationTable) +
                        this.getCostChartMarkup(item.costChart) +
                        '<div class="assistant-cost-grid">' +
                            this.getCostMarkup(item.costs) +
                            '<div class="assistant-cost total"><span>' + this.escapeHtml(item.calculationTable?.totalLabel || 'Toplam dönemsel maliyet') + '</span><strong>' + this.formatPrice(item.yearlyCost) + ' ₺</strong></div>' +
                        '</div>' +
                        '<div class="assistant-finance"><h5>Banka kredi karşılaştırması</h5>' + this.getFinanceMarkup(item.financeComparisons) + '</div>' +
                        this.getRecommendationActionPlanMarkup(result.categoryId, item) +
                        '<div class="assistant-channels"><h5>Nereden bakabilirsiniz?</h5><div>' + this.getChannelsMarkup(item.channels) + '</div></div>' +
                    '</article>'
                ).join('') + '</div>' +
            '</section>';

        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.loadIcons();
    }

    getDecisionMetricMarkup(label, value, note, icon) {
        return '<article class="assistant-executive-metric">' +
            '<i data-lucide="' + this.escapeHtml(icon) + '"></i>' +
            '<span>' + this.escapeHtml(label) + '</span>' +
            '<strong>' + this.escapeHtml(value) + '</strong>' +
            '<small>' + this.escapeHtml(note) + '</small>' +
        '</article>';
    }

    getExecutiveMetricsMarkup(categoryId, primary, bestFinance) {
        const totalPayment = bestFinance?.totalPayment || 0;
        const monthlyPayment = bestFinance?.monthlyPayment || 0;
        const labelSets = {
            arac: {
                price: 'Araç bedeli',
                period: 'Yıllık sahip olma',
                periodNote: 'Yakıt/enerji, kasko, sigorta ve bakım',
                monthly: 'En düşük taşıt kredisi',
                total: 'Toplam kredi geri ödeme'
            },
            ev: {
                price: 'Konut alım bedeli',
                period: 'Yıllık konut gideri',
                periodNote: 'Aidat/bakım, sigorta, vergi ve yenileme',
                monthly: 'Konut kredisi taksiti',
                total: 'Toplam kredi geri ödeme'
            },
            tatil: {
                price: 'Tatil paket bütçesi',
                period: 'Seyahat ek gideri',
                periodNote: 'Konaklama, ulaşım, aktivite ve sigorta',
                monthly: 'Tatil finansmanı',
                total: 'Toplam ödeme simülasyonu'
            }
        };
        const labels = labelSets[categoryId] || labelSets.arac;
        return '<div class="assistant-executive-metrics">' +
            this.getDecisionMetricMarkup(labels.price, this.formatPrice(primary.price) + ' ₺', 'Seçilen kategoriye özel tahmini ana bedel', 'wallet') +
            this.getDecisionMetricMarkup(labels.period, this.formatPrice(primary.yearlyCost) + ' ₺', labels.periodNote, 'calculator') +
            this.getDecisionMetricMarkup(labels.monthly, this.formatPrice(monthlyPayment) + ' ₺', bestFinance ? bestFinance.bank + ' simülasyonu' : 'Banka verisi yok', 'landmark') +
            this.getDecisionMetricMarkup(labels.total, this.formatPrice(totalPayment) + ' ₺', bestFinance ? bestFinance.term + ' ay vade' : 'Simülasyon bekliyor', 'receipt') +
        '</div>';
    }

    getRecommendationDetailsMarkup(details = []) {
        if (!Array.isArray(details) || !details.length) return '';
        return '<div class="assistant-detail-grid">' + details.map((detail) =>
            '<div class="assistant-detail-item">' +
                '<span>' + this.escapeHtml(detail.label) + '</span>' +
                '<strong>' + this.escapeHtml(detail.value) + '</strong>' +
            '</div>'
        ).join('') + '</div>';
    }

    getRealisticCommentMarkup(comment) {
        if (!comment) return '';
        return '<article class="assistant-realistic-comment">' +
            '<span class="assistant-kicker">Gerçekçi yorum</span>' +
            '<p>' + this.escapeHtml(comment) + '</p>' +
        '</article>';
    }


    getDataHealthMarkup(dataHealth) {
        if (!dataHealth) return '';
        const sources = Array.isArray(dataHealth.sources) ? dataHealth.sources : [];
        return '<section class="assistant-data-health">' +
            '<div class="assistant-data-health-head">' +
                '<div>' +
                    '<span class="assistant-kicker">Veri güven merkezi</span>' +
                    '<h4>' + this.escapeHtml(dataHealth.confidenceLabel || 'Veri güveni') + '</h4>' +
                    '<p>' + this.escapeHtml(dataHealth.modeLabel || '') + ' · ' + this.escapeHtml(dataHealth.updatedAtLabel || '') + '</p>' +
                '</div>' +
                '<div class="assistant-data-confidence"><strong>' + this.escapeHtml(dataHealth.confidenceScore || '-') + '</strong><span>/100</span></div>' +
            '</div>' +
            '<div class="assistant-data-health-grid">' +
                '<div><span>Hazır kaynak</span><strong>' + this.escapeHtml(dataHealth.readySourceCount || 0) + '/' + this.escapeHtml(dataHealth.sourceCount || 0) + '</strong></div>' +
                '<div><span>Kredi ürünü</span><strong>' + this.escapeHtml(dataHealth.financeProductCount || 0) + '</strong></div>' +
                '<div><span>Hesap kalemi</span><strong>' + this.escapeHtml(dataHealth.calculationCount || 0) + '</strong></div>' +
                '<div><span>Sağlayıcı</span><strong>' + this.escapeHtml(dataHealth.liveProvidersEnabled ? 'Canlı' : 'Hazır') + '</strong></div>' +
            '</div>' +
            (sources.length ? '<div class="assistant-source-list">' + sources.map((source) => this.getSourcePillMarkup(source)).join('') + '</div>' : '') +
            '<p class="assistant-data-note">' + this.escapeHtml(dataHealth.providerNote || '') + '</p>' +
        '</section>';
    }

    getRecommendationSourceTraceMarkup(trace) {
        if (!trace) return '';
        const sources = Array.isArray(trace.sources) ? trace.sources : [];
        return '<section class="assistant-source-trace">' +
            '<div class="assistant-source-trace-head">' +
                '<div><span class="assistant-kicker">Veri izi</span><h5>' + this.escapeHtml(trace.sourceSummary || 'Kaynak özeti') + '</h5></div>' +
                '<small>' + this.escapeHtml(trace.updatedAtLabel || '') + '</small>' +
            '</div>' +
            '<p>' + this.escapeHtml(trace.calculationSummary || '') + '</p>' +
            (sources.length ? '<div class="assistant-source-list compact">' + sources.map((source) => this.getSourcePillMarkup(source)).join('') + '</div>' : '') +
        '</section>';
    }

    getSourcePillMarkup(source) {
        const content = '<span>' + this.escapeHtml(source.type || 'Kaynak') + '</span><strong>' + this.escapeHtml(source.name || 'Veri kaynağı') + '</strong><small>' + this.escapeHtml(source.status || source.cadence || '') + '</small>';
        if (source.url) {
            return '<a class="assistant-source-pill" href="' + this.safeExternalUrl(source.url) + '" target="_blank" rel="noopener noreferrer">' + content + '</a>';
        }
        return '<div class="assistant-source-pill">' + content + '</div>';
    }

    getCategoryCalculationMarkup(table) {
        if (!table || !Array.isArray(table.rows) || !table.rows.length) return '';
        return '<section class="assistant-calculation-table">' +
            '<div class="assistant-calculation-head">' +
                '<div><h5>' + this.escapeHtml(table.title || 'Hesaplama tablosu') + '</h5><p>' + this.escapeHtml(table.note || '') + '</p></div>' +
                '<strong>' + this.formatPrice(table.totalValue || 0) + ' ₺</strong>' +
            '</div>' +
            '<div class="assistant-calculation-rows">' + table.rows.map((row) =>
                '<div class="assistant-calculation-row">' +
                    '<div><span>' + this.escapeHtml(row.label) + '</span><small>' + this.escapeHtml(row.note || '') + '</small></div>' +
                    '<strong>' + this.formatPrice(row.value || 0) + ' ₺</strong>' +
                '</div>'
            ).join('') + '</div>' +
        '</section>';
    }

    getCostChartMarkup(chart = []) {
        if (!Array.isArray(chart) || !chart.length) return '';
        return '<section class="assistant-cost-chart">' +
            '<div class="assistant-chart-head"><h5>Grafikli maliyet dağılımı</h5><span>Kalemlerin toplam içindeki payı</span></div>' +
            '<div class="assistant-chart-bars">' + chart.map((item) =>
                '<div class="assistant-chart-row">' +
                    '<div><span>' + this.escapeHtml(item.label) + '</span><strong>' + this.formatPrice(item.value || 0) + ' ₺</strong></div>' +
                    '<i><b style="width: ' + this.escapeHtml(item.percent || 0) + '%"></b></i>' +
                    '<small>%' + this.escapeHtml(item.percent || 0) + '</small>' +
                '</div>'
            ).join('') + '</div>' +
        '</section>';
    }

    getChoiceSummaryMarkup(categoryId, recommendations = []) {
        const items = Array.isArray(recommendations) ? recommendations.slice(0, 3) : [];
        if (!items.length) return '';

        return '<section class="assistant-choice-summary">' +
            '<div class="assistant-choice-summary-head">' +
                '<div><span class="assistant-kicker">Seçim özeti</span><h4>İlk bakışta karar haritası</h4></div>' +
                '<small>Detaylı maliyet, kredi ve kaynak bilgileri kartların içinde devam eder.</small>' +
            '</div>' +
            '<div class="assistant-choice-grid">' + items.map((item, index) => this.getChoiceSummaryCardMarkup(categoryId, item, index, items)).join('') + '</div>' +
        '</section>';
    }

    getChoiceSummaryCardMarkup(categoryId, item, index, recommendations = []) {
        const verdict = this.getRecommendationVerdict(categoryId, item, index, recommendations);
        return '<article class="assistant-choice-card">' +
            '<span class="assistant-choice-rank">' + this.escapeHtml(index + 1) + '</span>' +
            '<div>' +
                '<strong>' + this.escapeHtml(verdict.label) + '</strong>' +
                '<p>' + this.escapeHtml(item.name || 'Seçenek') + '</p>' +
            '</div>' +
            '<small>' + this.escapeHtml(item.score || '-') + '/100 · ' + this.formatPrice(item.price || 0) + ' ₺</small>' +
        '</article>';
    }

    getRecommendationVerdict(categoryId, item = {}, index = 0, recommendations = []) {
        const prices = recommendations.map((entry) => Number(entry.price || 0)).filter((value) => value > 0);
        const costs = recommendations.map((entry) => Number(entry.yearlyCost || 0)).filter((value) => value > 0);
        const minPrice = prices.length ? Math.min(...prices) : 0;
        const minCost = costs.length ? Math.min(...costs) : 0;
        const categoryCopy = {
            arac: {
                primary: 'Araçta en dengeli karar skoru; sahip olma maliyeti ve finansman birlikte güçlü.',
                budget: 'Araç bedeli daha kontrollü; ekspertiz ve toplam sahip olma gideri yine doğrulanmalı.',
                cost: 'Yakıt, kasko, sigorta ve bakım tarafında daha sakin bir senaryo sunar.',
                alternative: 'Kullanım profili değişirse değerlendirilebilecek güçlü alternatif.'
            },
            ev: {
                primary: 'Konut tarafında lokasyon, likidite, yıllık gider ve kredi yükü birlikte dengeli.',
                budget: 'Alım bedeli daha erişilebilir; tapu, deprem ve m2 emsali ayrıca kontrol edilmeli.',
                cost: 'Aidat, bakım, vergi ve sigorta yükü daha kontrollü bir senaryo üretir.',
                alternative: 'Yaşam amacı veya yatırım beklentisi değişirse güçlü alternatif olabilir.'
            },
            tatil: {
                primary: 'Tatil planında bütçe, sezon, ulaşım ve iptal esnekliği en dengeli noktada.',
                budget: 'Paket bedeli daha kontrollü; ulaşım ve ekstra harcamalar son fiyatı belirler.',
                cost: 'Konaklama dışı ulaşım, aktivite ve sigorta yükü daha kontrollü görünür.',
                alternative: 'Tatil tarzı veya tarih değişirse değerlendirilebilecek iyi alternatif.'
            }
        };
        const copy = categoryCopy[categoryId] || categoryCopy.arac;

        if (index === 0) {
            return { icon: 'badge-check', label: 'Önerilen seçim', text: copy.primary };
        }
        if (minPrice && Number(item.price || 0) === minPrice) {
            return { icon: 'wallet-cards', label: 'Bütçe odaklı', text: copy.budget };
        }
        if (minCost && Number(item.yearlyCost || 0) === minCost) {
            return { icon: 'trending-down', label: 'Düşük giderli', text: copy.cost };
        }
        return { icon: 'route', label: 'Alternatif senaryo', text: copy.alternative };
    }

    getRecommendationVerdictMarkup(categoryId, item = {}, index = 0, recommendations = []) {
        const verdict = this.getRecommendationVerdict(categoryId, item, index, recommendations);
        return '<div class="assistant-recommendation-verdict">' +
            '<span><i data-lucide="' + this.escapeHtml(verdict.icon) + '"></i>' + this.escapeHtml(verdict.label) + '</span>' +
            '<p>' + this.escapeHtml(verdict.text) + '</p>' +
        '</div>';
    }

    getRecommendationHighlightsMarkup(item) {
        const bestFinance = item.financeComparisons?.[0];
        return '<div class="assistant-recommendation-highlights">' +
            '<span><strong>' + this.escapeHtml(item.score) + '/100</strong> uygunluk</span>' +
            '<span><strong>' + this.escapeHtml(item.riskLevel || 'Kontrol gerekli') + '</strong> risk</span>' +
            '<span><strong>' + this.formatPrice(item.yearlyCost) + ' ₺</strong> dönemsel maliyet</span>' +
            '<span><strong>' + (bestFinance ? this.formatPrice(bestFinance.monthlyPayment) + ' ₺/ay' : 'Yok') + '</strong> en iyi kredi</span>' +
        '</div>';
    }

    getScoreBreakdownMarkup(scoreBreakdown = [], tags = []) {
        const breakdown = Array.isArray(scoreBreakdown) ? scoreBreakdown : [];
        const tagMarkup = (Array.isArray(tags) ? tags : []).map((tag) => '<span>' + this.escapeHtml(tag) + '</span>').join('');
        const rows = breakdown.map((item) =>
            '<li class="' + (item.positive ? 'positive' : 'negative') + '">' +
                '<span>' + this.escapeHtml(item.label) + '</span>' +
                '<strong>' + this.escapeHtml(item.status) + ' ' + (item.delta > 0 ? '+' : '') + this.escapeHtml(item.delta) + '</strong>' +
            '</li>'
        ).join('');

        return '<div class="assistant-score-breakdown">' +
            (tagMarkup ? '<div class="assistant-decision-tags">' + tagMarkup + '</div>' : '') +
            '<ul>' + rows + '</ul>' +
        '</div>';
    }


    getDecisionInsightMarkup(insight) {
        if (!insight) return '';

        const listMarkup = (items = []) => items.map((item) => `<li>${this.escapeHtml(item)}</li>`).join('');
        return `
            <article class="assistant-insight">
                <div>
                    <span class="assistant-kicker">AI açıklaması</span>
                    <h4>${this.escapeHtml(insight.headline)}</h4>
                </div>
                <div class="assistant-insight-grid">
                    <div>
                        <h5>Neden?</h5>
                        <ul>${listMarkup(insight.reasons)}</ul>
                    </div>
                    <div>
                        <h5>Dikkat</h5>
                        <ul>${listMarkup(insight.cautions)}</ul>
                    </div>
                    <div>
                        <h5>Sonraki adım</h5>
                        <ul>${listMarkup(insight.nextSteps)}</ul>
                    </div>
                </div>
            </article>
        `;
    }

    renderHistoryAuthGate() {
        const container = document.getElementById('history-list');
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state history-auth-gate">
                <i data-lucide="lock-keyhole"></i>
                <h3>Geçmiş için giriş yapın</h3>
                <p>Karar, bütçe, konum ve arama geçmişiniz yalnızca hesabınıza bağlı olarak saklanır.</p>
                <div class="history-auth-actions">
                    <button type="button" class="btn btn-primary" data-history-login><i data-lucide="log-in"></i> Giriş Yap</button>
                    <button type="button" class="btn btn-outline" data-history-register><i data-lucide="user-plus"></i> Üye Ol</button>
                </div>
            </div>
        `;
        this.loadIcons();
    }

    renderDecisionHistory(history = []) {
        const container = document.getElementById('history-list');
        if (!container) return;

        if (!history.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="clock"></i>
                    <h3>Geçmiş bulunamadı</h3>
                    <p>Akıllı karar akışını tamamladığınızda sonuçlar burada saklanacak.</p>
                </div>
            `;
            this.loadIcons();
            return;
        }

        container.innerHTML = history.map((item) => `
            <article class="decision-history-card">
                <div class="decision-history-main">
                    <div>
                        <span class="assistant-kicker">${this.escapeHtml(item.categoryName || 'Karar')}</span>
                        <h3>${this.escapeHtml(item.topPick?.name || 'Kaydedilen karar')}</h3>
                        <p>${this.escapeHtml(item.summary || 'Özet bulunamadı.')}</p>
                    </div>
                    <div class="decision-history-score">
                        <strong>${this.escapeHtml(item.topPick?.score || '-')}</strong>
                        <span>/100</span>
                    </div>
                </div>
                <div class="decision-history-metrics">
                    <span><strong>Fiyat:</strong> ${this.formatPrice(item.topPick?.price || 0)} ₺</span>
                    <span><strong>Dönemsel maliyet:</strong> ${this.formatPrice(item.topPick?.yearlyCost || 0)} ₺</span>
                    <span><strong>Aylık kredi:</strong> ${this.formatPrice(item.topPick?.monthlyPayment || 0)} ₺</span>
                    <span><strong>Tarih:</strong> ${this.formatDate(item.createdAt)}</span>
                </div>
                <div class="decision-history-answers">
                    ${(item.answers || []).map((answer) => `<span>${this.escapeHtml(answer.label)}: ${this.escapeHtml(answer.value)}</span>`).join('')}
                </div>
                <div class="decision-history-actions">
                    <button type="button" class="btn btn-primary" data-decision-repeat="${this.escapeHtml(item.id)}">
                        <i data-lucide="refresh-cw"></i> Tekrar aç
                    </button>
                    <button type="button" class="btn btn-outline" data-decision-delete="${this.escapeHtml(item.id)}">
                        <i data-lucide="trash-2"></i> Sil
                    </button>
                </div>
            </article>
        `).join('');

        this.loadIcons();
    }

    getCostMarkup(costs = []) {
        return costs.map((cost) => `
            <div class="assistant-cost">
                <span>${this.escapeHtml(cost.label)}</span>
                <strong>${this.formatPrice(cost.value)} ₺</strong>
            </div>
        `).join('');
    }

    getFinanceMarkup(financeComparisons = []) {
        return `
            <div class="assistant-finance-table">
                ${financeComparisons.map((finance) => `
                    <div class="assistant-finance-row">
                        <span>${this.escapeHtml(finance.bank)}</span>
                        <strong>${this.formatPrice(finance.monthlyPayment)} ₺/ay</strong>
                        <small>${this.escapeHtml(finance.term)} ay, %${this.escapeHtml(finance.rate)} aylık, kredi ${this.formatPrice(finance.principal)} ₺</small>
                    </div>
                `).join('')}
            </div>
        `;
    }


    getRecommendationActionPlanMarkup(categoryId, item = {}) {
        const firstChannel = item.channels?.[0]?.url || 'https://www.sahibinden.com/';
        const plans = {
            arac: [
                { icon: 'search-check', title: 'Gerçek ilanı doğrula', text: 'KM, tramer, fiyat ve satıcı bilgisini aynı model ilanlarla karşılaştırın.', url: firstChannel },
                { icon: 'landmark', title: 'Krediyi netleştir', text: 'Aylık taksit yerine toplam geri ödeme ve kredi kullandırım oranını kontrol edin.', url: 'https://www.hangikredi.com/kredi/tasit-kredisi' },
                { icon: 'shield-check', title: 'Sigorta + ekspertiz', text: 'Kasko, trafik sigortası ve ekspertiz sonucu olmadan kapora göndermeyin.', url: 'https://www.sigortam.net/' }
            ],
            ev: [
                { icon: 'map-pinned', title: 'Emsal ilan analizi', text: 'Aynı il/ilçede m2, bina yaşı, aidat ve ulaşım etkisini yan yana okuyun.', url: firstChannel },
                { icon: 'landmark', title: 'Konut kredisi', text: 'Ekspertiz değeri, peşinat ihtiyacı ve toplam geri ödeme planını netleştirin.', url: 'https://www.hangikredi.com/kredi/konut-kredisi' },
                { icon: 'file-check-2', title: 'Tapu + deprem kontrolü', text: 'Tapu, imar, DASK, deprem performansı ve aidat borcunu satın alma öncesi doğrulayın.', url: 'https://www.tkgm.gov.tr/' }
            ],
            tatil: [
                { icon: 'calendar-check', title: 'Rezervasyon koşulu', text: 'Sezon, oda tipi, çocuk/ek kişi ücreti ve iptal şartını paket fiyatına dahil edin.', url: firstChannel },
                { icon: 'plane-takeoff', title: 'Ulaşımı karşılaştır', text: 'Uçuş saati, bagaj, transfer ve araç kiralama maliyetini ayrı görün.', url: 'https://www.enuygun.com/' },
                { icon: 'shield', title: 'Seyahat güveni', text: 'Sigorta, esnek tarih ve erken rezervasyon farkını son karar öncesi kontrol edin.', url: 'https://www.etstur.com/' }
            ]
        };
        const actions = plans[categoryId] || plans.arac;
        return '<section class="assistant-action-plan">' +
            '<div class="assistant-action-plan-head"><span class="assistant-kicker">Satın alma aksiyonları</span><h5>Kararı uygulamaya geçir</h5></div>' +
            '<div class="assistant-action-plan-grid">' + actions.map((action) =>
                '<a href="' + this.safeExternalUrl(action.url) + '" target="_blank" rel="noopener noreferrer" class="assistant-action-step">' +
                    '<i data-lucide="' + this.escapeHtml(action.icon) + '"></i>' +
                    '<strong>' + this.escapeHtml(action.title) + '</strong>' +
                    '<span>' + this.escapeHtml(action.text) + '</span>' +
                '</a>'
            ).join('') + '</div>' +
        '</section>';
    }

    getChannelsMarkup(channels = []) {
        return channels.map((channel) => `
            <a href="${this.safeExternalUrl(channel.url)}" target="_blank" rel="noopener noreferrer" class="assistant-channel">
                <i data-lucide="external-link"></i>
                ${this.escapeHtml(channel.label)}
            </a>
        `).join('');
    }

    setActiveCategory(categoryId, categories = []) {
        const label = document.getElementById('active-category-label');
        const category = categories.find((item) => item.id === categoryId);

        document.querySelectorAll('[data-category]').forEach((element) => {
            element.classList.toggle('active', !!categoryId && element.dataset.category === categoryId);
        });

        if (label) {
            label.textContent = category ? `${category.name} ilanları` : 'Son İlanlar';
        }
    }

    getCategoryVisualIcon(categoryId, fallbackIcon = "tag") {
        const visualIcons = {
            arac: "car-front",
            ev: "house",
            tatil: "plane-takeoff"
        };

        return visualIcons[categoryId] || fallbackIcon;
    }

    getCategoryCardMarkup(category, activeCategory = null) {
        return `
            <button type="button" class="category-card category-card-${this.escapeHtml(category.id)} ${category.id === activeCategory ? "active" : ""}" data-category="${this.escapeHtml(category.id)}">
                <span class="category-visual category-visual-${this.escapeHtml(category.id)}" aria-hidden="true">
                    <i data-lucide="${this.escapeHtml(this.getCategoryVisualIcon(category.id, category.icon))}"></i>
                </span>
                <h3>${this.escapeHtml(category.name)}</h3>
                <span class="category-count">${this.escapeHtml(category.count || 0)} ilan</span>
            </button>
        `;
    }

    getCategoryButtonMarkup(category, activeCategory = null) {
        return `
            <button type="button" class="category-card category-card-${this.escapeHtml(category.id)} ${category.id === activeCategory ? "active" : ""}" data-assistant-start="${this.escapeHtml(category.id)}">
                <span class="category-visual category-visual-${this.escapeHtml(category.id)}" aria-hidden="true">
                    <i data-lucide="${this.escapeHtml(this.getCategoryVisualIcon(category.id, category.icon))}"></i>
                </span>
                <span>${this.escapeHtml(category.name)}</span>
            </button>
        `;
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

        return [...base, 'AI ' + aiScore + '/100'].slice(0, 4);
    }

    getListingInsightsMarkup(listing = {}, aiScore = 0) {
        return '<div class="listing-insights">' + this.getListingInsightItems(listing, aiScore).map((item) => '<span>' + this.escapeHtml(item) + '</span>').join('') + '</div>';
    }

    getListingQualityScore(listing = {}) {
        const seed = String(listing.id || listing.title || '')
            .split('')
            .reduce((total, char) => total + char.charCodeAt(0), 0);
        const base = 78 + (seed % 13);
        const price = Number(listing.price || 0);
        const freshnessBonus = listing.created_at && (Date.now() - new Date(listing.created_at).getTime()) < 4 * 86400000 ? 4 : 0;
        const priceBonus = price > 0 && price < 1500000 ? 3 : price > 10000000 ? -2 : 1;
        const sourceBonus = listing.external_url ? 2 : 0;
        return Math.max(68, Math.min(97, base + freshnessBonus + priceBonus + sourceBonus));
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
            countLabel.textContent = count === 1 ? '1 sonuç' : this.formatPrice(count) + ' sonuç';
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
        if (!count) return 'Filtreleri genişleterek yeni sonuçlar bulun';
        return parts.length ? parts.join(' · ') : 'Türkiye geneli · AI skoruna göre keşif';
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


    renderListings(listings, favoriteIds = [], comparisonSignatures = [], options = {}) {
        const container = document.getElementById('listings-grid');
        if (!container) return;

        const comparedSignatures = new Set((Array.isArray(comparisonSignatures) ? comparisonSignatures : []).map(String));

        if (listings.length === 0) {
            const ownedOnly = !!(options.ownedOnly || options.userId);
            container.innerHTML = ownedOnly ? `
                <div class="empty-state marketplace-empty-state">
                    <i data-lucide="badge-plus"></i>
                    <h3>Henüz ilanınız yok</h3>
                    <p>İlk ilanınızı eklediğinizde burada görünecek ve AI karşılaştırma akışına dahil olacak.</p>
                    <a href="/ilan-ekle" class="btn btn-primary"><i data-lucide="plus"></i> İlan Ver</a>
                </div>
            ` : `
                <div class="empty-state marketplace-empty-state">
                    <i data-lucide="search"></i>
                    <h3>İlan bulunamadı</h3>
                    <p>Filtreleri genişletin veya karar asistanından gelen önerilere göre tekrar arayın.</p>
                    <a href="/karar-asistani" class="btn btn-outline"><i data-lucide="sparkles"></i> AI Asistanı Aç</a>
                </div>
            `;
        } else {
            container.innerHTML = listings.map(listing => {
                const listingId = this.escapeHtml(listing.id);
                const imageUrl = this.safeImageUrl(listing.images?.[0]);
                const externalUrl = this.safeExternalUrl(listing.external_url);
                const isFavorite = favoriteIds.includes(listing.id.toString());
                const isCompared = comparedSignatures.has(this.getListingComparisonSignature(listing));
                const aiScore = this.getListingQualityScore(listing);
                const categoryLabel = this.getCategoryLabel(listing.category || '');
                const locationLabel = this.getListingLocationLabel(listing);
                const actionLabel = this.getListingPrimaryActionLabel(listing.category || '');
                return `
                <div class="listing-card" data-listing-id="${listingId}">
                    <div class="listing-media">
                        <img src="${imageUrl}"
                             alt="${this.escapeHtml(listing.title)}"
                             class="listing-image"
                             onerror="this.src='/assets/images/placeholder.svg'">
                        <div class="listing-badges">
                            <span class="listing-ai-score"><i data-lucide="sparkles"></i> AI ${this.escapeHtml(aiScore)}/100</span>
                            <span>${this.escapeHtml(categoryLabel || 'İlan')}</span>
                        </div>
                    </div>
                    <div class="listing-content">
                        <h3 class="listing-title">${this.escapeHtml(listing.title)}</h3>
                        <p class="listing-price">${this.formatPrice(listing.price)} ₺</p>
                        <div class="listing-meta">
                            <span>${this.escapeHtml(locationLabel)}</span>
                            <span>${this.formatDate(listing.created_at)}</span>
                        </div>
                        ${this.getListingInsightsMarkup(listing, aiScore)}
                        <div class="listing-actions">
                            <button class="btn ${isFavorite ? 'btn-primary' : 'btn-outline'} favorite-btn" data-action="favorite">
                                <i data-lucide="heart"></i> ${isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                            </button>
                            <button class="btn btn-outline" data-action="detail" data-listing-id="${listingId}">
                                <i data-lucide="eye"></i> Detay
                            </button>
                            <button class="btn ${isCompared ? 'btn-primary' : 'btn-outline'}" data-action="compare" data-listing-id="${listingId}">
                                <i data-lucide="${isCompared ? 'check' : 'columns-3'}"></i> ${isCompared ? 'Karşılaştırmada' : 'Karşılaştır'}
                            </button>
                            <a href="${externalUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary external-btn"><i data-lucide="external-link"></i> ${this.escapeHtml(actionLabel)}</a>
                        </div>
                    </div>
                </div>
            `;
            }).join('');
        }

        this.loadIcons();
    }

    filterByCategory(categoryId) {
        state.setFilters({ category: categoryId });
        // Trigger listings reload with filter
        document.dispatchEvent(new CustomEvent('filterChanged', {
            detail: { category: categoryId }
        }));
    }

    showListingDetail(listingId) {
        // Navigate to listing detail page
        window.location.href = `/ilan/${listingId}`;
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
                            <span><i data-lucide="sparkles"></i> AI ${this.escapeHtml(aiScore)}/100</span>
                            <span><i data-lucide="map-pin"></i> ${this.escapeHtml(locationLabel)}</span>
                            <span><i data-lucide="clock-3"></i> ${this.formatDate(listing.created_at)}</span>
                        </div>
                    </div>
                    <p class="listing-price">${this.formatPrice(listing.price)} ₺</p>
                </div>
                <div class="listing-detail-body">
                    <div class="listing-detail-image">
                        <img src="${imageUrl}" alt="${this.escapeHtml(listing.title)}" onerror="this.src='/assets/images/placeholder.svg'">
                    </div>
                    <div class="listing-detail-info">
                        ${this.getListingInsightsMarkup(listing, aiScore)}
                        <p><strong>Açıklama:</strong></p>
                        <p>${this.escapeHtml(listing.description || 'Açıklama bulunamadı.')}</p>
                        <div class="listing-actions">
                            <button class="btn ${isFavorite ? 'btn-primary' : 'btn-outline'}" data-action="favorite" data-listing-id="${listingId}"><i data-lucide="heart"></i> ${isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}</button>
                            <button class="btn ${isCompared ? 'btn-primary' : 'btn-outline'}" data-action="compare" data-listing-id="${listingId}"><i data-lucide="${isCompared ? 'check' : 'columns-3'}"></i> ${isCompared ? 'Karşılaştırmada' : 'Karşılaştır'}</button>
                            <a href="/karar-asistani" class="btn btn-outline"><i data-lucide="sparkles"></i> Asistanda analiz et</a>
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
                '<div><span class="assistant-kicker">AI ilan yorumu</span><h3>' + this.escapeHtml(profile.riskLevel || 'Karar analizi') + '</h3><p>' + this.escapeHtml(profile.comment || '') + '</p></div>' +
                '<div class="listing-detail-score"><strong>' + this.escapeHtml(profile.score || '-') + '</strong><span>/100</span></div>' +
            '</div>' +
            '<div class="comparison-metrics listing-detail-metrics">' +
                '<div><span>Ana bedel</span><strong>' + this.formatPrice(profile.price || 0) + ' ₺</strong></div>' +
                '<div><span>Dönemsel maliyet</span><strong>' + this.formatPrice(profile.periodicCost || 0) + ' ₺</strong></div>' +
                '<div><span>Aylık ödeme</span><strong>' + this.formatPrice(profile.monthlyPayment || 0) + ' ₺</strong></div>' +
                '<div><span>Toplam geri ödeme</span><strong>' + this.formatPrice(profile.totalPayment || 0) + ' ₺</strong></div>' +
            '</div>' +
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



    renderComparison(items = []) {
        const container = document.getElementById('comparison-content');
        if (!container) return;

        if (!Array.isArray(items) || !items.length) {
            container.innerHTML =
                '<div class="empty-state">' +
                    '<i data-lucide="columns-3"></i>' +
                    '<h3>Karşılaştırma listesi boş</h3>' +
                    '<p>Karar sonucu veya ilan kartlarından seçenekleri karşılaştırmaya ekleyin.</p>' +
                '</div>';
            this.loadIcons();
            return;
        }

        const categoryName = items[0]?.categoryName || 'Karşılaştırma';
        const maxValues = {
            price: Math.max(...items.map((item) => Number(item.price || 0)), 1),
            periodicCost: Math.max(...items.map((item) => Number(item.periodicCost || 0)), 1),
            monthlyPayment: Math.max(...items.map((item) => Number(item.monthlyPayment || 0)), 1)
        };

        container.innerHTML =
            '<div class="comparison-toolbar">' +
                '<div>' +
                    '<span class="assistant-kicker">' + this.escapeHtml(categoryName) + '</span>' +
                    '<h3>' + this.escapeHtml(items.length) + ' seçenek yan yana</h3>' +
                    '<p>Fiyat, dönemsel maliyet, kredi yükü, risk ve karar detayları aynı tabloda okunur.</p>' +
                '</div>' +
                '<button type="button" class="btn btn-outline" data-comparison-clear><i data-lucide="trash-2"></i> Temizle</button>' +
            '</div>' +
            '<div class="comparison-grid">' + items.map((item) => this.getComparisonCardMarkup(item, maxValues)).join('') + '</div>' +
            this.getComparisonMatrixMarkup(items);

        this.loadIcons();
    }

    getComparisonCardMarkup(item, maxValues) {
        const tags = Array.isArray(item.tags) ? item.tags : [];
        return '<article class="comparison-card">' +
            '<div class="comparison-card-head">' +
                '<div>' +
                    '<span class="assistant-kicker">' + this.escapeHtml(item.sourceType || 'Seçenek') + '</span>' +
                    '<h4>' + this.escapeHtml(item.title || 'Karşılaştırma seçeneği') + '</h4>' +
                '</div>' +
                '<button type="button" class="icon-btn" title="Karşılaştırmadan çıkar" data-comparison-remove="' + this.escapeHtml(item.id) + '"><i data-lucide="x"></i></button>' +
            '</div>' +
            '<div class="comparison-score-row">' +
                '<strong>' + this.escapeHtml(item.score || '-') + '</strong>' +
                '<span>AI karar skoru</span>' +
                '<em>' + this.escapeHtml(item.riskLevel || 'Kontrol gerekli') + '</em>' +
            '</div>' +
            '<div class="comparison-metrics">' +
                '<div><span>Ana bedel</span><strong>' + this.formatPrice(item.price || 0) + ' ₺</strong></div>' +
                '<div><span>Dönemsel maliyet</span><strong>' + this.formatPrice(item.periodicCost || 0) + ' ₺</strong></div>' +
                '<div><span>Aylık ödeme</span><strong>' + this.formatPrice(item.monthlyPayment || 0) + ' ₺</strong></div>' +
            '</div>' +
            this.getComparisonGraphMarkup(item, maxValues) +
            (tags.length ? '<div class="comparison-tags">' + tags.map((tag) => '<span>' + this.escapeHtml(tag) + '</span>').join('') + '</div>' : '') +
            '<p class="comparison-comment">' + this.escapeHtml(item.comment || 'Bu seçenek fiyat, yan maliyet ve finansman etkisiyle değerlendirildi.') + '</p>' +
        '</article>';
    }

    getComparisonGraphMarkup(item, maxValues) {
        const metrics = [
            { label: 'Fiyat', value: Number(item.price || 0), max: maxValues.price },
            { label: 'Yan maliyet', value: Number(item.periodicCost || 0), max: maxValues.periodicCost },
            { label: 'Aylık kredi', value: Number(item.monthlyPayment || 0), max: maxValues.monthlyPayment }
        ];

        return '<div class="comparison-mini-graph">' + metrics.map((metric) => {
            const percent = Math.max(4, Math.min(100, Math.round((metric.value / Math.max(metric.max, 1)) * 100)));
            return '<div class="comparison-graph-row">' +
                '<span>' + this.escapeHtml(metric.label) + '</span>' +
                '<i><b style="width:' + this.escapeHtml(percent) + '%"></b></i>' +
                '<strong>' + this.formatPrice(metric.value) + ' ₺</strong>' +
            '</div>';
        }).join('') + '</div>';
    }

    getComparisonMatrixMarkup(items = []) {
        const rows = this.getComparisonMatrixRows(items);
        return '<section class="comparison-matrix">' +
            '<div class="comparison-matrix-head">' +
                '<div>' +
                    '<span class="assistant-kicker">Detay matrisi</span>' +
                    '<h3>Kategoriye özel karar tablosu</h3>' +
                '</div>' +
                '<p>Her sütun seçilen bir seçenek, her satır karar kalemidir.</p>' +
            '</div>' +
            '<div class="comparison-table-wrap">' +
                '<table class="comparison-table">' +
                    '<thead><tr><th>Kriter</th>' + items.map((item) => '<th>' + this.escapeHtml(item.title || 'Seçenek') + '</th>').join('') + '</tr></thead>' +
                    '<tbody>' + rows.map((row) => '<tr><td>' + this.escapeHtml(row.label) + '</td>' + items.map((item) => '<td>' + this.escapeHtml(row.get(item)) + '</td>').join('') + '</tr>').join('') + '</tbody>' +
                '</table>' +
            '</div>' +
        '</section>';
    }

    getComparisonMatrixRows(items = []) {
        const money = (value) => Number(value || 0) > 0 ? this.formatPrice(value) + ' ₺' : '-';
        const rows = [
            { label: 'Kaynak', get: (item) => item.sourceType || '-' },
            { label: 'AI skoru', get: (item) => item.score ? item.score + '/100' : '-' },
            { label: 'Risk', get: (item) => item.riskLevel || '-' },
            { label: 'Ana bedel', get: (item) => money(item.price) },
            { label: 'Dönemsel maliyet', get: (item) => money(item.periodicCost) },
            { label: 'Aylık ödeme', get: (item) => money(item.monthlyPayment) },
            { label: 'Toplam geri ödeme', get: (item) => money(item.totalPayment) }
        ];

        const detailLabels = [...new Set(items.flatMap((item) => (item.details || []).map((detail) => detail.label)))].slice(0, 6);
        detailLabels.forEach((label) => {
            rows.push({
                label,
                get: (item) => (item.details || []).find((detail) => detail.label === label)?.value || '-'
            });
        });

        const calculationLabels = [...new Set(items.flatMap((item) => (item.calculationRows || []).map((row) => row.label)))].slice(0, 10);
        calculationLabels.forEach((label) => {
            rows.push({
                label,
                get: (item) => {
                    const row = (item.calculationRows || []).find((entry) => entry.label === label);
                    return row ? money(row.value) : '-';
                }
            });
        });

        return rows;
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
