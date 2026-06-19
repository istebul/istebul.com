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

function resolveErrorMessage(data = {}) {
  if (data.message && typeof data.message === 'string') return data.message;
  const code = String(data.error || '').trim();
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  return 'Hesap silme işlemi tamamlanamadı.';
}

async function readInvokeError(error) {
  if (!error) return 'Hesap silme işlemi tamamlanamadı.';

  let detail = error.message || 'Hesap silme işlemi tamamlanamadı.';
  try {
    const body = await error.context?.clone?.().json?.();
    if (body && typeof body === 'object') {
      return resolveErrorMessage(body);
    }
  } catch {
    try {
      const text = await error.context?.clone?.().text?.();
      if (text) detail = text;
    } catch {
      /* ignore */
    }
  }
  return detail;
}

/**
 * @param {{ confirm?: boolean }} [options]
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function requestAccountDeletion(options = {}) {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: 'Bağlantı yapılandırması eksik.' };

  if (!sb.functions?.invoke) {
    return { ok: false, error: 'Silme servisi yapılandırılmamış.' };
  }

  const { data: refreshData, error: refreshError } = await sb.auth.refreshSession();
  const session = refreshData?.session ?? (await sb.auth.getSession()).data?.session;

  if (refreshError && !session?.access_token) {
    return { ok: false, error: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.' };
  }

  if (!session?.access_token) {
    return { ok: false, error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' };
  }

  try {
    const { data, error } = await sb.functions.invoke('user-account', {
      body: {
        action: 'delete_account',
        confirm: options.confirm !== false
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      return { ok: false, error: await readInvokeError(error) };
    }

    const body = data && typeof data === 'object' ? data : {};
    if (body.ok === false || body.error) {
      return { ok: false, error: resolveErrorMessage(body) };
    }

    await sb.auth.signOut();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message && !/^failed to fetch$/i.test(message)) {
      return { ok: false, error: message };
    }
    return { ok: false, error: 'Ağ hatası. Lütfen daha sonra tekrar deneyin.' };
  }
}
