/**
 * KVKK self-serve account deletion via user-account edge function.
 */
import { getSupabaseClient } from '../../core/supabase.js';

const ERROR_MESSAGES = {
  unauthorized: 'Oturum doğrulanamadı. Çıkış yapıp tekrar giriş yapın.',
  confirmation_required: 'Silme onayı gerekli.',
  delete_failed: 'Hesap silinemedi. Lütfen destek ile iletişime geçin.',
  unsupported_action: 'Geçersiz işlem.',
  invalid_json: 'İstek işlenemedi.',
  method_not_allowed: 'Geçersiz istek.'
};

function getFunctionUrl() {
  const base = (window.__env?.SUPABASE_URL || '').replace(/\/$/, '');
  return base ? `${base}/functions/v1/user-account` : '';
}

function resolveErrorMessage(data = {}) {
  if (data.message && typeof data.message === 'string') return data.message;
  const code = String(data.error || '').trim();
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  return 'Hesap silme işlemi tamamlanamadı.';
}

/**
 * @param {{ confirm?: boolean }} [options]
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function requestAccountDeletion(options = {}) {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: 'Bağlantı yapılandırması eksik.' };

  const { data: refreshData, error: refreshError } = await sb.auth.refreshSession();
  const session = refreshData?.session ?? (await sb.auth.getSession()).data?.session;

  if (refreshError && !session?.access_token) {
    return { ok: false, error: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.' };
  }

  if (!session?.access_token) {
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
      return { ok: false, error: resolveErrorMessage(data) };
    }

    await sb.auth.signOut();
    return { ok: true };
  } catch {
    return { ok: false, error: 'Ağ hatası. Lütfen daha sonra tekrar deneyin.' };
  }
}
