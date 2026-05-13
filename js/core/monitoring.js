import config from './config.js';

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

    async initSentry() {
        const Sentry = await import('@sentry/browser');
        this.sentry = Sentry;

        Sentry.init({
            dsn: this.sentryDSN,
            environment: this.getEnvironment(),
            release: config.app?.version || '2.0.0',
            tracesSampleRate: this.getEnvironment() === 'production' ? 0.1 : 1.0,
            attachStacktrace: true,
            integrations: []
        });
    }

    setupGlobalErrorHandlers() {
        window.addEventListener('unhandledrejection', (event) => {
            this.captureException(event.reason);
        });

        window.addEventListener('error', (event) => {
            this.captureException(event.error);
        });
    }

    captureException(error, context = {}) {
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
