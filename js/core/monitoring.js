// Monitoring & Error Tracking Module
import * as Sentry from '@sentry/browser';
import LogRocket from 'logrocket';
import config from './config.js';

export class MonitoringManager {
    constructor() {
        this.initialized = false;
        this.sentryDSN = config.monitoring?.sentryDsn;
        this.logRocketAppId = config.monitoring?.logRocketAppId;
        this.handlersAttached = false;
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
                this.initSentry();
            }

            if (this.logRocketAppId) {
                this.initLogRocket();
            }

            this.initialized = true;
        } catch (error) {
            console.error('✗ Failed to initialize monitoring:', error);
        }
    }

    initSentry() {
        if (typeof window !== 'undefined') {
            Sentry.init({
                dsn: this.sentryDSN,
                environment: this.getEnvironment(),
                release: config.app?.version || '2.0.0',
                tracesSampleRate: this.getEnvironment() === 'production' ? 0.1 : 1.0,
                attachStacktrace: true,
                beforeSend: (event) => {
                    // Filter out known safe errors
                    if (event.exception) {
                        const error = event.exception.values?.[0]?.value || '';
                        if (error.includes('ResizeObserver loop limit exceeded')) {
                            return null; // Don't send ResizeObserver errors
                        }
                    }
                    return event;
                }
            });
        }
    }

    initLogRocket() {
        if (typeof window !== 'undefined') {
            LogRocket.init(this.logRocketAppId, {
                console: { shouldAggregateConsoleErrors: true },
                network: { requestSanitizer: this.sanitizeRequest }
            });

            // Identify user if logged in
            const user = this.getCurrentUser();
            if (user) {
                LogRocket.identify(user.id, {
                    name: user.name,
                    email: user.email
                });
            }

        }
    }

    setupGlobalErrorHandlers() {
        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.captureException(event.reason);
        });

        // Catch uncaught errors
        window.addEventListener('error', (event) => {
            this.captureException(event.error);
        });
    }

    captureException(error, context = {}) {
        if (!this.initialized) return;

        try {
            if (typeof window !== 'undefined' && window.Sentry) {
                Sentry.captureException(error, { extra: context });
            }
            if (typeof window !== 'undefined' && window.LogRocket) {
                window.LogRocket.captureException(error, { extra: context });
            }
        } catch (err) {
            console.error('Failed to capture exception:', err);
        }
    }

    captureMessage(message, level = 'info', context = {}) {
        if (!this.initialized) return;

        try {
            if (typeof window !== 'undefined' && window.Sentry) {
                window.Sentry.captureMessage(message, { level, extra: context });
            }
            if (typeof window !== 'undefined' && window.LogRocket) {
                window.LogRocket.captureMessage(message, { level, extra: context });
            }
        } catch (err) {
            console.error('Failed to capture message:', err);
        }
    }

    setUser(user) {
        if (!this.initialized) return;

        try {
            if (typeof window !== 'undefined' && window.Sentry && user) {
                window.Sentry.setUser({
                    id: user.id,
                    email: user.email,
                    username: user.full_name
                });
            }
            if (typeof window !== 'undefined' && window.LogRocket && user) {
                LogRocket.identify(user.id, {
                    name: user.full_name,
                    email: user.email
                });
            }
        } catch (err) {
            console.error('Failed to set user:', err);
        }
    }

    clearUser() {
        if (!this.initialized) return;

        try {
            if (typeof window !== 'undefined' && window.Sentry) {
                window.Sentry.setUser(null);
            }
            if (typeof window !== 'undefined' && window.LogRocket) {
                LogRocket.identify(null);
            }
        } catch (err) {
            console.error('Failed to clear user:', err);
        }
    }

    getEnvironment() {
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return 'development';
            }
            if (hostname.includes('staging') || hostname.includes('test')) {
                return 'staging';
            }
            return 'production';
        }
        return 'unknown';
    }

    getCurrentUser() {
        // This will be set by App after auth check
        if (typeof window !== 'undefined') {
            return window.__appUser || null;
        }
        return null;
    }

    sanitizeRequest(request) {
        // Remove sensitive data from request logging
        if (request.body && typeof request.body === 'string') {
            try {
                const body = JSON.parse(request.body);
                if (body.password) delete body.password;
                if (body.token) delete body.token;
                request.body = JSON.stringify(body);
            } catch (e) {
                // Ignore parse errors
            }
        }
        return request;
    }
}

export const monitoring = new MonitoringManager();
export default monitoring;
