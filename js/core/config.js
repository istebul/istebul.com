// Configuration
const browserEnv = typeof window !== 'undefined' ? window.__env || window.env || {} : {};
const nodeEnv = typeof process !== 'undefined' && process.env ? process.env : {};

// Validate required environment variables
const getRequiredEnv = (key, isBrowser = false) => {
    const source = isBrowser ? browserEnv : nodeEnv;
    const value = source[key] || nodeEnv[key];
    if (!value && typeof window !== 'undefined') {
        console.warn(`⚠️ Missing environment variable: ${key}. App may not function properly.`);
    }
    return value || '';
};

export const config = {
    // Supabase - MUST be configured via environment variables
    supabase: {
        url: getRequiredEnv('SUPABASE_URL', typeof window !== 'undefined'),
        anonKey: getRequiredEnv('SUPABASE_ANON_KEY', typeof window !== 'undefined')
    },

    // App settings
    app: {
        name: 'isteBul v2',
        version: '2.0.0',
        description: 'Modern Turkish marketplace platform'
    },

    // API endpoints
    api: {
        baseUrl: '/.netlify/functions',
        endpoints: {
            aiProxy: '/ai-proxy'
        }
    },

    monitoring: {
        sentryDsn: browserEnv.SENTRY_DSN || nodeEnv.SENTRY_DSN || '',
        logRocketAppId: browserEnv.LOGROCKET_APP_ID || nodeEnv.LOGROCKET_APP_ID || ''
    },

    // UI settings
    ui: {
        itemsPerPage: 12,
        maxImageSize: 5 * 1024 * 1024, // 5MB
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
        categories: [
            { id: 'arac', name: 'Araç', icon: 'car' },
            { id: 'ev', name: 'Ev', icon: 'home' },
            { id: 'tatil', name: 'Tatil', icon: 'plane' }
        ]
    },

    // Validation rules
    validation: {
        password: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true
        },
        listing: {
            title: { minLength: 5, maxLength: 100 },
            description: { minLength: 20, maxLength: 2000 },
            price: { min: 0, max: 10000000 }
        }
    },

    // Messages
    messages: {
        success: {
            login: 'Başarıyla giriş yapıldı',
            register: 'Hesabınız oluşturuldu',
            listingCreated: 'İlanınız başarıyla yayınlandı',
            profileUpdated: 'Profil bilgileriniz güncellendi'
        },
        error: {
            login: 'Giriş yapılırken bir hata oluştu',
            register: 'Hesap oluşturulurken bir hata oluştu',
            network: 'Bağlantı hatası, lütfen tekrar deneyin',
            validation: 'Lütfen tüm alanları doğru şekilde doldurun'
        }
    }
};

export default config;
