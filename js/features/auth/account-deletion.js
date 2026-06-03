/**
 * KVKK self-serve account deletion via user-account edge function.
 */
import { getSupabaseClient } from '../../core/supabase.js';

function getFunctionUrl() {
  const base = (window.__env?.SUPABASE_URL || '').replace(/\/$/, '');
  return base ? `${base}/functions/v1/user-account` : '';
}

/**
 * @param {{ confirm?: boolean }} [options]
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function requestAccountDeletion(options = {}) {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: 'Bağlantı yapılandırması eksik.' };

  const {
    data: { session },
    error: sessionError
  } = await sb.auth.getSession();

  if (sessionError || !session?.access_token) {
    return { ok: false, error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' };
  }

  const url = getFunctionUrl();
  if (!url) return { ok: false, error: 'Silme servisi yapılandırılmamış.' };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: window.__env?.SUPABASE_ANON_KEY || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'delete_account',
        confirm: options.confirm !== false
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: data.message || data.error || 'Hesap silme işlemi tamamlanamadı.'
      };
    }

    await sb.auth.signOut();
    return { ok: true };
  } catch {
    return { ok: false, error: 'Ağ hatası. Lütfen daha sonra tekrar deneyin.' };
  }
}
