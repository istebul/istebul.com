import config from './config.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = config.supabase.url;
const supabaseKey = config.supabase.anonKey;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase config missing. Check SUPABASE_URL and SUPABASE_ANON_KEY.');
}

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

    if (!supabaseUrl || !supabaseKey) {
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
