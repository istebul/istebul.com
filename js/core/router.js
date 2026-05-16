// Router - Simple client-side routing
export class Router {
    constructor() {
        this.routes = [
            { path: '/', component: 'home' },
            { path: '/ilanlar', component: 'ilanlar' },
            { path: '/karsilastir', component: 'compare' },
            { path: '/karar-asistani', component: 'decision-assistant' },
            { path: '/favoriler', component: 'favoriler' },
            { path: '/gecmis', component: 'history' },
            { path: '/quiz', component: 'quiz' },
            { path: '/profil', component: 'profil' },
            { path: '/admin', component: 'admin' },
            { path: '/messages', component: 'messages' },
            { path: '/ilan-ekle', component: 'add-listing' },
            { path: '/ilan/:id', component: 'listing-detail' }
        ];
        this.currentRoute = '/';
    }

    init() {
        // Handle initial load
        this.handleRoute();

        // Handle browser back/forward
        window.addEventListener('popstate', () => this.handleRoute());

        // Handle link clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="/"]');
            if (link) {
                if (link.hasAttribute('data-native-route')) return;
                e.preventDefault();
                const path = link.getAttribute('href');
                this.navigate(path);
            }
        });
    }

    navigate(path) {
        if (path !== this.currentRoute) {
            window.history.pushState(null, null, path);
            this.currentRoute = path;
            this.handleRoute();
        }
    }

    handleRoute() {
        const rawPath = window.location.pathname;
        const path = rawPath === '/index.html' ? '/' : rawPath.replace(/\/$/, '') || '/';
        this.currentRoute = path;
        const match = this.matchRoute(path);
        const route = match ? match.component : 'home';

        // Update active nav link
        this.updateNavLinks(path);

        // Show/hide sections
        this.showSection(route);

        // Update page title
        this.updateTitle(route, match?.params);

        document.dispatchEvent(new CustomEvent('routeChanged', {
            detail: {
                route,
                params: match?.params || {},
                path
            }
        }));
    }

    matchRoute(path) {
        const exact = this.routes.find(route => route.path === path);
        if (exact) {
            return { component: exact.component, params: {} };
        }

        for (const route of this.routes) {
            if (!route.path.includes(':')) continue;
            const routeParts = route.path.split('/').filter(Boolean);
            const pathParts = path.split('/').filter(Boolean);
            if (routeParts.length !== pathParts.length) continue;

            const params = {};
            let matches = true;

            routeParts.forEach((part, index) => {
                if (part.startsWith(':')) {
                    params[part.slice(1)] = decodeURIComponent(pathParts[index] || '');
                } else if (part !== pathParts[index]) {
                    matches = false;
                }
            });

            if (matches) {
                return { component: route.component, params };
            }
        }

        return null;
    }

    updateNavLinks(activePath) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`a[href="${activePath}"]`) ||
            (activePath.startsWith('/ilan/') ? document.querySelector('a[href="/ilanlar"]') : null);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    showSection(routeId) {
        document.body.classList.toggle('app-route-active', routeId !== 'home');

        document.querySelectorAll('[data-private-section]').forEach(section => {
            section.classList.remove('route-visible');
        });

        // Hide all sections
        document.querySelectorAll('main > section').forEach(section => {
            section.style.display = 'none';
        });

        if (routeId === 'home') {
            ['home', 'trust', 'how-it-works', 'decision-sample', 'categories'].forEach((sectionId) => {
                const section = document.getElementById(sectionId);
                if (section) section.style.display = 'block';
            });
            return;
        }

        // Show target section
        const targetSection = document.getElementById(routeId);
        if (targetSection) {
            targetSection.classList.remove('hidden');

            if (targetSection.hasAttribute('data-private-section')) {
                targetSection.classList.add('route-visible');
            }

            targetSection.style.display = 'block';
        } else {
            // Show home if section not found
            document.getElementById('home').style.display = 'block';
        }
    }

    updateTitle(route) {
        const titles = {
            'home': 'isteBul - Yapay Zeka Destekli Karar Platformu',
            'ilanlar': 'Seçenekler - isteBul',
            'compare': 'Karşılaştırma Merkezi - isteBul',
            'decision-assistant': 'Karar Asistanı - isteBul',
            'favoriler': 'Favoriler - isteBul',
            'history': 'Karar Geçmişi - isteBul',
            'quiz': 'Quiz - isteBul',
            'profil': 'Profilim - isteBul',
            'admin': 'Admin Panel - isteBul',
            'messages': 'Mesajlar - isteBul',
            'add-listing': 'İlan Ekle - isteBul',
            'listing-detail': 'İlan Detayı - isteBul'
        };

        document.title = titles[route] || 'isteBul - Yapay Zeka Destekli Karar Platformu';
    }
}