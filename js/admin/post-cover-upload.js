/**
 * Admin kapak görseli yükleme — Supabase Storage `content-covers` bucket.
 */

const COVER_BUCKET = 'content-covers';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml'
]);

function safeExt(file) {
  const fromName = String(file?.name || '')
    .split('.')
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (fromName && fromName.length <= 5) return fromName;
  const mime = String(file?.type || '');
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/svg+xml') return 'svg';
  return 'jpg';
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @param {File} file
 * @param {{ folder?: string }} [opts]
 * @returns {Promise<string>} public URL
 */
export async function uploadPostCoverImage(supabaseClient, file, opts = {}) {
  if (!file || !(file instanceof File)) {
    throw new Error('Geçerli bir görsel dosyası seçin.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Kapak görseli en fazla 5 MB olabilir.');
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    throw new Error('Desteklenen formatlar: JPEG, PNG, WebP, GIF, SVG.');
  }

  const folder = String(opts.folder || 'news').replace(/[^a-z0-9_-]/gi, '') || 'news';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt(file)}`;

  const { error } = await supabaseClient.storage.from(COVER_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg'
  });

  if (error) {
    throw new Error(error.message || 'Görsel yüklenemedi.');
  }

  const { data } = supabaseClient.storage.from(COVER_BUCKET).getPublicUrl(path);
  const url = data?.publicUrl?.trim();
  if (!url) throw new Error('Yüklenen görsel URL alınamadı.');
  return url;
}
