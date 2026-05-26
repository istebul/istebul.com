/**
 * OAuth return handler (Google via Supabase).
 * Requires createClient({ auth: { detectSessionInUrl: true } }).
 */
import { supabase } from '../core/supabase.js';

function hasOAuthCallbackParams() {
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  return (
    /access_token=|refresh_token=|type=recovery/.test(hash) ||
    /[?&]code=/.test(search)
  );
}

function cleanOAuthUrl() {
  const path = window.location.pathname || '/';
  window.history.replaceState({}, document.title, path);
}

/**
 * Parse OAuth redirect and establish session. Returns session or null.
 */
export async function completeOAuthIfPresent() {
  if (!hasOAuthCallbackParams()) {
    return null;
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[auth-oauth] getSession failed', error);
      cleanOAuthUrl();
      return null;
    }

    if (data?.session) {
      cleanOAuthUrl();
      document.dispatchEvent(
        new CustomEvent('userLoggedIn', { detail: data.session.user })
      );
      return data.session;
    }

    cleanOAuthUrl();
    return null;
  } catch (error) {
    console.error('[auth-oauth] callback error', error);
    cleanOAuthUrl();
    return null;
  }
}
