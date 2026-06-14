// Configuration
const browserEnv = typeof window !== 'undefined' ? window.__env || window.env || {} : {};
const nodeEnv = typeof process !== 'undefined' && process.env ? process.env : {};

const ENV_ALIASES = {
    SUPABASE_URL: ['SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'],
    SUPABASE_ANON_KEY: [
        'SUPABASE_ANON_KEY',
        'VITE_SUPABASE_ANON_KEY',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]
};

const getRequiredEnv = (key, isBrowser = false) => {
    const aliases = ENV_ALIASES[key] || [key];
    if (isBrowser) {
        for (const alias of aliases) {
            const value = browserEnv[alias];
            if (value) return String(value);
        }
        return '';
    }
    for (const alias of aliases) {
        const value = nodeEnv[alias];
        if (value) return String(value);
    }
    return '';
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
        baseUrl: '/api',
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
