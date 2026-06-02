/**
 * Admin kapak görseli — doğrudan Supabase Storage (content-covers, admin RLS).
 */

const BUCKET = 'content-covers';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml'
]);

function safeExt(fileName) {
  const raw = String(fileName || '').split('.').pop() || 'jpg';
  const ext = raw.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 8);
  return ext || 'jpg';
}

function mapStorageError(message) {
  const msg = String(message || '');
  if (/bucket not found/i.test(msg)) {
    return 'Kapak deposu (content-covers) bulunamadı. Supabase’de: supabase db push';
  }
  if (/row-level security|policy|permission|not allowed/i.test(msg)) {
    return 'Kapak yükleme yetkisi yok. Admin hesabıyla giriş yaptığınızdan emin olun.';
  }
  if (/payload too large|exceeded.*size/i.test(msg)) {
    return 'Kapak görseli en fazla 5 MB olabilir.';
  }
  return msg || 'Kapak yüklenemedi';
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @param {File} file
 * @param {{ folder?: string }} [opts]
 * @returns {Promise<string>} public URL
 */
export async function uploadPostCoverImage(supabaseClient, file, opts = {}) {
  if (!supabaseClient) {
    throw new Error('Oturum hazır değil — sayfayı yenileyin.');
  }
  if (!file || !(file instanceof File)) {
    throw new Error('Geçerli bir görsel dosyası seçin.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Kapak görseli en fazla 5 MB olabilir.');
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    throw new Error('Desteklenen formatlar: JPEG, PNG, WebP, GIF, SVG.');
  }

  const folderRaw = String(opts.folder || 'news').trim().toLowerCase();
  const folder = /^[a-z0-9_-]{1,32}$/.test(folderRaw) ? folderRaw : 'news';
  const ext = safeExt(file.name);
  const path = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const { error: uploadError } = await supabaseClient.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'image/jpeg',
    cacheControl: '3600',
    upsert: false
  });

  if (uploadError) {
    throw new Error(mapStorageError(uploadError.message));
  }

  const { data: urlData } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);
  const url = String(urlData?.publicUrl || '').trim();
  if (!url) {
    throw new Error('Yüklenen görsel URL alınamadı.');
  }
  return url;
}
