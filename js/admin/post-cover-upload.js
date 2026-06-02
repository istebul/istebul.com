/**
 * Admin kapak görseli — önce doğrudan Supabase Storage, gerekirse admin-action fallback.
 */

import { invokeAdminFunction } from '../core/admin-client.js';

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

function isBucketMissing(message) {
  return /bucket not found/i.test(String(message || ''));
}

function isStoragePermissionError(message) {
  return /row-level security|policy|permission|not allowed/i.test(String(message || ''));
}

function mapStorageError(message) {
  const msg = String(message || '');
  if (isBucketMissing(msg)) {
    return 'Kapak deposu (content-covers) bulunamadı.';
  }
  if (isStoragePermissionError(msg)) {
    return 'Kapak yükleme yetkisi yok. Admin hesabıyla giriş yaptığınızdan emin olun.';
  }
  if (/payload too large|exceeded.*size/i.test(msg)) {
    return 'Kapak görseli en fazla 5 MB olabilir.';
  }
  return msg || 'Kapak yüklenemedi';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    reader.readAsDataURL(file);
  });
}

async function uploadViaAdminAction(supabaseClient, file, folder) {
  const base64 = await fileToBase64(file);
  const result = await invokeAdminFunction(supabaseClient, {
    action: 'upload_post_cover',
    values: {
      folder,
      fileName: file.name,
      contentType: file.type || 'image/jpeg',
      base64
    }
  });
  const url = String(result?.publicUrl || '').trim();
  if (!url) throw new Error('Yüklenen görsel URL alınamadı.');
  return url;
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
    if (isBucketMissing(uploadError.message) || isStoragePermissionError(uploadError.message)) {
      try {
        return await uploadViaAdminAction(supabaseClient, file, folder);
      } catch (fallbackError) {
        throw new Error(fallbackError?.message || 'Kapak yüklenemedi');
      }
    }
    throw new Error(mapStorageError(uploadError.message));
  }

  const { data: urlData } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);
  const url = String(urlData?.publicUrl || '').trim();
  if (!url) {
    throw new Error('Yüklenen görsel URL alınamadı.');
  }
  return url;
}
