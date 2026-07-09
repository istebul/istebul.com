import config from './config.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.4';

const supabaseUrl = config.supabase.url;
const supabaseKey = config.supabase.anonKey;

export function isSupabaseConfigured() {
    return Boolean(supabaseUrl && supabaseKey);
}

export const SUPABASE_CONFIG_ERROR =
    'Kimlik doğrulama yapılandırması eksik. SUPABASE_URL ve SUPABASE_ANON_KEY değerleri /env.js içinde tanımlı olmalıdır. Deploy ortamında bu değişkenleri ayarlayıp siteyi yeniden yayınlayın.';

const createEmptyQuery = () => {
    const query = {
        select: () => query,
        eq: () => query,
        or: () => query,
        order: () => query,
        range: () => query,
        insert: () => query,
        update: () => query,
        delete: () => query,
        single: () => Promise.resolve({ data: null, error: null }),
        then: (resolve) => Promise.resolve({ data: [], error: null }).then(resolve),
        catch: () => query
    };

    return query;
};

const createFallbackSupabaseClient = () => {
    console.warn('Supabase client library is not loaded. Running with local fallback data.');

    return {
        auth: {
            getUser: async () => ({ data: { user: null }, error: null }),
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            signUp: async () => ({ data: null, error: new Error('Kimlik doğrulama servisi şu anda kullanılamıyor.') }),
            signInWithPassword: async () => ({ data: null, error: new Error('Kimlik doğrulama servisi şu anda kullanılamıyor.') }),
            signOut: async () => ({ error: null }),
            resetPasswordForEmail: async () => ({ error: new Error('Kimlik doğrulama servisi şu anda kullanılamıyor.') })
        },
        from: () => createEmptyQuery(),
        storage: {
            from: () => ({
                getPublicUrl: (path) => ({ data: { publicUrl: path || '/assets/images/placeholder.svg' } })
            })
        }
    };
};

const PUBLIC_AUTH_STORAGE_KEY = 'istebul-auth-public-v1';
const ADMIN_AUTH_STORAGE_KEY = 'istebul-auth-admin-v1';

/** @type {ReturnType<typeof createClient> | ReturnType<typeof createFallbackSupabaseClient> | null} */
let supabaseSingleton = null;
/** @type {ReturnType<typeof createClient> | ReturnType<typeof createFallbackSupabaseClient> | null} */
let adminSupabaseSingleton = null;

function buildSupabaseClient(storageKey) {
    return createClient(supabaseUrl, supabaseKey, {
        auth: {
            storageKey,
            detectSessionInUrl: true,
            persistSession: true,
            autoRefreshToken: true
        }
    });
}

export const getSupabaseClient = () => {
    if (supabaseSingleton) {
        return supabaseSingleton;
    }

    if (!isSupabaseConfigured()) {
        supabaseSingleton = createFallbackSupabaseClient();
        return supabaseSingleton;
    }

    supabaseSingleton = buildSupabaseClient(PUBLIC_AUTH_STORAGE_KEY);

    return supabaseSingleton;
};

export const getAdminSupabaseClient = () => {
    if (adminSupabaseSingleton) {
        return adminSupabaseSingleton;
    }

    if (!isSupabaseConfigured()) {
        adminSupabaseSingleton = createFallbackSupabaseClient();
        return adminSupabaseSingleton;
    }

    adminSupabaseSingleton = buildSupabaseClient(ADMIN_AUTH_STORAGE_KEY);
    return adminSupabaseSingleton;
};

export const supabase = getSupabaseClient();
