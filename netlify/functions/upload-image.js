const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { checkRateLimit, withRateLimitHeaders } = require('./_rate-limit');

const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://istebul-com.pages.dev';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Vary': 'Origin',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const allowedTypes = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

const maxSize = 5 * 1024 * 1024;

const json = (statusCode, body) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body)
});

const getSupabaseAdmin = () => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service is not configured');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
};

const getBearerToken = (headers = {}) => {
  const authHeader = headers.authorization || headers.Authorization || '';
  return authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;
};

const safeBaseName = (fileName = 'image') =>
  fileName
    .toString()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50) || 'image';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const limit = checkRateLimit(event, {
    scope: 'upload-image',
    windowMs: 60 * 1000,
    max: Number(process.env.UPLOAD_RATE_LIMIT_PER_MINUTE || 20)
  });

  if (limit.limited) {
    return withRateLimitHeaders(
      json(429, { error: 'Too many requests' }),
      limit
    );
  }

  try {
    const token = getBearerToken(event.headers);

    if (!token) {
      return json(401, { error: 'Authorization required' });
    }

    let payload = {};

    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return withRateLimitHeaders(
        json(400, { error: 'Invalid JSON body' }),
        limit
      );
    }

    const { fileName, contentType, base64 } = payload;

    if (!allowedTypes[contentType]) {
      return json(400, { error: 'Invalid image type' });
    }

    if (!base64 || typeof base64 !== 'string') {
      return json(400, { error: 'Image payload is required' });
    }

    const fileBuffer = Buffer.from(base64, 'base64');

    if (!fileBuffer.length || fileBuffer.length > maxSize) {
      return json(400, { error: 'Image must be smaller than 5MB' });
    }

    const supabase = getSupabaseAdmin();

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return json(401, { error: 'Invalid token' });
    }

    const ext = allowedTypes[contentType];
    const uniqueId = crypto.randomBytes(8).toString('hex');

    const storagePath =
      `${user.id}/${Date.now()}-${safeBaseName(fileName)}-${uniqueId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return json(500, { error: 'Upload failed' });
    }

    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(storagePath);

    return withRateLimitHeaders(
      json(200, {
        success: true,
        file: {
          url: urlData.publicUrl,
          path: storagePath,
          name: fileName,
          size: fileBuffer.length
        }
      }),
      limit
    );
  } catch (error) {
    console.error('Function error:', error);
    return json(500, { error: 'Internal server error' });
  }
};