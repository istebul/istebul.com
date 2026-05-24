/**
 * Admin panel Supabase edge-function client (mutations + privileged reads).
 */

export async function invokeAdminFunction(supabaseClient, payload) {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    throw new Error('No session token');
  }

  const { data, error } = await supabaseClient.functions.invoke('admin-action', {
    body: payload,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (error) {
    let detail = error.message;
    try {
      const body = await error.context?.clone?.().json?.();
      detail = body?.error || body?.message || detail;
    } catch {
      try {
        const text = await error.context?.clone?.().text?.();
        if (text) detail = text;
      } catch {
        /* ignore */
      }
    }
    throw new Error(detail);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @param {{ table: string, select?: string, order?: { column: string, ascending?: boolean }, limit?: number }} query
 */
export async function adminList(supabaseClient, query) {
  const result = await invokeAdminFunction(supabaseClient, {
    action: 'list',
    ...query
  });
  return result?.data ?? [];
}
