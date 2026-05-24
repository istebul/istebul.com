import config from './config.js';
import { trackOpsEvent, flushOpsEvents, initPerformanceObservability } from './operational-telemetry.js';

export class MonitoringManager {
    constructor() {
        this.initialized = false;
        this.sentryDSN = config.monitoring?.sentryDsn;
        this.handlersAttached = false;
        this.sentry = null;
    }

    async init(consentGranted = false) {
        if (typeof window === 'undefined') return;

        try {
            if (!this.handlersAttached) {
                this.setupGlobalErrorHandlers();
                this.handlersAttached = true;
            }

            initPerformanceObservability();

            if (!consentGranted || this.initialized) {
                return;
            }

            if (this.sentryDSN) {
                await this.initSentry();
            }

            this.initialized = true;
        } catch (error) {
            console.error('Monitoring init failed:', error);
        }
    }

    async loadSentryScript() {
        if (window.Sentry) {
            return window.Sentry;
        }

        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://browser.sentry-cdn.com/8.55.0/bundle.min.js';
            script.crossOrigin = 'anonymous';
            script.defer = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });

        return window.Sentry;
    }

    async initSentry() {
        const Sentry = await this.loadSentryScript();
        this.sentry = Sentry;

        Sentry.init({
            dsn: this.sentryDSN,
            environment: this.getEnvironment(),
            release: config.app?.version || '2.0.0',
            tracesSampleRate: this.getEnvironment() === 'production' ? 0.05 : 0.2,
            attachStacktrace: true
        });
    }

    setupGlobalErrorHandlers() {
        window.addEventListener('unhandledrejection', (event) => {
            trackOpsEvent('client_unhandled_rejection', {
                message: String(event.reason?.message || event.reason || '').slice(0, 200),
                path: window.location.pathname
            }, { category: 'error', severity: 'error' });
            this.captureException(event.reason);
        });

        window.addEventListener('error', (event) => {
            trackOpsEvent('client_unhandled_error', {
                message: String(event.message || '').slice(0, 200),
                path: window.location.pathname
            }, { category: 'error', severity: 'error' });
            this.captureException(event.error);
        });

        window.addEventListener('pagehide', () => {
            flushOpsEvents({ beacon: true });
        });
    }

    captureException(error, context = {}) {
        const message = error instanceof Error ? error.message : String(error || 'unknown');
        trackOpsEvent('client_unhandled_error', {
            message: message.slice(0, 200),
            context: context.context || 'app',
            path: typeof window !== 'undefined' ? window.location.pathname : ''
        }, { category: 'error', severity: 'error' });

        if (!this.initialized) return;

        try {
            this.sentry?.captureException(error, { extra: context });
        } catch {}
    }

    captureMessage(message, level = 'info', context = {}) {
        if (!this.initialized) return;

        try {
            this.sentry?.captureMessage(message, { level, extra: context });
        } catch {}
    }

    setUser(user) {
        if (!this.initialized || !user) return;

        try {
            this.sentry?.setUser({
                id: user.id,
                email: user.email,
                username: user.full_name
            });
        } catch {}
    }

    clearUser() {
        if (!this.initialized) return;

        try {
            this.sentry?.setUser(null);
        } catch {}
    }

    getEnvironment() {
        const hostname = window.location.hostname;

        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'development';
        }

        if (hostname.includes('staging') || hostname.includes('test')) {
            return 'staging';
        }

        return 'production';
    }
}

export const monitoring = new MonitoringManager();
export default monitoring;
