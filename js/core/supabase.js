import config from './config.js';
import { createClient } from '@supabase/supabase-js';

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

/** @type {ReturnType<typeof createClient> | ReturnType<typeof createFallbackSupabaseClient> | null} */
let supabaseSingleton = null;

export const getSupabaseClient = () => {
    if (supabaseSingleton) {
        return supabaseSingleton;
    }

    if (!isSupabaseConfigured()) {
        supabaseSingleton = createFallbackSupabaseClient();
        return supabaseSingleton;
    }

    supabaseSingleton = createClient(supabaseUrl, supabaseKey, {
        auth: {
            detectSessionInUrl: true,
            persistSession: true,
            autoRefreshToken: true
        }
    });

    return supabaseSingleton;
};

export const supabase = getSupabaseClient();
