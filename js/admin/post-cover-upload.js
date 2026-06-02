/**
 * Admin kapak görseli — admin-action edge function (service role, bucket otomatik).
 */

import { invokeAdminFunction } from '../core/admin-client.js';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml'
]);

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
  if (!url) {
    throw new Error('Yüklenen görsel URL alınamadı.');
  }
  return url;
}
